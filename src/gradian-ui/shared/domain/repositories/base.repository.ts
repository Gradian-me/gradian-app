// Base Repository
// Generic repository implementation for JSON file storage

import { ulid } from 'ulid';
import { IRepository } from '../interfaces/repository.interface';
import { BaseEntity, FilterParams } from '../types/base.types';
import { readSchemaData, writeSchemaData, ensureSchemaCollection } from '../utils/data-storage.util';
import { EntityNotFoundError } from '../errors/domain.errors';
import { processPasswordFields } from '../utils/password-processor.util';
import { applySchemaDefaults } from '../utils/default-processor.util';

export class BaseRepository<T extends BaseEntity> implements IRepository<T> {
  constructor(protected schemaId: string) {
    ensureSchemaCollection(schemaId);
  }

  /**
   * Apply filters to entities
   */
  protected applyFilters(entities: T[], filters?: FilterParams): T[] {
    if (!filters) return entities;

    let filtered = [...entities];

    // Include IDs filter - only show items with these IDs
    if (filters.includeIds) {
      const includeIds = Array.isArray(filters.includeIds) 
        ? filters.includeIds 
        : typeof filters.includeIds === 'string' 
          ? filters.includeIds.split(',').map(id => id.trim())
          : [];
      filtered = filtered.filter((entity: any) => includeIds.includes(entity.id));
    }

    // Exclude IDs filter - exclude items with these IDs
    if (filters.excludeIds) {
      const excludeIds = Array.isArray(filters.excludeIds)
        ? filters.excludeIds
        : typeof filters.excludeIds === 'string'
          ? filters.excludeIds.split(',').map(id => id.trim())
          : [];
      filtered = filtered.filter((entity: any) => !excludeIds.includes(entity.id));
    }

    // Search filter (searches across common text fields)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((entity: any) => {
        const searchableFields = [
          'name', 'title', 'email', 'phone', 'description',
          'productName', 'requestId', 'batchNumber', 'productSku',
          'companyName', 'tenderTitle', 'projectName', 'serverName'
        ];
        return searchableFields.some(field => {
          const value = entity[field];
          if (value && typeof value === 'string') {
            return value.toLowerCase().includes(searchLower);
          }
          return false;
        });
      });
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter((entity: any) => 
        entity.status?.toLowerCase() === filters.status?.toLowerCase()
      );
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter((entity: any) => {
        if (Array.isArray(entity.categories)) {
          return entity.categories.includes(filters.category);
        }
        return entity.category === filters.category;
      });
    }

    // Handle companyIds filter - filter by multiple company IDs
    if (filters.companyIds) {
      const companyIds = Array.isArray(filters.companyIds)
        ? filters.companyIds
        : typeof filters.companyIds === 'string'
          ? filters.companyIds.split(',').map(id => id.trim())
          : [];
      if (companyIds.length > 0) {
        // Normalize companyIds: trim and filter empty strings
        const normalizedCompanyIds = companyIds.map(id => String(id).trim()).filter(id => id.length > 0);
        if (normalizedCompanyIds.length > 0) {
          filtered = filtered.filter((entity: any) => {
            const entityCompanyId = entity.companyId ? String(entity.companyId).trim() : null;
            return entityCompanyId && normalizedCompanyIds.includes(entityCompanyId);
          });
        }
      }
    } else if (filters.companyId) {
      // Backward compatibility: Handle single companyId (convert to array filter)
      const companyId = String(filters.companyId);
      filtered = filtered.filter((entity: any) => {
        const entityCompanyId = entity.companyId ? String(entity.companyId) : null;
        return entityCompanyId === companyId;
      });
    }

    // Apply any other custom filters (excluding companyId/companyIds which we've already handled)
    Object.keys(filters).forEach(key => {
      if (!['search', 'status', 'category', 'page', 'limit', 'sortBy', 'sortOrder', 'includeIds', 'excludeIds', 'companyId', 'companyIds'].includes(key)) {
        filtered = filtered.filter((entity: any) => entity[key] === filters[key]);
      }
    });

    return filtered;
  }

  async findAll(filters?: FilterParams): Promise<T[]> {
    const entities = readSchemaData<T>(this.schemaId);
    return this.applyFilters(entities, filters);
  }

  async findById(id: string): Promise<T | null> {
    const entities = readSchemaData<T>(this.schemaId);
    return entities.find(entity => entity.id === id) || null;
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const entities = readSchemaData<T>(this.schemaId);
    
    // Apply schema defaults first (e.g., language, timezone)
    let processedData = await applySchemaDefaults(
      this.schemaId,
      data as Record<string, any>
    );
    
    // Then process password fields if this is the users schema
    processedData = await processPasswordFields(
      this.schemaId,
      processedData
    );
    
    // Check if an ID is provided in the data (for schemas like relation-types that allow custom IDs)
    let entityId: string;
    const providedId = (processedData as any).id;
    
    if (providedId && typeof providedId === 'string' && providedId.trim().length > 0) {
      // Check if an entity with this ID already exists
      const existingEntity = entities.find(entity => entity.id === providedId.trim());
      if (existingEntity) {
        throw new Error(`Entity with ID "${providedId}" already exists`);
      }
      entityId = providedId.trim();
      // Remove id from processedData since we'll set it explicitly
      delete (processedData as any).id;
    } else {
      // Generate a new ULID if no ID is provided
      entityId = ulid();
    }
    
    const newEntity: T = {
      ...processedData,
      id: entityId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as T;

    entities.push(newEntity);
    writeSchemaData(this.schemaId, entities);
    
    return newEntity;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const entities = readSchemaData<T>(this.schemaId);
    const index = entities.findIndex(entity => entity.id === id);

    if (index === -1) {
      return null;
    }

    // Process password fields if this is the users schema
    // Always process password fields when updating users to detect and hash fields with role="password"
    const existingEntity = entities[index] as Record<string, any>;
    let processedData = data as Record<string, any>;
    
    if (this.schemaId === 'users') {
      // Merge existing data with new data for processing
      // This ensures we have all fields needed for password processing
      const mergedData = { ...existingEntity, ...data };
      
      // Process password fields - this will detect fields with role="password" from schema
      const processed = await processPasswordFields(this.schemaId, mergedData);
      
      // Start with the original update data
      processedData = { ...data };
      
      // If password field was in the update data, use the processed (hashed) version
      if ('password' in data) {
        // Check if password hashing failed
        if (processed._passwordHashFailed) {
          console.error(`[PASSWORD] Password hashing failed: ${processed._passwordHashError || 'Unknown error'}`);
          // Don't update the password if hashing failed - keep the existing one
          // Remove password from update data to prevent unhashed password from being saved
          delete processedData.password;
          console.warn(`[PASSWORD] Password update skipped due to hashing failure. Please set PEPPER environment variable.`);
        } else if (processed.password !== undefined && processed._passwordHashed) {
          // Use the processed password (which will be hashed if it wasn't already)
          processedData.password = processed.password;
          const originalLength =
            typeof data.password === 'string' ? data.password.length : 0;
          const hashedLength =
            typeof processed.password === 'string' ? processed.password.length : 0;
          console.log(
            `[PASSWORD] Password updated - original length: ${originalLength}, hashed length: ${hashedLength}`
          );
        } else if (processed.password === undefined && 'password' in data) {
          // Password was removed during processing (hashing failed), don't update it
          delete processedData.password;
          console.warn(`[PASSWORD] Password update skipped - password was not processed`);
        }
      }
      
      // Update hashType if it was set during processing
      if (processed.hashType !== undefined) {
        processedData.hashType = processed.hashType;
      }
      
      // Clean up internal flags
      delete processedData._passwordHashed;
      delete processedData._passwordHashFailed;
      delete processedData._passwordHashError;
    }

    const updatedEntity: T = {
      ...entities[index],
      ...processedData,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    entities[index] = updatedEntity;
    writeSchemaData(this.schemaId, entities);
    
    return updatedEntity;
  }

  async delete(id: string): Promise<boolean> {
    const entities = readSchemaData<T>(this.schemaId);
    const filteredEntities = entities.filter(entity => entity.id !== id);

    if (filteredEntities.length === entities.length) {
      return false; // Entity not found
    }

    writeSchemaData(this.schemaId, filteredEntities);
    return true;
  }

  async exists(id: string): Promise<boolean> {
    const entity = await this.findById(id);
    return entity !== null;
  }

  async count(filters?: FilterParams): Promise<number> {
    const entities = await this.findAll(filters);
    return entities.length;
  }
}

