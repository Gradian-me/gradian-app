// Utilities for synchronizing HAS_FIELD_VALUE relations based on form submissions
// SERVER-ONLY: intended to be used from API routes after main entity create/update.

import { FormSchema, DataRelation } from '@/gradian-ui/schema-manager/types/form-schema';
import { getSchemaById } from '@/gradian-ui/schema-manager/utils/schema-registry.server';
import { upsertFieldValueRelations } from './relations-storage.util';
import { upsertExternalNodeFromOption } from './external-nodes.util';
import { replaceDynamicContext } from '@/gradian-ui/form-builder/utils/dynamic-context-replacer';

type NormalizedOptionLike = {
  id?: string | number;
  label?: string;
  icon?: string;
  color?: string;
  metadata?: any;
};

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Extract relation-supporting field values from form data or entity.
 * Returns a map of fieldName -> value for fields that support HAS_FIELD_VALUE relations.
 * Supports: picker, select, checkbox-list, radio, toggle-group
 */
export function extractPickerFieldValues(params: {
  schema: FormSchema;
  data: any;
}): Record<string, any> {
  const { schema, data } = params;
  const pickerValues: Record<string, any> = {};

  const relationFields = (schema.fields || []).filter(
    (field) => shouldCreateFieldValueRelations(field),
  );

  for (const field of relationFields) {
    const fieldName = (field as any).name as string;
    const value = data[fieldName];
    if (value !== null && value !== undefined && value !== '') {
      pickerValues[fieldName] = value;
    }
  }

  return pickerValues;
}

/**
 * Convert relation-supporting field values to minimal [{id, metadata}, {id, metadata}] format for tracing.
 * This keeps IDs and metadata in the entity for backward compatibility and tracing,
 * but all operations should use relations for full data (label, icon, color).
 * Metadata is preserved from fields with addToReferenceMetadata: true.
 * Supports: picker, select, checkbox-list, radio, toggle-group
 */
export function minimizePickerFieldValues(params: {
  schema: FormSchema;
  data: any;
}): any {
  const { schema, data } = params;
  const minimized = { ...data };

  const relationFields = (schema.fields || []).filter(
    (field) => shouldCreateFieldValueRelations(field),
  );

  for (const field of relationFields) {
    const fieldName = (field as any).name as string;
    const value = minimized[fieldName];

    if (value === null || value === undefined || value === '') {
      // Set to empty array if field exists but is null/undefined
      minimized[fieldName] = [];
    } else if (Array.isArray(value)) {
      // Convert array to minimal [{id, metadata}, {id, metadata}] format
      minimized[fieldName] = value.map((item) => {
        if (typeof item === 'string' || typeof item === 'number') {
          return { id: String(item) };
        } else if (typeof item === 'object' && item !== null) {
          // Extract ID and preserve metadata if present
          const id = item.id ?? (item as any).value;
          if (!id) return null;
          
          const minimizedItem: { id: string; metadata?: Record<string, any> } = { id: String(id) };
          
          // Preserve metadata if it exists
          if (item.metadata && typeof item.metadata === 'object' && Object.keys(item.metadata).length > 0) {
            minimizedItem.metadata = item.metadata;
          }
          
          return minimizedItem;
        }
        return null;
      }).filter((item) => item !== null);
    } else {
      // Single value - convert to [{id, metadata}] format
      if (typeof value === 'string' || typeof value === 'number') {
        minimized[fieldName] = [{ id: String(value) }];
      } else if (typeof value === 'object' && value !== null) {
        const id = value.id ?? (value as any).value;
        if (!id) {
          minimized[fieldName] = [];
        } else {
          const minimizedItem: { id: string; metadata?: Record<string, any> } = { id: String(id) };
          
          // Preserve metadata if it exists
          if (value.metadata && typeof value.metadata === 'object' && Object.keys(value.metadata).length > 0) {
            minimizedItem.metadata = value.metadata;
          }
          
          minimized[fieldName] = [minimizedItem];
        }
      } else {
        minimized[fieldName] = [];
      }
    }
  }

  return minimized;
}

/**
 * @deprecated Use minimizePickerFieldValues instead
 * Remove picker field values from data object (for relations-only storage).
 */
export function removePickerFieldValues(params: {
  schema: FormSchema;
  data: any;
}): any {
  return minimizePickerFieldValues(params);
}

/**
 * Check if a field component type should create HAS_FIELD_VALUE relations.
 * Supports: picker, select, checkbox-list, radio, toggle-group
 */
function shouldCreateFieldValueRelations(field: any): boolean {
  const component = field.component;
  const supportedComponents = [
    'picker',
    'popup-picker',
    'popuppicker',
    'popup-picker-input',
    'pickerinput',
    'select',
    'checkbox-list',
    'checkboxlist',
    'checkbox_list',
    'radio',
    'radio-group',
    'radiogroup',
    'toggle-group',
    'togglegroup',
  ];
  return supportedComponents.includes(component) && (field as any).name;
}

/**
 * Synchronize HAS_FIELD_VALUE relations for all relation-supporting fields on a given entity.
 * Supports: picker, select, checkbox-list, radio, toggle-group
 * This should be called after the main entity is created or updated.
 * 
 * Note: This function reads field values from the entity/data object.
 * For relations-only storage, field values should be removed from the entity
 * after relations are created.
 */
export async function syncHasFieldValueRelationsForEntity(params: {
  schemaId: string;
  entity: any;
}): Promise<DataRelation[]> {
  const { schemaId, entity } = params;

  if (!entity || !entity.id) {
    return [];
  }

  const schema: FormSchema = await getSchemaById(schemaId);
  const relations: DataRelation[] = [];

  // Find all fields that support HAS_FIELD_VALUE relations
  const relationFields = (schema.fields || []).filter(
    (field) => shouldCreateFieldValueRelations(field),
  );

  for (const field of relationFields) {
    const fieldName = (field as any).name as string;
    const fieldId = field.id || fieldName;
    const rawTargetSchemaId = (field as any).targetSchema as string | undefined;
    const sourceUrl = (field as any).sourceUrl as string | undefined;
    const fieldOptions = (field as any).options as Array<{ id?: string; label?: string; value?: string; icon?: string; color?: string }> | undefined;

    // Resolve dynamic targetSchema (e.g., "{{formData.resourceType}}") using entity data
    // The entity contains the formData values, so we can use it to resolve templates
    // This ensures relations are saved with the actual schema ID, not the template string
    const targetSchemaId = rawTargetSchemaId 
      ? replaceDynamicContext(rawTargetSchemaId, { formSchema: schema, formData: entity })
      : undefined;

    const rawValue = entity[fieldName];
    // For single-select components (select, radio, toggle-group), convert to array
    // For multi-select components (picker, checkbox-list), already array or convert
    const isMultiSelect = field.component === 'picker' || 
                         field.component === 'checkbox-list';
    
    // Handle both single values and arrays for all components
    // If rawValue is already an array, use it directly (for both single and multi-select)
    // If rawValue is a single value, convert to array
    let options: Array<NormalizedOptionLike | string | number> = [];
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      options = [];
    } else if (Array.isArray(rawValue)) {
      // Already an array - use it directly (handles both [{id: ...}] and [id1, id2, ...])
      options = rawValue;
    } else {
      // Single value - wrap in array
      options = [rawValue];
    }

    // Build target list for relations
    const targets: Array<{ targetSchema: string; targetId: string }> = [];

    for (const option of options) {
      if (option === null || option === undefined) continue;

      if (targetSchemaId) {
        // Internal schema-based picker/select
        if (typeof option === 'string' || typeof option === 'number') {
          targets.push({
            targetSchema: targetSchemaId,
            targetId: String(option),
          });
        } else if (typeof option === 'object') {
          const id = option.id ?? (option as any).value;
          if (id) {
            targets.push({
              targetSchema: targetSchemaId,
              targetId: String(id),
            });
          }
        }
      } else if (sourceUrl) {
        // External URL-based picker/select -> map into external_nodes
        if (typeof option === 'object') {
          const externalNode = upsertExternalNodeFromOption({
            sourceUrl,
            option: {
              id: option.id,
              label: option.label,
              icon: (option as any).icon,
              color: (option as any).color,
              metadata: (option as any).metadata,
            },
          });

          targets.push({
            targetSchema: 'external_nodes',
            targetId: externalNode.id,
          });
        } else {
          // Primitive value from external source - store minimal external node
          const externalNode = upsertExternalNodeFromOption({
            sourceUrl,
            option: {
              id: option as any,
              label: String(option),
            },
          });

          targets.push({
            targetSchema: 'external_nodes',
            targetId: externalNode.id,
          });
        }
      } else if (fieldOptions && Array.isArray(fieldOptions) && fieldOptions.length > 0) {
        // Field has options defined directly (select, checkbox-list, radio, toggle-group with static options)
        // Create relations to external_nodes for these options
        let optionId: string | undefined;
        let optionLabel: string | undefined;
        let optionIcon: string | undefined;
        let optionColor: string | undefined;

        if (typeof option === 'string' || typeof option === 'number') {
          // Find the option in fieldOptions by id or value
          const foundOption = fieldOptions.find(
            (opt) => opt.id === String(option) || opt.value === String(option)
          );
          if (foundOption) {
            optionId = foundOption.id || foundOption.value || String(option);
            optionLabel = foundOption.label || optionId;
            optionIcon = foundOption.icon;
            optionColor = foundOption.color;
          } else {
            // Use the value as-is if not found in options
            optionId = String(option);
            optionLabel = String(option);
          }
        } else if (typeof option === 'object' && option !== null) {
          // Option is already an object with id, label, etc.
          optionId = option.id ?? (option as any).value ?? String(option);
          optionLabel = option.label ?? optionId;
          optionIcon = (option as any).icon;
          optionColor = (option as any).color;
        }

        if (optionId) {
          // Create external node for this option
          const externalNode = upsertExternalNodeFromOption({
            sourceUrl: `field-options:${schemaId}:${fieldId}`, // Use a unique sourceUrl for field options
            option: {
              id: optionId,
              label: optionLabel || optionId,
              icon: optionIcon,
              color: optionColor,
            },
          });

          targets.push({
            targetSchema: 'external_nodes',
            targetId: externalNode.id,
          });
        }
      }
    }

    // Upsert relations for this field; this will mark removed ones as inactive
    if (targets.length > 0 || (targets.length === 0 && fieldId)) {
      const fieldRelations = upsertFieldValueRelations({
        sourceSchema: schemaId,
        sourceId: String(entity.id),
        relationTypeId: 'HAS_FIELD_VALUE',
        fieldId,
        targets,
      });
      relations.push(...fieldRelations);
    }
  }

  return relations;
}

/**
 * Enrich entity picker fields with full data from HAS_FIELD_VALUE relations.
 * This converts minimal [{id}] format to full [{id, label, icon, color}] format
 * for display in tables and other views.
 */
export async function enrichEntityPickerFieldsFromRelations(params: {
  schemaId: string;
  entity: any;
}): Promise<any> {
  const { schemaId, entity } = params;

  if (!entity || !entity.id) {
    return entity;
  }

  try {
    const schema = await getSchemaById(schemaId);
    if (!schema) {
      return entity;
    }

    // Find all fields that support HAS_FIELD_VALUE relations
    const relationFields = (schema.fields || []).filter(
      (field) => shouldCreateFieldValueRelations(field),
    );

    if (relationFields.length === 0) {
      return entity;
    }

    // Fetch all HAS_FIELD_VALUE relations for this entity
    const { getRelationsBySource } = await import('./relations-storage.util');
    const relations = getRelationsBySource(schemaId, String(entity.id));
    
    // Filter for HAS_FIELD_VALUE relations only
    const hasFieldValueRelations = relations.filter(
      (r) => r.relationTypeId === 'HAS_FIELD_VALUE' && !r.inactive,
    );

    if (hasFieldValueRelations.length === 0) {
      // No relations found, return entity as-is (with minimal IDs if they exist)
      return entity;
    }

    // Group relations by fieldId and also by field name for fallback matching
    const relationsByFieldId = hasFieldValueRelations.reduce<Record<string, typeof hasFieldValueRelations>>(
      (acc, rel) => {
        if (!rel.fieldId) return acc;
        if (!acc[rel.fieldId]) {
          acc[rel.fieldId] = [];
        }
        acc[rel.fieldId].push(rel);
        return acc;
      },
      {},
    );

    // Also create a map by field name for fallback matching
    // Match relations to fields by both fieldId and field name
    const relationsByFieldName = hasFieldValueRelations.reduce<Record<string, typeof hasFieldValueRelations>>(
      (acc, rel) => {
        if (!rel.fieldId) return acc;
        
        // Try multiple matching strategies:
        // 1. Match by fieldId directly matching field.id or field.name
        // 2. Match by fieldId containing the field name
        // 3. Match by field name containing the fieldId
        for (const field of relationFields) {
          const fieldName = (field as any).name;
          const fieldIdFromField = field.id || fieldName;
          
          // Direct match
          if (rel.fieldId === fieldIdFromField || rel.fieldId === fieldName) {
            if (!acc[fieldName]) {
              acc[fieldName] = [];
            }
            acc[fieldName].push(rel);
            break;
          }
          
          // Partial match - fieldId contains field name or vice versa
          if (fieldName && (
            rel.fieldId.includes(fieldName) || 
            fieldName.includes(rel.fieldId) ||
            rel.fieldId.endsWith(fieldName) ||
            rel.fieldId.startsWith(fieldName)
          )) {
            if (!acc[fieldName]) {
              acc[fieldName] = [];
            }
            acc[fieldName].push(rel);
            break;
          }
        }
        
        return acc;
      },
      {},
    );

    // Enrich entity with picker field data from relations
    const enrichedEntity = { ...entity };

    // Use the relations API to get enriched data
    // For now, we'll resolve targets manually to avoid circular dependency
    const { getExternalNodes } = await import('./external-nodes.util');
    const { BaseRepository } = await import('../repositories/base.repository');
    const { getValueByRole, getSingleValueByRole } = await import('@/gradian-ui/form-builder/form-elements/utils/field-resolver');

    const externalNodes = getExternalNodes();
    const externalNodeMap = new Map(externalNodes.map((node) => [node.id, node]));

    // Group relations by targetSchema for batch fetching
    const relationsByTargetSchema = new Map<string, typeof hasFieldValueRelations>();
    for (const rel of hasFieldValueRelations) {
      if (!relationsByTargetSchema.has(rel.targetSchema)) {
        relationsByTargetSchema.set(rel.targetSchema, []);
      }
      relationsByTargetSchema.get(rel.targetSchema)!.push(rel);
    }

    // Batch fetch entities by schema
    const schemaEntityMap = new Map<string, Map<string, any>>();
    const schemaMap = new Map<string, any>();

    await Promise.all(
      Array.from(relationsByTargetSchema.keys())
        .filter((schemaId) => schemaId !== 'external_nodes')
        .map(async (targetSchemaId) => {
          try {
            const [targetSchema, allEntities] = await Promise.all([
              getSchemaById(targetSchemaId),
              new BaseRepository(targetSchemaId).findAll(),
            ]);

            if (targetSchema) {
              schemaMap.set(targetSchemaId, targetSchema);
            }

            const entityMap = new Map(allEntities.map((e: any) => [e.id, e]));
            schemaEntityMap.set(targetSchemaId, entityMap);
          } catch (error) {
            console.warn(`[enrichEntityPickerFieldsFromRelations] Failed to fetch schema ${targetSchemaId}:`, error);
          }
        }),
    );

    // Process each relation-supporting field
    for (const field of relationFields) {
      const fieldName = (field as any).name as string;
      if (!fieldName) continue;
      
      const fieldId = field.id || fieldName;
      
      // Try multiple matching strategies:
      // 1. Direct fieldId match
      let fieldRelations = relationsByFieldId[fieldId] || [];
      
      // 2. Direct field name match
      if (fieldRelations.length === 0) {
        fieldRelations = relationsByFieldId[fieldName] || [];
      }
      
      // 3. Field name mapping (handles cases like "server-owners" -> "owners")
      if (fieldRelations.length === 0) {
        fieldRelations = relationsByFieldName[fieldName] || [];
      }
      
      // 4. Try matching by fieldId that contains or ends with field name
      if (fieldRelations.length === 0) {
        fieldRelations = hasFieldValueRelations.filter((rel) => {
          if (!rel.fieldId) return false;
          // Check if fieldId matches field name or contains it
          return rel.fieldId === fieldName || 
                 rel.fieldId === fieldId ||
                 rel.fieldId.endsWith(`-${fieldName}`) ||
                 rel.fieldId.endsWith(`_${fieldName}`) ||
                 rel.fieldId.includes(fieldName);
        });
      }

      if (fieldRelations.length === 0) {
        // No relations for this field, but check if we have stored values with metadata
        const existingValue = enrichedEntity[fieldName];
        if (Array.isArray(existingValue) && existingValue.length > 0) {
          // Keep existing stored values (which may include metadata)
          // Don't overwrite - they're already in the correct format
          continue;
        }
        // No relations and no existing value, skip this field
        continue;
      }

      // Determine if this is a single-select or multi-select component
      const isFieldMultiSelect = field.component === 'picker' || 
                                 field.component === 'checkbox-list';
      
      // For single-select components, only use the first relation
      const relationsToUse = isFieldMultiSelect ? fieldRelations : (fieldRelations.slice(0, 1));
      
      // Map relations to enriched format
      // First, check if there are existing stored values with metadata
      const existingValue = enrichedEntity[fieldName];
      const existingValueMap = new Map<string, any>();
      if (Array.isArray(existingValue)) {
        existingValue.forEach((item: any) => {
          if (item && item.id) {
            existingValueMap.set(String(item.id), item);
          }
        });
      }

      const enrichedValues = relationsToUse.map((rel) => {
        // Check if we have stored metadata for this ID
        const storedItem = existingValueMap.get(String(rel.targetId));
        const storedMetadata = storedItem?.metadata;

        if (rel.targetSchema === 'external_nodes') {
          const externalNode = externalNodeMap.get(rel.targetId);
          if (externalNode) {
            return {
              id: externalNode.id,
              label: externalNode.label || externalNode.id,
              icon: externalNode.icon,
              color: externalNode.color,
              targetSchema: rel.targetSchema, // Include targetSchema from relation for badge navigation
              ...(storedMetadata ? { metadata: storedMetadata } : {}),
            };
          }
          return {
            id: rel.targetId,
            label: rel.targetId,
            targetSchema: rel.targetSchema, // Include targetSchema from relation for badge navigation
            ...(storedMetadata ? { metadata: storedMetadata } : {}),
          };
        } else {
          const entityMap = schemaEntityMap.get(rel.targetSchema);
          const targetEntity = entityMap?.get(rel.targetId);
          const targetSchema = schemaMap.get(rel.targetSchema);

          if (targetEntity && targetSchema) {
            const label = getValueByRole(targetSchema, targetEntity, 'title') || targetEntity.name || targetEntity.title || rel.targetId;
            const icon = getSingleValueByRole(targetSchema, targetEntity, 'icon') || targetEntity.icon;
            const color = getSingleValueByRole(targetSchema, targetEntity, 'color') || targetEntity.color;

            // Use stored metadata if available, otherwise extract from fields with addToReferenceMetadata: true
            const metadata: Record<string, any> = storedMetadata || {};
            if (!storedMetadata || Object.keys(storedMetadata).length === 0) {
              const metadataFields = targetSchema.fields?.filter((f: any) => f.addToReferenceMetadata === true) || [];
              if (metadataFields.length > 0) {
                metadataFields.forEach((field: any) => {
                  const fieldName = field.name;
                  if (fieldName && targetEntity[fieldName] !== undefined && targetEntity[fieldName] !== null) {
                    metadata[fieldName] = targetEntity[fieldName];
                  }
                });
              }
            }

            return {
              id: rel.targetId,
              label: typeof label === 'string' ? label : String(label),
              icon: icon ? String(icon) : undefined,
              color: color ? String(color) : undefined,
              targetSchema: rel.targetSchema, // Include targetSchema from relation for badge navigation
              ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
            };
          }
          return {
            id: rel.targetId,
            label: rel.targetId,
            targetSchema: rel.targetSchema, // Include targetSchema from relation for badge navigation
            ...(storedMetadata ? { metadata: storedMetadata } : {}),
          };
        }
      });

      // Set enriched value on entity
      // For single-select components, use the first option (or null if empty)
      // For multi-select components, use the array of options
      enrichedEntity[fieldName] = isFieldMultiSelect ? enrichedValues : (enrichedValues[0] || null);
    }

    return enrichedEntity;
  } catch (error) {
    console.warn('[enrichEntityPickerFieldsFromRelations] Failed to enrich entity:', error);
    return entity;
  }
}

/**
 * Enrich multiple entities with picker field data from relations.
 * Optimized for batch processing.
 */
export async function enrichEntitiesPickerFieldsFromRelations(params: {
  schemaId: string;
  entities: any[];
}): Promise<any[]> {
  const { schemaId, entities } = params;

  if (!Array.isArray(entities) || entities.length === 0) {
    return entities;
  }

  // Process all entities in parallel
  const enrichedEntities = await Promise.all(
    entities.map((entity) =>
      enrichEntityPickerFieldsFromRelations({
        schemaId,
        entity,
      }),
    ),
  );

  return enrichedEntities;
}


