// Migration utility to convert existing popup picker field values to HAS_FIELD_VALUE relations
// SERVER-ONLY: uses Node.js fs module and must only be used in server-side code

import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { getSchemaById } from '@/gradian-ui/schema-manager/utils/schema-registry.server';
import { readSchemaData, writeSchemaData } from './data-storage.util';
import { syncHasFieldValueRelationsForEntity, minimizePickerFieldValues } from './field-value-relations.util';
import { loadAllSchemas } from '@/gradian-ui/schema-manager/utils/schema-loader';

export interface MigrationResult {
  schemaId: string;
  entitiesProcessed: number;
  relationsCreated: number;
  errors: Array<{ entityId: string; error: string }>;
}

/**
 * Migrate all popup picker fields from direct storage to HAS_FIELD_VALUE relations
 * This processes all schemas and all entities, converting picker field values to relations
 */
export async function migrateAllPickerFieldsToRelations(): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];
  
  try {
    // Load all schemas
    const allSchemas = await loadAllSchemas();
    
    // Process each schema
    for (const schema of allSchemas) {
      if (!schema.id) continue;
      
      const result = await migratePickerFieldsForSchema(schema.id);
      results.push(result);
    }
  } catch (error) {
    console.error('[migrateAllPickerFieldsToRelations] Failed to load schemas:', error);
  }
  
  return results;
}

/**
 * Migrate picker fields for a specific schema
 */
export async function migratePickerFieldsForSchema(schemaId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    schemaId,
    entitiesProcessed: 0,
    relationsCreated: 0,
    errors: [],
  };
  
  try {
    const schema = await getSchemaById(schemaId);
    if (!schema) {
      result.errors.push({
        entityId: 'schema',
        error: `Schema ${schemaId} not found`,
      });
      return result;
    }
    
    // Find all picker fields in this schema
    const pickerFields = (schema.fields || []).filter(
      (field) => field.component === 'picker' && (field as any).name
    );
    
    if (pickerFields.length === 0) {
      // No picker fields in this schema, skip
      return result;
    }
    
    // Read all entities for this schema
    const entities = readSchemaData(schemaId);
    
    // Process each entity
    for (const entity of entities) {
      if (!entity || !entity.id) continue;
      
      try {
        // Check if entity has any picker field values to migrate
        // Also check if picker fields exist in the entity (even if empty/null, we need to ensure relations are synced)
        let hasPickerValues = false;
        let hasPickerFields = false;
        
        for (const field of pickerFields) {
          const fieldName = (field as any).name;
          if (!fieldName) continue;
          
          hasPickerFields = true; // At least one picker field exists in schema
          
          const fieldValue = entity[fieldName];
          // Check if field has a value (including empty arrays which should be handled)
          if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
            // Also check if it's an empty array (which should still be processed to mark old relations as inactive)
            if (Array.isArray(fieldValue) && fieldValue.length === 0) {
              hasPickerValues = true; // Empty array means we should sync (to mark old relations inactive)
            } else if (!Array.isArray(fieldValue) || fieldValue.length > 0) {
              hasPickerValues = true; // Has actual values to migrate
            }
          }
        }
        
        // If schema has picker fields, we should process the entity to ensure relations are synced
        // This handles cases where:
        // 1. Entity has picker values to migrate
        // 2. Entity has empty/null picker fields (need to mark old relations as inactive)
        // 3. Entity might have relations already but picker values still exist (cleanup)
        if (!hasPickerFields) {
          // No picker fields in schema, skip this entity
          continue;
        }
        
        // Sync relations for this entity (this will create/update relations from existing field values)
        // The sync function handles upserting, so it's safe to run multiple times
        // It will:
        // - Create relations for existing picker values
        // - Mark old relations as inactive if values are removed/empty
        const relations = await syncHasFieldValueRelationsForEntity({
          schemaId,
          entity,
        });
        
        // Only count as processed if we actually created/updated relations or if entity had picker values
        if (hasPickerValues || relations.length > 0) {
          result.entitiesProcessed++;
          result.relationsCreated += relations.length;
        }
        
        // Minimize picker field values to [{id}, {id}] format for tracing
        // Relations are the source of truth, but we keep minimal IDs in entity
        const minimizedEntity = minimizePickerFieldValues({
          schema,
          data: entity,
        });
        
        // Check if entity needs to be updated (values were minimized)
        let hasChanges = false;
        for (const field of pickerFields) {
          const fieldName = (field as any).name;
          if (!fieldName) continue;
          
          const originalValue = entity[fieldName];
          const minimizedValue = minimizedEntity[fieldName];
          
          // Check if value changed (was minimized)
          if (JSON.stringify(originalValue) !== JSON.stringify(minimizedValue)) {
            hasChanges = true;
            break;
          }
        }
        
        // Only update entity if we made changes (minimized picker fields)
        if (hasChanges) {
          // Update entity in storage with minimized picker values
          const allEntities = readSchemaData(schemaId);
          const entityIndex = allEntities.findIndex((e: any) => e.id === entity.id);
          if (entityIndex >= 0) {
            allEntities[entityIndex] = minimizedEntity;
            writeSchemaData(schemaId, allEntities);
          }
        }
      } catch (error) {
        result.errors.push({
          entityId: entity.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  } catch (error) {
    result.errors.push({
      entityId: 'schema',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  return result;
}

