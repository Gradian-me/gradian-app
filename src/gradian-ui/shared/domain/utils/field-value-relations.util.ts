// Utilities for synchronizing HAS_FIELD_VALUE relations based on form submissions
// SERVER-ONLY: intended to be used from API routes after main entity create/update.

import { FormSchema, DataRelation } from '@/gradian-ui/schema-manager/types/form-schema';
import { getSchemaById } from '@/gradian-ui/schema-manager/utils/schema-registry.server';
import { upsertFieldValueRelations } from './relations-storage.util';
import { upsertExternalNodeFromOption } from './external-nodes.util';

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
 * Synchronize HAS_FIELD_VALUE relations for all picker fields on a given entity.
 * This should be called after the main entity is created or updated.
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

  const pickerFields = (schema.fields || []).filter(
    (field) => field.component === 'picker' && (field as any).name,
  );

  for (const field of pickerFields) {
    const fieldName = (field as any).name as string;
    const fieldId = field.id || fieldName;
    const targetSchemaId = (field as any).targetSchema as string | undefined;
    const sourceUrl = (field as any).sourceUrl as string | undefined;

    const rawValue = entity[fieldName];
    const options = toArray<NormalizedOptionLike | string | number>(rawValue);

    if (!targetSchemaId && !sourceUrl) {
      continue;
    }

    // Build target list for relations
    const targets: Array<{ targetSchema: string; targetId: string }> = [];

    for (const option of options) {
      if (option === null || option === undefined) continue;

      if (targetSchemaId) {
        // Internal schema-based picker
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
        // External URL-based picker -> map into external_nodes
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
            targetSchema: 'external-nodes',
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
            targetSchema: 'external-nodes',
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


