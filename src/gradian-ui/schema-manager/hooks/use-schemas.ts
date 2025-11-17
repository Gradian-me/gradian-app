'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { FormSchema } from '../types/form-schema';
import { getCacheConfigByPath } from '@/gradian-ui/shared/configs/cache-config';

export const SCHEMAS_QUERY_KEY = ['schemas'] as const;
export const SCHEMAS_SUMMARY_QUERY_KEY = ['schemas-summary'] as const;

/**
 * Hook to fetch schemas with client-side caching using React Query
 * This deduplicates requests and shares cache across all components
 * Uses the QueryClient from QueryClientProvider context automatically
 */
interface UseSchemasOptions {
  enabled?: boolean;
  initialData?: FormSchema[];
  summary?: boolean;
}

export function useSchemas(options?: UseSchemasOptions) {
  const { enabled, initialData, summary } = options || {};
  const isSummary = summary === true;
  const apiPath = isSummary ? '/api/schemas?summary=true' : '/api/schemas';
  const queryKey = isSummary ? SCHEMAS_SUMMARY_QUERY_KEY : SCHEMAS_QUERY_KEY;
  const cacheConfig = getCacheConfigByPath(apiPath);
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      console.log(`[REACT_QUERY] 🔄 Fetching ${isSummary ? 'schema summaries' : 'schemas'} from API...`);
      // Use /api/schemas directly (apiRequest will handle it correctly via resolveApiUrl)
      // Add cache-busting parameter for summary requests to ensure fresh data
      const apiPathWithCacheBust = isSummary 
        ? `${apiPath}${apiPath.includes('?') ? '&' : '?'}cacheBust=${Date.now()}`
        : apiPath;
      const response = await apiRequest<FormSchema[]>(apiPathWithCacheBust, {
        disableCache: isSummary, // Disable IndexedDB cache for summary requests
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch schemas');
      }
      const normalizeSchemas = (raw: any): FormSchema[] => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw.data)) return raw.data;
        if (typeof raw === 'object') {
          return Object.values(raw) as FormSchema[];
        }
        return [];
      };

      const list = normalizeSchemas(response.data);
      const cacheTime = cacheConfig.staleTime ?? 10 * 60 * 1000;
      console.log(`[REACT_QUERY] ✅ Fetched ${list.length} ${isSummary ? 'schema summaries' : 'schemas'}${isSummary ? ' (no cache)' : ` - Caching for ${Math.round(cacheTime / 1000)}s`}`);
      return list;
    },
    enabled: enabled !== false,
    initialData,
    staleTime: cacheConfig.staleTime ?? 10 * 60 * 1000,
    gcTime: cacheConfig.gcTime ?? 30 * 60 * 1000,
    refetchOnMount: isSummary ? true : false, // Always refetch on mount for summary requests
    refetchOnWindowFocus: isSummary ? true : false, // Always refetch on window focus for summary requests
    refetchOnReconnect: isSummary ? true : false, // Always refetch on reconnect for summary requests
    retry: 1, // Only retry once on failure
    retryDelay: 1000, // Wait 1 second before retrying
    placeholderData: (previousData) => previousData, // Use previous data as placeholder
  });

  return {
    schemas: data || [],
    isLoading,
    error,
    refetch,
  };
}

