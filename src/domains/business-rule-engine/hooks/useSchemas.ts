// Hook to fetch schemas from API

import { useQuery } from '@tanstack/react-query';
import { useTenantStore } from '@/stores/tenant.store';

export interface Schema {
  id: string;
  singular_name: string;
  plural_name: string;
  description?: string;
  fields?: Array<{
    id: string;
    name: string;
    label: string;
    type?: string;
    component?: string;
    description?: string;
    placeholder?: string;
    options?: Array<{ id?: string; label: string; value?: string; disabled?: boolean; icon?: string; color?: string }>;
  }>;
}

const SCHEMAS_QUERY_KEY = ['business-rules', 'schemas'] as const;

export function useSchemas() {
  const tenantId = useTenantStore((state) => state.getTenantId());
  const { data: schemas = [], isLoading, error, refetch } = useQuery({
    queryKey: [...SCHEMAS_QUERY_KEY, tenantId ? String(tenantId) : 'all-tenants'],
    queryFn: async () => {
      // Fetch full schemas (without summary) to get fields for conditions
      const tenantParam = tenantId ? `?tenantIds=${encodeURIComponent(String(tenantId))}` : '';
      const response = await fetch(`/api/schemas${tenantParam}`);
      if (!response.ok) {
        throw new Error('Failed to fetch schemas');
      }

      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        return result.data as Schema[];
      } else {
        throw new Error('Invalid response format');
      }
    },
    staleTime: 0, // Always consider data stale (but won't auto-refetch)
    gcTime: 0, // Don't cache in memory
    refetchOnMount: false, // Don't refetch on mount - use cached data if available
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });

  return {
    schemas,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load schemas') : null,
    refetch: () => refetch(),
  };
}

