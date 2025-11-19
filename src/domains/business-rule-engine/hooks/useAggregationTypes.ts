// Hook to fetch aggregation types from API

import { useQuery } from '@tanstack/react-query';

export interface AggregationType {
  id: string;
  name: string;
  title: string;
  symbol: string;
  color?: string;
  sqlEquivalent?: string;
  description?: string;
}

const AGGREGATION_TYPES_QUERY_KEY = ['business-rules', 'aggregation-types'] as const;

export function useAggregationTypes() {
  const { data: aggregationTypes = [], isLoading, error } = useQuery({
    queryKey: AGGREGATION_TYPES_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch('/api/data/aggregation-types');
      if (!response.ok) {
        throw new Error('Failed to fetch aggregation types');
      }

      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        // Transform API data to AggregationType format
        const transformedTypes: AggregationType[] = result.data.map((type: any) => ({
          id: type.id,
          name: type.name,
          title: type.title,
          symbol: type.symbol,
          color: type.color,
          sqlEquivalent: type.sqlEquivalent,
          description: type.description,
        }));
        return transformedTypes;
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
    aggregationTypes,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load aggregation types') : null,
  };
}

