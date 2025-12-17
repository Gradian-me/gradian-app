'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { FormSchema } from '../types/form-schema';
import { getCacheConfigByPath } from '@/gradian-ui/shared/configs/cache-config';
import { cacheSchemaClientSide } from '../utils/schema-client-cache';

/**
 * Hook to fetch a single schema by ID with client-side caching using React Query
 * This deduplicates requests and shares cache across all components
 * Uses the QueryClient from QueryClientProvider context automatically
 */
export function useSchemaById(
  schemaId: string | null | undefined, 
  options?: { enabled?: boolean; initialData?: FormSchema }
) {
  // Get cache configuration for /api/schemas/:id route
  const cacheConfig = getCacheConfigByPath(`/api/schemas/${schemaId || ''}`);
  const queryClient = useQueryClient();
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['schemas', schemaId],
    queryFn: async () => {
      if (!schemaId) {
        throw new Error('Schema ID is required');
      }
      // Add cache-busting timestamp to ensure fresh data
      const timestamp = Date.now();
      const response = await apiRequest<FormSchema>(`/api/schemas/${schemaId}?_t=${timestamp}`, {
        disableCache: true, // Disable IndexedDB cache for this request
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch schema');
      }
      await cacheSchemaClientSide(response.data, { queryClient, persist: false });
      return response.data;
    },
    enabled: options?.enabled !== false && !!schemaId,
    initialData: options?.initialData, // Populate cache with initial data (e.g., from SSR)
    staleTime: 0, // Always consider data stale to allow fresh fetches
    gcTime: cacheConfig.gcTime ?? 30 * 60 * 1000,
    refetchOnMount: false, // Don't auto-refetch on mount - let the component control when to fetch
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 2, // Retry twice on failure
    retryDelay: 1000, // Wait 1 second before retrying
  });

  return {
    schema: data || null,
    isLoading,
    error,
    refetch,
  };
}

