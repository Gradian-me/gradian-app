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
  includeStatistics?: boolean;
}

export function useSchemas(options?: UseSchemasOptions) {
  const { enabled, initialData, summary, includeStatistics } = options || {};
  const isSummary = summary === true;
  const includeStats = includeStatistics === true;
  const queryParams: Record<string, string> = {};
  if (isSummary) {
    queryParams.summary = 'true';
  }
  if (includeStats) {
    queryParams.includeStatistics = 'true';
  }
  const apiPath = '/api/schemas';
  const queryKey = isSummary 
    ? includeStats 
      ? [...SCHEMAS_SUMMARY_QUERY_KEY, 'with-statistics'] 
      : SCHEMAS_SUMMARY_QUERY_KEY 
    : SCHEMAS_QUERY_KEY;
  const cacheConfig = getCacheConfigByPath(apiPath);
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      console.log(`[REACT_QUERY] 🔄 Fetching ${isSummary ? 'schema summaries' : 'schemas'}${includeStats ? ' with statistics' : ''} from API...`);
      console.log(`[REACT_QUERY] Query params:`, queryParams);
      // Use /api/schemas directly (apiRequest will handle it correctly via resolveApiUrl)
      const response = await apiRequest<FormSchema[]>(apiPath, {
        params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        disableCache: false, // Use cache for better performance
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
      console.log(`[REACT_QUERY] ✅ Fetched ${list.length} ${isSummary ? 'schema summaries' : 'schemas'}${includeStats ? ' with statistics' : ''}${isSummary ? ' (no cache)' : ` - Caching for ${Math.round(cacheTime / 1000)}s`}`);
      return list;
    },
    enabled: enabled !== false,
    initialData,
    staleTime: cacheConfig.staleTime ?? 10 * 60 * 1000,
    gcTime: cacheConfig.gcTime ?? 30 * 60 * 1000,
    refetchOnMount: false, // Don't refetch on mount - only fetch once on initial load
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 1, // Only retry once on failure
    retryDelay: 1000, // Wait 1 second before retrying
    // Don't use placeholderData when query key changes - we want fresh data
    placeholderData: includeStats ? undefined : (previousData) => previousData,
  });

  return {
    schemas: data || [],
    isLoading,
    error,
    refetch,
  };
}

