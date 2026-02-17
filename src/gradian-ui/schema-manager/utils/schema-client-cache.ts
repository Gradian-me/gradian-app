'use client';

import type { QueryClient } from '@tanstack/react-query';
import type { FormSchema } from '../types/form-schema';
import { SCHEMAS_QUERY_KEY } from '../hooks/use-schemas';

interface CacheOptions {
  queryClient?: QueryClient;
  persist?: boolean;
}

/**
 * Persist a schema to IndexedDB and keep React Query caches in sync.
 */
export async function cacheSchemaClientSide(schema: FormSchema | null | undefined, options?: CacheOptions) {
  if (!schema || !schema.id) {
    return;
  }

  const { queryClient, persist = true } = options || {};

  if (queryClient) {
    queryClient.setQueryData<FormSchema>(['schemas', schema.id], schema);

    queryClient.setQueryData<FormSchema[]>(SCHEMAS_QUERY_KEY, (existing) => {
      if (!existing || existing.length === 0) {
        return [schema];
      }
      const index = existing.findIndex((item) => item.id === schema.id);
      if (index === -1) {
        return [...existing, schema];
      }
      const next = [...existing];
      next[index] = schema;
      return next;
    });
  }
}


