// Utilities for synchronizing relations for repeating sections based on form submissions
// SERVER-ONLY: intended to be used from API routes after main entity create/update.

import { FormSchema, DataRelation } from '@/gradian-ui/schema-manager/types/form-schema';
import { getSchemaById } from '@/gradian-ui/schema-manager/utils/schema-registry.server';
import { createRelation, getRelationsForSection } from './relations-storage.util';

/**
 * Extract repeating section values from form data or entity.
 * Returns a map of sectionId -> array of items for relation-based repeating sections.
 */
export function extractRepeatingSectionValues(params: {
  schema: FormSchema;
  data: any;
}): Record<string, any[]> {
  const { schema, data } = params;
  const repeatingSectionValues: Record<string, any[]> = {};

  const relationBasedSections = (schema.sections || []).filter(
    (section) =>
      section.isRepeatingSection &&
      section.repeatingConfig?.targetSchema &&
      section.repeatingConfig?.relationTypeId,
  );

  for (const section of relationBasedSections) {
    const sectionId = section.id;
    const value = data[sectionId];

    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        repeatingSectionValues[sectionId] = value;
      } else {
        // Single value - convert to array
        repeatingSectionValues[sectionId] = [value];
      }
    }
  }

  return repeatingSectionValues;
}

/**
 * Synchronize relations for all relation-based repeating sections on a given entity.
 * This should be called after the main entity is created or updated.
 * 
 * For each repeating section with targetSchema and relationTypeId:
 * - Creates relations for each item in the section array
 * - Items should be in format {id: "targetId"} or just "targetId"
 * - Preserves existing relations created through modals even if section field is empty
 * - Marks relations as inactive if they're no longer in the array (only when we have data)
 */
export async function syncRepeatingSectionRelationsForEntity(params: {
  schemaId: string;
  entity: any;
}): Promise<DataRelation[]> {
  const { schemaId, entity } = params;

  if (!entity || !entity.id) {
    return [];
  }

  const schema: FormSchema = await getSchemaById(schemaId);
  const relations: DataRelation[] = [];

  const relationBasedSections = (schema.sections || []).filter(
    (section) =>
      section.isRepeatingSection &&
      section.repeatingConfig?.targetSchema &&
      section.repeatingConfig?.relationTypeId,
  );

  for (const section of relationBasedSections) {
    const sectionId = section.id;
    const targetSchema = section.repeatingConfig!.targetSchema!;
    const relationTypeId = section.repeatingConfig!.relationTypeId!;
    const sourceId = String(entity.id);

    const rawValue = entity[sectionId];
    
    // Extract target IDs from items (handle empty/null values)
    const targetIds: string[] = [];
    if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
      const items = Array.isArray(rawValue) ? rawValue : [rawValue];
      
      for (const item of items) {
        if (item === null || item === undefined) continue;

        let targetId: string | undefined;
        if (typeof item === 'string' || typeof item === 'number') {
          targetId = String(item);
        } else if (typeof item === 'object') {
          targetId = item.id ?? (item as any).value;
          if (targetId) {
            targetId = String(targetId);
          }
        }

        if (targetId) {
          targetIds.push(targetId);
        }
      }
    }

    // Get existing relations for this section (from database)
    // This includes relations created through modals even if section field is empty
    const existingRelations = getRelationsForSection(schemaId, sourceId, relationTypeId, targetSchema);
    const existingTargetIds = new Set(existingRelations.map((r) => String(r.targetId)));
    const currentTargetIds = new Set(targetIds);

    // Create relations for new targets from the entity data
    for (const targetId of targetIds) {
      if (!existingTargetIds.has(targetId)) {
        try {
          const newRelation = createRelation({
            sourceSchema: schemaId,
            sourceId,
            targetSchema,
            targetId,
            relationTypeId,
          });
          relations.push(newRelation);
        } catch (error) {
          console.warn(
            `[syncRepeatingSectionRelationsForEntity] Failed to create relation for section ${sectionId}, target ${targetId}:`,
            error,
          );
        }
      } else {
        // Relation already exists - ensure it's active
        const existingRel = existingRelations.find((r) => String(r.targetId) === targetId);
        if (existingRel && existingRel.inactive) {
          // Reactivate the relation by updating it
          const { readAllRelations, writeAllRelations } = await import('./relations-storage.util');
          const allRelations = readAllRelations();
          const relIndex = allRelations.findIndex((r) => r.id === existingRel.id);
          if (relIndex >= 0) {
            allRelations[relIndex] = {
              ...allRelations[relIndex],
              inactive: undefined,
              updatedAt: new Date().toISOString(),
            };
            writeAllRelations(allRelations);
            relations.push(allRelations[relIndex]);
          }
        } else if (existingRel) {
          relations.push(existingRel);
        }
      }
    }

    // IMPORTANT: Preserve existing relations that were created through modals
    // If the section field is empty but relations exist, keep them active
    // This handles the case where a tender is added through modal, relation is created,
    // but form is saved as incomplete with empty tenders field
    if ((rawValue === null || rawValue === undefined || rawValue === '') && existingRelations.length > 0) {
      // Section field is empty, but relations exist (created through modals)
      // Ensure all existing relations are active
      const { readAllRelations, writeAllRelations } = await import('./relations-storage.util');
      const allRelations = readAllRelations();
      let hasUpdates = false;
      
      for (const existingRel of existingRelations) {
        if (existingRel.inactive) {
          const relIndex = allRelations.findIndex((r) => r.id === existingRel.id);
          if (relIndex >= 0) {
            allRelations[relIndex] = {
              ...allRelations[relIndex],
              inactive: undefined,
              updatedAt: new Date().toISOString(),
            };
            hasUpdates = true;
            relations.push(allRelations[relIndex]);
          }
        } else {
          relations.push(existingRel);
        }
      }
      
      if (hasUpdates) {
        writeAllRelations(allRelations);
      }
    }

    // Mark relations as inactive if they're no longer in the array
    // BUT: Only if we actually have data in the entity (not empty/null)
    // This prevents marking relations as inactive when form is saved as incomplete
    // and the repeating section field is empty in the request body
    if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
      for (const existingRel of existingRelations) {
        if (!currentTargetIds.has(String(existingRel.targetId))) {
          // Mark as inactive only if we have actual data to compare against
          const { readAllRelations, writeAllRelations } = await import('./relations-storage.util');
          const allRelations = readAllRelations();
          const relIndex = allRelations.findIndex((r) => r.id === existingRel.id);
          if (relIndex >= 0 && !allRelations[relIndex].inactive) {
            allRelations[relIndex] = {
              ...allRelations[relIndex],
              inactive: true,
              updatedAt: new Date().toISOString(),
            };
            writeAllRelations(allRelations);
          }
        }
      }
    }
  }

  return relations;
}

