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
  tenantIds?: string[] | string;
  callerName?: string;
}

export function useSchemas(options?: UseSchemasOptions) {
  const { enabled, initialData, summary, includeStatistics, tenantIds, callerName } = options || {};
  const isSummary = summary === true;
  const includeStats = includeStatistics === true;
  const queryParams: Record<string, string> = {};
  if (isSummary) {
    queryParams.summary = 'true';
  }
  if (includeStats) {
    queryParams.includeStatistics = 'true';
  }
  // Process tenantIds for query params and query key
  let normalizedTenantIds: string[] | undefined;
  let tenantIdsKey: string = 'all-tenants';
  if (tenantIds) {
    const idsArray = Array.isArray(tenantIds) ? tenantIds : [tenantIds];
    const cleaned = idsArray.map((id) => String(id).trim()).filter((id) => id.length > 0);
    if (cleaned.length > 0) {
      normalizedTenantIds = cleaned.sort(); // Sort for consistent query key
      tenantIdsKey = normalizedTenantIds.join(','); // Use sorted, comma-separated string for query key
      queryParams.tenantIds = tenantIdsKey;
    }
  }
  const apiPath = '/api/schemas';
  
  // Include tenantIds in query key to ensure different tenant filters get separate cache entries
  const queryKey = isSummary 
    ? includeStats 
      ? [...SCHEMAS_SUMMARY_QUERY_KEY, 'with-statistics', tenantIdsKey] 
      : [...SCHEMAS_SUMMARY_QUERY_KEY, tenantIdsKey]
    : [...SCHEMAS_QUERY_KEY, tenantIdsKey];
  const cacheConfig = getCacheConfigByPath(apiPath);
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      // Use /api/schemas directly (apiRequest will handle it correctly via resolveApiUrl)
      const response = await apiRequest<FormSchema[]>(apiPath, {
        params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        disableCache: true, // Force network to make call visible and fresh
        callerName,
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
      return list;
    },
    enabled: enabled !== false,
    initialData,
    staleTime: 0, // always stale so a network fetch occurs (visible in DevTools)
    gcTime: cacheConfig.gcTime ?? 30 * 60 * 1000,
    refetchOnMount: true, // ensure network call on mount
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

