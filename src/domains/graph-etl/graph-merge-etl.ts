import { BaseRepository } from '@/gradian-ui/shared/domain/repositories/base.repository';

export type MergeColumnsQueryItem = {
  key?: string;
  hash?: string;
};

export type MergeColumnConfig = {
  keyColumns: string[];
  hashColumn?: string | null;
};

export type SchemaDiff = {
  toInsert: any[];
  toUpdate: Array<{ existing: any; source: any }>;
  toDeactivate: any[];
  skippedInvalidKey: number;
};

export type SchemaMergeSummary = {
  schemaId: string;
  inserted: number;
  updated: number;
  deactivated: number;
  skippedInvalidKey: number;
};

export type DemoMergeResult = {
  summaries: SchemaMergeSummary[];
};

export class InvalidMergeColumnsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMergeColumnsError';
  }
}

const MAX_MERGE_COLUMNS_LENGTH = 2000;

export function parseMergeColumns(raw: string | null): MergeColumnConfig {
  if (!raw) {
    throw new InvalidMergeColumnsError('mergeColumns query parameter is required');
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    throw new InvalidMergeColumnsError('mergeColumns query parameter must not be empty');
  }

  if (trimmed.length > MAX_MERGE_COLUMNS_LENGTH) {
    throw new InvalidMergeColumnsError('mergeColumns query parameter is too long');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new InvalidMergeColumnsError('mergeColumns must be a valid JSON array');
  }

  if (!Array.isArray(parsed)) {
    throw new InvalidMergeColumnsError('mergeColumns must be a JSON array');
  }

  const items = parsed as MergeColumnsQueryItem[];
  const keyColumns: string[] = [];
  let hashColumn: string | null | undefined;

  for (const item of items) {
    if (item && typeof item.key === 'string' && item.key.trim().length > 0) {
      keyColumns.push(item.key.trim());
    }
    if (!hashColumn && item && typeof item.hash === 'string' && item.hash.trim().length > 0) {
      hashColumn = item.hash.trim();
    }
  }

  if (keyColumns.length === 0) {
    throw new InvalidMergeColumnsError(
      'mergeColumns must contain at least one item with a non-empty "key" property',
    );
  }

  return {
    keyColumns,
    hashColumn: hashColumn ?? null,
  };
}

export function buildCompositeKey(
  record: Record<string, unknown> | null | undefined,
  config: MergeColumnConfig,
): string | null {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const parts: string[] = [];

  for (const column of config.keyColumns) {
    const value = (record as Record<string, unknown>)[column];
    if (value === undefined || value === null || value === '') {
      return null;
    }
    parts.push(String(value).trim());
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join('|');
}

export function computeSchemaDiff(params: {
  schemaId: string;
  sourceEntities: any[];
  targetEntities: any[];
  config: MergeColumnConfig;
}): SchemaDiff {
  const { sourceEntities, targetEntities, config } = params;

  const sourceByKey = new Map<string, any>();
  const targetByKey = new Map<string, any>();

  let skippedInvalidKey = 0;

  for (const entity of sourceEntities || []) {
    const key = buildCompositeKey(entity, config);
    if (!key) {
      skippedInvalidKey += 1;
      continue;
    }
    // Last one wins if duplicates exist in source
    sourceByKey.set(key, entity);
  }

  for (const entity of targetEntities || []) {
    const key = buildCompositeKey(entity, config);
    if (!key) {
      // Existing records without a valid key cannot be reliably merged; keep them as-is.
      continue;
    }
    targetByKey.set(key, entity);
  }

  const toInsert: any[] = [];
  const toUpdate: Array<{ existing: any; source: any }> = [];
  const toDeactivate: any[] = [];

  const normalizeHash = (value: unknown): string => {
    if (value === undefined || value === null) return '';
    return String(value);
  };

  // Determine inserts and updates
  for (const [key, source] of sourceByKey.entries()) {
    const existing = targetByKey.get(key);
    if (!existing) {
      toInsert.push(source);
      continue;
    }

    if (config.hashColumn) {
      const sourceHash = normalizeHash((source as any)[config.hashColumn]);
      const targetHash = normalizeHash((existing as any)[config.hashColumn]);
      if (sourceHash !== targetHash) {
        toUpdate.push({ existing, source });
      }
    } else {
      // Fallback: shallow compare non-system fields (excluding id/createdAt/updatedAt/inactive)
      const fieldsToCompare = Object.keys(source).filter(
        (field) =>
          !['id', 'createdAt', 'updatedAt', 'inactive', 'createdBy', 'updatedBy'].includes(field),
      );

      let changed = false;
      for (const field of fieldsToCompare) {
        const sourceValue = (source as any)[field];
        const targetValue = (existing as any)[field];
        if (JSON.stringify(sourceValue) !== JSON.stringify(targetValue)) {
          changed = true;
          break;
        }
      }

      if (changed) {
        toUpdate.push({ existing, source });
      }
    }
  }

  // Determine deactivations (present in target, missing in source)
  for (const [key, existing] of targetByKey.entries()) {
    if (!sourceByKey.has(key)) {
      toDeactivate.push(existing);
    }
  }

  return {
    toInsert,
    toUpdate,
    toDeactivate,
    skippedInvalidKey,
  };
}

export async function mergeGraphEntitiesDemo(params: {
  sourceBySchema: Record<string, any[]>;
  config: MergeColumnConfig;
}): Promise<DemoMergeResult> {
  const { sourceBySchema, config } = params;

  const summaries: SchemaMergeSummary[] = [];

  for (const [schemaId, sourceEntitiesRaw] of Object.entries(sourceBySchema)) {
    const sourceEntities = Array.isArray(sourceEntitiesRaw) ? sourceEntitiesRaw : [];

    const repository = new BaseRepository<any>(schemaId);
    const targetEntities = await repository.findAll();

    const diff = computeSchemaDiff({
      schemaId,
      sourceEntities,
      targetEntities,
      config,
    });

    let inserted = 0;
    let updated = 0;
    let deactivated = 0;

    // Inserts
    for (const source of diff.toInsert) {
      const { id, createdAt, updatedAt, createdBy, updatedBy, ...rest } = source || {};
      const payload = {
        ...rest,
        inactive: false,
      };

      await repository.create(payload);
      inserted += 1;
    }

    // Updates
    for (const { existing, source } of diff.toUpdate) {
      if (!existing || !existing.id) {
        continue;
      }

      const { id, createdAt, updatedAt, createdBy, updatedBy, ...rest } = source || {};
      const updatePatch = {
        ...rest,
        inactive: false,
      };

      await repository.update(String(existing.id), updatePatch);
      updated += 1;
    }

    // Deactivations
    for (const existing of diff.toDeactivate) {
      if (!existing || !existing.id) {
        continue;
      }

      await repository.update(String(existing.id), { inactive: true });
      deactivated += 1;
    }

    summaries.push({
      schemaId,
      inserted,
      updated,
      deactivated,
      skippedInvalidKey: diff.skippedInvalidKey,
    });
  }

  return { summaries };
}

export async function mergeGraphEntitiesBackend(): Promise<never> {
  // Placeholder for future backend integration (e.g., proxy to external ETL service)
  // For now, make it explicit that this path is not implemented.
  throw new Error('Graph merge is not implemented for backend mode yet.');
}

