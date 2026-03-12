'use client';

/**
 * Client-side schema cache backed by IndexedDB.
 *
 * Behaviour:
 * - Namespace: "schemas" (one entry per schemaId).
 * - Read flow:
 *    1) Try IndexedDB first.
 *    2) On miss, call `/api/schemas/[schema-id]`.
 *       - The API route already decides between demo JSON vs live backend.
 *    3) If API returns a schema, store it back into IndexedDB.
 * - Clear flow:
 *    - `clearClientSchemaCache` only clears the client IndexedDB namespace (per-schema).
 *    - `clearSchemaCacheEverywhere` clears server-side + client IndexedDB (schemas + schemas-summary).
 */

import type { FormSchema } from '../types/form-schema';
import { clearSchemasSummaryCache } from '@/gradian-ui/indexdb-manager/schemas-summary-cache';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import {
  createIndexedDbStore,
  type IndexedDbStore,
} from '@/gradian-ui/shared/utils/indexdb-utils';

// Dedicated IndexedDB "collection" for schemas
const schemaIndexedDbStore: IndexedDbStore<FormSchema> = createIndexedDbStore<FormSchema>({
  namespace: 'schemas',
  encryptData: true,
});

// Batch queue for single-ID callers so multiple getSchemaWithClientCache()
// invocations within the same tick are aggregated into ONE
// /api/schemas?includedSchemaIds=... request instead of N separate calls.
const pendingSchemaIds = new Set<string>();
const pendingResolvers = new Map<string, Array<(schema: FormSchema | null) => void>>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;

function queueSchemaBatchFetch() {
  if (batchTimer !== null) return;

  batchTimer = setTimeout(async () => {
    batchTimer = null;
    const ids = Array.from(pendingSchemaIds);
    pendingSchemaIds.clear();

    if (ids.length === 0) {
      return;
    }

    try {
      // Use the existing batched helper which:
      // - Checks IndexedDB per id
      // - Issues a single /api/schemas?includedSchemaIds=... for all misses
      // - Persists results back to IndexedDB
      const loaded = await getSchemasWithClientCache(ids);
      const byId = new Map<string, FormSchema>();
      loaded.forEach((schema) => {
        if (schema?.id) {
          byId.set(schema.id, schema);
        }
      });

      ids.forEach((id) => {
        const resolvers = pendingResolvers.get(id) || [];
        const schema = byId.get(id) ?? null;
        resolvers.forEach((resolve) => resolve(schema));
        pendingResolvers.delete(id);
      });
    } catch (error) {
      ids.forEach((id) => {
        const resolvers = pendingResolvers.get(id) || [];
        resolvers.forEach((resolve) => resolve(null));
        pendingResolvers.delete(id);
      });
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[client-schema-cache] Batched schema fetch failed:', error);
      }
    }
  }, 0);
}

/**
 * Get a schema by ID using client-side IndexedDB cache first,
 * then falling back to the batched helper on miss.
 *
 * Multiple callers within the same tick are aggregated into ONE
 * /api/schemas?includedSchemaIds=... request.
 */
export async function getSchemaWithClientCache(schemaId: string): Promise<FormSchema | null> {
  if (!schemaId) {
    return null;
  }

  // 1) Try IndexedDB first
  const cached = await schemaIndexedDbStore.get(schemaId);
  if (cached) {
    return cached;
  }

  // 2) Queue for batched fetch
  return new Promise<FormSchema | null>((resolve) => {
    pendingSchemaIds.add(schemaId);
    const existing = pendingResolvers.get(schemaId) || [];
    existing.push(resolve);
    pendingResolvers.set(schemaId, existing);
    queueSchemaBatchFetch();
  });
}

/**
 * Get multiple schemas in one API call (IndexedDB first for each, then one request for missing).
 * Use this when preloading schemas for relation tables (e.g. Tender Items, Tender Invitations)
 * so all required schemas are loaded with a single network request.
 *
 * - For each requested ID: if in IndexedDB, use it; otherwise add to "missing" list.
 * - If any missing: GET /api/schemas?includedSchemaIds=id1,id2,id3
 * - Persist each returned schema to IndexedDB; return all (cached + fetched).
 */
export async function getSchemasWithClientCache(schemaIds: string[]): Promise<FormSchema[]> {
  const ids = Array.from(new Set(schemaIds)).filter(Boolean);
  if (ids.length === 0) {
    return [];
  }

  const results: FormSchema[] = [];
  const byId = new Map<string, FormSchema>();
  const missingIds: string[] = [];

  for (const id of ids) {
    const cached = await schemaIndexedDbStore.get(id);
    if (cached) {
      byId.set(id, cached);
      results.push(cached);
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length > 0) {
    const encoded = missingIds.map((id) => encodeURIComponent(id)).join(',');
    const response = await apiRequest<FormSchema[]>(`/api/schemas?includedSchemaIds=${encoded}`);
    if (response.success && Array.isArray(response.data)) {
      for (const schema of response.data) {
        if (schema?.id) {
          byId.set(schema.id, schema);
          if (!results.some((s) => s.id === schema.id)) {
            results.push(schema);
          }
          try {
            await schemaIndexedDbStore.set(schema.id, schema);
          } catch (persistError) {
            if (typeof console !== 'undefined' && console.warn) {
              console.warn(`[client-schema-cache] Failed to persist schema "${schema.id}" to IndexedDB:`, persistError);
            }
          }
        }
      }
    }
  }

  return ids.map((id) => byId.get(id)!).filter(Boolean);
}

/**
 * Store or update a schema in client-side IndexedDB cache.
 * Useful after client-side edits where you already have the schema object.
 */
export async function setSchemaInClientCache(schema: FormSchema): Promise<boolean> {
  if (!schema?.id) {
    return false;
  }
  return schemaIndexedDbStore.set(schema.id, schema);
}

/**
 * Clear only the client-side IndexedDB schema cache (namespace "schemas").
 * Does NOT touch server-side caches.
 */
export async function clearClientSchemaCache(): Promise<void> {
  await schemaIndexedDbStore.clear();
}

/**
 * Clear schema cache both on the server (via /api/schemas/clear-cache)
 * and on the client (IndexedDB "schemas" namespace).
 *
 * This can be hooked into your existing "Clear cache" buttons instead of
 * calling the API directly.
 */
export async function clearSchemaCacheEverywhere(): Promise<{ success: boolean }> {
  try {
    const response = await fetch('/api/schemas/clear-cache', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Clear client IndexedDB caches regardless of server response.
    await clearClientSchemaCache();
    await clearSchemasSummaryCache();

    if (!response.ok) {
      return { success: false };
    }

    return { success: true };
  } catch {
    await clearClientSchemaCache();
    await clearSchemasSummaryCache();
    return { success: false };
  }
}

