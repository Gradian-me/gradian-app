// Relations Storage Utility
// Handles reading and writing to all-data-relations.json file
// SERVER-ONLY: This file uses Node.js fs module and can only be used in server-side code (API routes, server components)

import fs from 'fs';
import path from 'path';
import { DataStorageError } from '../errors/domain.errors';
import { DataRelation } from '@/gradian-ui/schema-manager/types/form-schema';
import { ulid } from 'ulid';

const RELATIONS_FILE_PATH = path.join(process.cwd(), 'data', 'all-data-relations.json');
const RELATIONS_TMP_PATH = path.join(process.cwd(), 'data', 'all-data-relations.tmp.json');
const MAX_RELATIONS_FILE_BYTES = 8 * 1024 * 1024; // 8MB cap to avoid runaway growth

/**
 * Ensure data directory and relations file exist
 */
function ensureRelationsFile(): void {
  const dataDir = path.join(process.cwd(), 'data');
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(RELATIONS_FILE_PATH)) {
    const initialData: DataRelation[] = [];
    fs.writeFileSync(RELATIONS_FILE_PATH, JSON.stringify(initialData, null, 2), { encoding: 'utf-8', mode: 0o600 });
  }
}

function writeRelationsAtomically(payload: string): void {
  fs.writeFileSync(RELATIONS_TMP_PATH, payload, { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(RELATIONS_TMP_PATH, RELATIONS_FILE_PATH);
}

/**
 * Read all relations from the JSON file
 */
export function readAllRelations(): DataRelation[] {
  try {
    ensureRelationsFile();
    const { size } = fs.statSync(RELATIONS_FILE_PATH);
    if (size > MAX_RELATIONS_FILE_BYTES) {
      throw new DataStorageError('read relations', 'Relations file exceeds safe size limit');
    }
    const rawData = fs.readFileSync(RELATIONS_FILE_PATH, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    throw new DataStorageError('read relations', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Write all relations to the JSON file
 */
export function writeAllRelations(relations: DataRelation[]): void {
  try {
    ensureRelationsFile();
    const payload = JSON.stringify(relations, null, 2);
    writeRelationsAtomically(payload);
  } catch (error) {
    throw new DataStorageError('write relations', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Create a new relation
 */
export function createRelation(relation: Omit<DataRelation, 'id' | 'createdAt' | 'updatedAt'>): DataRelation {
  try {
    const relations = readAllRelations();
    const now = new Date().toISOString();
    const newRelation: DataRelation = {
      ...relation,
      id: ulid(),
      createdAt: now,
      updatedAt: now,
    };
    relations.push(newRelation);
    writeAllRelations(relations);
    return newRelation;
  } catch (error) {
    throw new DataStorageError('create relation', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Upsert HAS_FIELD_VALUE-style relations for a specific field on an entity.
 * - Marks previous relations for this (sourceSchema, sourceId, relationTypeId, fieldId)
 *   as inactive when they are no longer selected.
 * - Ensures currently selected targets are present and active.
 */
export function upsertFieldValueRelations(params: {
  sourceSchema: string;
  sourceId: string;
  relationTypeId: string;
  fieldId: string;
  targets: Array<{ targetSchema: string; targetId: string }>;
}): DataRelation[] {
  const { sourceSchema, sourceId, relationTypeId, fieldId, targets } = params;

  try {
    const relations = readAllRelations();
    const now = new Date().toISOString();

    // Existing relations for this field on this entity
    const existingForField = relations.filter(
      (r) =>
        r.sourceSchema === sourceSchema &&
        r.sourceId === sourceId &&
        r.relationTypeId === relationTypeId &&
        r.fieldId === fieldId,
    );

    const targetKey = (t: { targetSchema: string; targetId: string }) => `${t.targetSchema}::${t.targetId}`;
    const newTargetKeys = new Set(targets.map(targetKey));

    const updatedRelations: DataRelation[] = relations.map((relation) => {
      if (
        relation.sourceSchema === sourceSchema &&
        relation.sourceId === sourceId &&
        relation.relationTypeId === relationTypeId &&
        relation.fieldId === fieldId
      ) {
        const key = targetKey({ targetSchema: relation.targetSchema, targetId: relation.targetId });
        const isStillSelected = newTargetKeys.has(key);

        return {
          ...relation,
          inactive: !isStillSelected || relation.inactive === true ? !isStillSelected : undefined,
          updatedAt: now,
        };
      }

      return relation;
    });

    // Create relations for new targets that don't exist yet
    const existingKeys = new Set(
      existingForField.map((r) => targetKey({ targetSchema: r.targetSchema, targetId: r.targetId })),
    );

    const newRelations: DataRelation[] = targets
      .filter((t) => !existingKeys.has(targetKey(t)))
      .map((t) => ({
        id: ulid(),
        sourceSchema,
        sourceId,
        targetSchema: t.targetSchema,
        targetId: t.targetId,
        relationTypeId,
        fieldId,
        inactive: undefined,
        createdAt: now,
        updatedAt: now,
      }));

    const allRelations = [...updatedRelations, ...newRelations];
    writeAllRelations(allRelations);

    return allRelations.filter(
      (r) =>
        r.sourceSchema === sourceSchema &&
        r.sourceId === sourceId &&
        r.relationTypeId === relationTypeId &&
        r.fieldId === fieldId,
    );
  } catch (error) {
    throw new DataStorageError('upsert field value relations', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Delete a relation by ID
 */
export function deleteRelation(relationId: string): void {
  try {
    const relations = readAllRelations();
    const filtered = relations.filter(r => r.id !== relationId);
    
    if (filtered.length === relations.length) {
      throw new Error(`Relation not found: ${relationId}`);
    }
    
    writeAllRelations(filtered);
  } catch (error) {
    throw new DataStorageError('delete relation', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Get relation by ID
 */
export function getRelationById(relationId: string): DataRelation | null {
  try {
    const relations = readAllRelations();
    return relations.find(r => r.id === relationId) || null;
  } catch (error) {
    throw new DataStorageError('get relation', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Get relations by source entity
 */
export function getRelationsBySource(sourceSchema: string, sourceId: string): DataRelation[] {
  try {
    const relations = readAllRelations();
    return relations.filter(r => r.sourceSchema === sourceSchema && r.sourceId === sourceId);
  } catch (error) {
    throw new DataStorageError('get relations by source', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Get relations by target entity
 */
export function getRelationsByTarget(targetSchema: string, targetId: string): DataRelation[] {
  try {
    const relations = readAllRelations();
    return relations.filter(r => r.targetSchema === targetSchema && r.targetId === targetId);
  } catch (error) {
    throw new DataStorageError('get relations by target', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Get relations by relation type
 */
export function getRelationsByType(relationTypeId: string): DataRelation[] {
  try {
    const relations = readAllRelations();
    return relations.filter(r => r.relationTypeId === relationTypeId);
  } catch (error) {
    throw new DataStorageError('get relations by type', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Get relations for a repeating section (by source, relation type, and optionally target schema)
 */
export function getRelationsForSection(
  sourceSchema: string,
  sourceId: string,
  relationTypeId: string,
  targetSchema?: string
): DataRelation[] {
  try {
    const relations = readAllRelations();
    return relations.filter(r => {
      const matches = r.sourceSchema === sourceSchema && 
                      r.sourceId === sourceId && 
                      r.relationTypeId === relationTypeId;
      
      if (targetSchema) {
        return matches && r.targetSchema === targetSchema;
      }
      
      return matches;
    });
  } catch (error) {
    throw new DataStorageError('get relations for section', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Delete relations by source entity
 */
export function deleteRelationsBySource(sourceSchema: string, sourceId: string): number {
  try {
    const relations = readAllRelations();
    const filtered = relations.filter(r => !(r.sourceSchema === sourceSchema && r.sourceId === sourceId));
    const deletedCount = relations.length - filtered.length;
    writeAllRelations(filtered);
    return deletedCount;
  } catch (error) {
    throw new DataStorageError('delete relations by source', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Delete relations by target entity
 */
export function deleteRelationsByTarget(targetSchema: string, targetId: string): number {
  try {
    const relations = readAllRelations();
    const filtered = relations.filter(r => !(r.targetSchema === targetSchema && r.targetId === targetId));
    const deletedCount = relations.length - filtered.length;
    writeAllRelations(filtered);
    return deletedCount;
  } catch (error) {
    throw new DataStorageError('delete relations by target', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Get relations by schema and id with direction support
 * @param schema Schema ID
 * @param id Entity ID
 * @param direction 'source' | 'target' | 'both' - default is 'both'
 * @param otherSchema Optional filter by the other schema (targetSchema for source relations, sourceSchema for target relations)
 */
export function getRelationsBySchemaAndId(
  schema: string,
  id: string,
  direction: 'source' | 'target' | 'both' = 'both',
  otherSchema?: string
): DataRelation[] {
  try {
    const relations = readAllRelations();
    let result: DataRelation[] = [];

    if (direction === 'source' || direction === 'both') {
      const sourceRelations = relations.filter(r => r.sourceSchema === schema && r.sourceId === id);
      result.push(...sourceRelations.map(r => ({ ...r, direction: 'source' as const })));
    }

    if (direction === 'target' || direction === 'both') {
      const targetRelations = relations.filter(r => r.targetSchema === schema && r.targetId === id);
      result.push(...targetRelations.map(r => ({ ...r, direction: 'target' as const })));
    }

    // Filter by other schema if provided
    // For source relations: filter by targetSchema
    // For target relations: filter by sourceSchema
    if (otherSchema) {
      result = result.filter(r => {
        if (r.direction === 'source') {
          return r.targetSchema === otherSchema;
        } else if (r.direction === 'target') {
          return r.sourceSchema === otherSchema;
        }
        // Fallback for relations without direction (backward compatibility)
        return r.targetSchema === otherSchema;
      });
    }

    return result;
  } catch (error) {
    throw new DataStorageError('get relations by schema and id', error instanceof Error ? error.message : 'Unknown error');
  }
}

