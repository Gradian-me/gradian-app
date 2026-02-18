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

/**
 * Get a schema by ID using client-side IndexedDB cache first,
 * then falling back to `/api/schemas/[schema-id]` on miss.
 *
 * The API route itself will:
 * - Use demo JSON when DEMO_MODE=true.
 * - Proxy to live backend when DEMO_MODE=false.
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

  // 2) Fallback to API route (handles demo vs live internally)
  const response = await apiRequest<FormSchema>(`/api/schemas/${encodeURIComponent(schemaId)}`);
  if (!response.success || !response.data) {
    return null;
  }

  const schema = response.data;

  // 3) Store in IndexedDB for future requests (best-effort)
  void schemaIndexedDbStore.set(schema.id, schema);

  return schema;
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

