// Base Repository
// Generic repository implementation for JSON file storage

import { ulid } from 'ulid';
import { IRepository } from '../interfaces/repository.interface';
import { BaseEntity, FilterParams } from '../types/base.types';
import { readSchemaData, writeSchemaData, ensureSchemaCollection } from '../utils/data-storage.util';
import { EntityNotFoundError } from '../errors/domain.errors';
import { processPasswordFields } from '../utils/password-processor.util';
import { processSensitiveFields } from '../utils/sensitive-field-processor.util';
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

    // Handle companyIds filter - filter by multiple company IDs.
    // SECURITY / MULTI-TENANCY:
    // - Filter is based ONLY on "relatedCompanies" metadata when present.
    // - Entities without "relatedCompanies" are not filtered out by companyIds.
    if (filters.companyIds) {
      const companyIds = Array.isArray(filters.companyIds)
        ? filters.companyIds
        : typeof filters.companyIds === 'string'
          ? filters.companyIds.split(',').map(id => id.trim())
          : [];

      if (companyIds.length > 0) {
        // Normalize companyIds: trim and filter empty strings
        const normalizedCompanyIds = companyIds
          .map((id) => String(id).trim())
          .filter((id) => id.length > 0);

        if (normalizedCompanyIds.length > 0) {
          filtered = filtered.filter((entity: any) => {
            // If entity has "relatedCompanies" metadata, use it as primary filter source.
            const relatedCompanies = entity['relatedCompanies'];
            if (Array.isArray(relatedCompanies) && relatedCompanies.length > 0) {
              const relatedIds = relatedCompanies
                .map((item: any) => (item && item.id ? String(item.id).trim() : null))
                .filter((id: string | null): id is string => !!id);

              if (relatedIds.length > 0) {
                return relatedIds.some((id) => normalizedCompanyIds.includes(id));
              }
            }

            // If no relatedCompanies metadata, do NOT filter this entity out based on companyIds.
            // It is treated as global or not company-scoped.
            return true;
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

    // Handle tenantIds filter - filter by multiple tenant IDs.
    // SECURITY / MULTI-TENANCY:
    // - Only applies when schema has allowDataRelatedTenants: true (passed as filter.allowDataRelatedTenants)
    // - Filter is based ONLY on "relatedTenants" metadata when present.
    // - Entities without "relatedTenants" are visible to all tenants (not filtered out).
    if (filters.tenantIds && filters.allowDataRelatedTenants === true) {
      const tenantIds = Array.isArray(filters.tenantIds)
        ? filters.tenantIds
        : typeof filters.tenantIds === 'string'
          ? filters.tenantIds.split(',').map(id => id.trim())
          : [];

      if (tenantIds.length > 0) {
        // Normalize tenantIds: trim and filter empty strings
        const normalizedTenantIds = tenantIds
          .map((id) => String(id).trim())
          .filter((id) => id.length > 0);

        if (normalizedTenantIds.length > 0) {
          filtered = filtered.filter((entity: any) => {
            // If entity has "relatedTenants" metadata, use it as primary filter source.
            const relatedTenants = entity['relatedTenants'];
            
            // If relatedTenants is empty/undefined/null, entity is visible to all tenants
            if (!relatedTenants || !Array.isArray(relatedTenants) || relatedTenants.length === 0) {
              return true;
            }

            // If relatedTenants has values, check if any tenant ID matches
            const relatedIds = relatedTenants
              .map((item: any) => {
                if (typeof item === 'string') {
                  return String(item).trim();
                }
                if (item && item.id) {
                  return String(item.id).trim();
                }
                return null;
              })
              .filter((id: string | null): id is string => !!id);

            if (relatedIds.length > 0) {
              return relatedIds.some((id) => normalizedTenantIds.includes(id));
            }

            // If relatedTenants exists but has no valid IDs, treat as visible to all
            return true;
          });
        }
      }
    }

    // Apply any other custom filters (excluding companyId/companyIds/tenantIds/allowDataRelatedTenants which we've already handled)
    Object.keys(filters).forEach(key => {
      if (!['search', 'status', 'category', 'page', 'limit', 'sortBy', 'sortOrder', 'includeIds', 'excludeIds', 'companyId', 'companyIds', 'tenantIds', 'allowDataRelatedTenants'].includes(key)) {
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

  /**
   * Clean up data by removing undefined, null, or string "undefined" values
   */
  private cleanData(data: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip undefined, null, or the string "undefined"
      if (value !== undefined && value !== null && value !== 'undefined') {
        cleaned[key] = value;
      }
    }
    return cleaned;
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
    
    // Process sensitive fields for all schemas
    processedData = await processSensitiveFields(
      this.schemaId,
      processedData
    );
    
    // Clean up undefined/null/"undefined" values before saving
    processedData = this.cleanData(processedData);
    
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

    // Process password fields for all schemas
    // Always process password fields to detect and hash fields with component="password" or role="password"
    const existingEntity = entities[index] as Record<string, any>;
    let processedData = data as Record<string, any>;
    
    // Cast data to Record for dynamic property access
    const dataRecord = data as Record<string, any>;
    
    // Get schema once for both password and sensitive field processing (loaded once to avoid duplicates)
    const schema = await (async () => {
      try {
        const { getSchemaById } = await import('@/gradian-ui/schema-manager/utils/schema-registry.server');
        return await getSchemaById(this.schemaId);
      } catch {
        return null;
      }
    })();
    
    // Merge existing data with new data for processing
    // This ensures we have all fields needed for password processing
    const mergedData = { ...existingEntity, ...data };
    
    // Process password fields - this will detect fields with component="password" or role="password" from schema
    const processed = await processPasswordFields(this.schemaId, mergedData);
    
    // Start with the original update data
    processedData = { ...data };
    
    if (schema && schema.fields) {
      // Find all password fields (component="password" or role="password")
      const passwordFields = schema.fields.filter(
        (field: any) => field.component === 'password' || field.role === 'password'
      );
      
      // Update each password field that was in the update data
      for (const field of passwordFields) {
        const fieldName = field.name;
        if (fieldName in dataRecord) {
          // Check if password hashing failed
          if (processed._passwordHashFailed) {
            console.error(`[PASSWORD] Password hashing failed for field ${fieldName}: ${processed._passwordHashError || 'Unknown error'}`);
            // Don't update the password if hashing failed - keep the existing one
            // Remove password from update data to prevent unhashed password from being saved
            delete processedData[fieldName];
            console.warn(`[PASSWORD] Password update skipped for ${fieldName} due to hashing failure. Please set PEPPER environment variable.`);
          } else if (processed[fieldName] !== undefined && processed._passwordHashed) {
            // Use the processed password (which will be hashed if it wasn't already)
            processedData[fieldName] = processed[fieldName];
            const originalLength =
              typeof dataRecord[fieldName] === 'string' ? dataRecord[fieldName].length : 0;
            const hashedLength =
              typeof processed[fieldName] === 'string' ? processed[fieldName].length : 0;
            console.log(
              `[PASSWORD] Password updated for ${fieldName} - original length: ${originalLength}, hashed length: ${hashedLength}`
            );
          } else if (processed[fieldName] === undefined && fieldName in dataRecord) {
            // Password was removed during processing (hashing failed), don't update it
            delete processedData[fieldName];
            console.warn(`[PASSWORD] Password update skipped for ${fieldName} - password was not processed`);
          }
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

    // Process sensitive fields for all schemas
    // Merge existing data with new data for processing
    const mergedDataForSensitive = { ...existingEntity, ...processedData };
    const processedSensitive = await processSensitiveFields(this.schemaId, mergedDataForSensitive);
    
    // Update only fields that were actually changed and are sensitive
    // Check which sensitive fields exist in the schema and update them if they were in the original update data
    // Reuse the same schema variable loaded earlier (no duplicate declaration)
    if (schema && schema.fields) {
      const sensitiveFields = schema.fields.filter((field: any) => field.isSensitive === true);
      
      for (const field of sensitiveFields) {
        const fieldName = field.name;
        // Only update if this field was in the original update data
        if (fieldName in dataRecord && processedSensitive[fieldName] !== undefined) {
          processedData[fieldName] = processedSensitive[fieldName];
        }
      }
    }

    // Clean up undefined/null/"undefined" values before saving
    processedData = this.cleanData(processedData);

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

