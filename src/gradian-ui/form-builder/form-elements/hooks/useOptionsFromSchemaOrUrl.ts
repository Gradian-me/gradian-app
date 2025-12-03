'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { normalizeOptionArray, NormalizedOption } from '../utils/option-normalizer';
import { SortType } from '@/gradian-ui/shared/utils/sort-utils';
import { useCompanyStore } from '@/stores/company.store';
import { fetchOptionsFromSchemaOrUrl } from '../utils/fetch-options-utils';

export interface UseOptionsFromSchemaOrUrlOptions {
  /**
   * Schema ID to fetch options from (e.g., 'users', 'companies')
   * If provided, will fetch from /api/data/{schemaId}
   */
  schemaId?: string;
  
  /**
   * URL to fetch options from (alternative to schemaId)
   * If both schemaId and sourceUrl are provided, sourceUrl takes precedence
   */
  sourceUrl?: string;
  
  /**
   * Whether to enable fetching
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Transform function to convert API response to option format
   * If not provided, assumes response is an array of objects with id, label, name, or title
   */
  transform?: (data: any) => Array<{ id?: string; label?: string; name?: string; title?: string; icon?: string; color?: string; disabled?: boolean; value?: string }>;
  
  /**
   * Query parameters to append to the URL (for sourceUrl) or API request (for schemaId)
   */
  queryParams?: Record<string, string | number | boolean | string[]>;
  
  /**
   * Sort order for options: 'ASC' (ascending), 'DESC' (descending), or null (no sorting, default)
   */
  sortType?: SortType;
  
  /**
   * Whether to filter by company (only applies when using schemaId)
   * @default true (auto-detected based on schema)
   */
  filterByCompany?: boolean;
}

export interface UseOptionsFromSchemaOrUrlResult {
  /**
   * Normalized options from the schema or URL
   */
  options: NormalizedOption[];
  
  /**
   * Whether options are currently being fetched
   */
  isLoading: boolean;
  
  /**
   * Error message if fetch failed
   */
  error: string | null;
  
  /**
   * Function to refetch options
   */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch options from either a schema ID or a URL and normalize them
 * 
 * @example
 * ```tsx
 * // Fetch from schema
 * const { options, isLoading, error } = useOptionsFromSchemaOrUrl({
 *   schemaId: 'users',
 *   sortType: 'ASC',
 * });
 * 
 * // Fetch from URL
 * const { options, isLoading, error } = useOptionsFromSchemaOrUrl({
 *   sourceUrl: '/api/schemas',
 *   transform: (data) => data.map(item => ({
 *     id: item.id,
 *     label: item.name || item.title,
 *     icon: item.icon,
 *     color: item.color,
 *   })),
 * });
 * ```
 */
export function useOptionsFromSchemaOrUrl({
  schemaId,
  sourceUrl,
  enabled = true,
  transform,
  queryParams,
  sortType = null,
  filterByCompany = true,
}: UseOptionsFromSchemaOrUrlOptions): UseOptionsFromSchemaOrUrlResult {
  const [options, setOptions] = useState<NormalizedOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const activeCompanyId = selectedCompany && selectedCompany.id !== -1 ? String(selectedCompany.id) : null;

  const fetchOptions = useCallback(async () => {
    if ((!sourceUrl && !schemaId) || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use shared utility function
      const result = await fetchOptionsFromSchemaOrUrl({
        schemaId,
        sourceUrl,
        queryParams,
        sortType,
        companyId: activeCompanyId,
        filterByCompany,
      });

      let data = result.data;

      // Transform data if transform function is provided
      if (transform) {
        data = transform(data);
      } else {
        // Default transform: assume array of objects with id, label, name, or title
        data = data.map((item: any) => {
          const id = item.id ?? item.value ?? String(item._id ?? '');
          const label = item.label ?? item.name ?? item.title ?? item.singular_name ?? item.plural_name ?? id;
          return {
            id: String(id),
            label: String(label),
            icon: item.icon,
            color: item.color,
            disabled: item.disabled,
            value: item.value ?? id,
          };
        });
      }

      // Normalize options
      const normalized = normalizeOptionArray(data);
      setOptions(normalized);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch options';
      setError(errorMessage);
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [sourceUrl, schemaId, enabled, queryParams, transform, sortType, filterByCompany, activeCompanyId]);

  useEffect(() => {
    if ((sourceUrl || schemaId) && enabled) {
      void fetchOptions();
    } else {
      setOptions([]);
      setError(null);
      setIsLoading(false);
    }
  }, [sourceUrl, schemaId, enabled, fetchOptions]);

  const normalizedOptions = useMemo(() => {
    return options.map(opt => ({
      ...opt,
      label: opt.label ?? opt.id,
    }));
  }, [options]);

  return {
    options: normalizedOptions,
    isLoading,
    error,
    refetch: fetchOptions,
  };
}

