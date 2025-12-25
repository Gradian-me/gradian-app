'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { normalizeOptionArray, NormalizedOption } from '../utils/option-normalizer';
import { ColumnMapConfig } from '@/gradian-ui/shared/utils/column-mapper';
import { extractItemsFromPayload } from '@/gradian-ui/shared/utils/column-mapper';

export interface UseOptionsFromUrlOptions {
  /**
   * URL to fetch options from
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
   * Query parameters to append to the URL
   */
  queryParams?: Record<string, string | number | boolean | string[]>;
  
  /**
   * Column mapping configuration for API requests
   */
  columnMap?: ColumnMapConfig;
}

export interface UseOptionsFromUrlResult {
  /**
   * Normalized options from the URL
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
 * Hook to fetch options from a URL and normalize them
 * 
 * @example
 * ```tsx
 * const { options, isLoading, error } = useOptionsFromUrl({
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
export function useOptionsFromUrl({
  sourceUrl,
  enabled = true,
  transform,
  queryParams,
  columnMap,
}: UseOptionsFromUrlOptions): UseOptionsFromUrlResult {
  const [options, setOptions] = useState<NormalizedOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = useCallback(async () => {
    if (!sourceUrl || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build URL with query parameters
      // Ensure 'id' parameter is added last
      let url = sourceUrl;
      if (queryParams && Object.keys(queryParams).length > 0) {
        const params = new URLSearchParams();
        let idValue: string | string[] | undefined = undefined;
        
        Object.entries(queryParams).forEach(([key, value]) => {
          if (key === 'id') {
            // Store id to add it last
            if (Array.isArray(value)) {
              idValue = value.map(v => String(v));
            } else if (value !== undefined && value !== null) {
              idValue = String(value);
            }
          } else {
            // Add all other parameters first
            if (Array.isArray(value)) {
              value.forEach(v => params.append(key, String(v)));
            } else if (value !== undefined && value !== null) {
              params.append(key, String(value));
            }
          }
        });
        
        // Add 'id' as the last parameter if it exists
        if (idValue !== undefined && idValue !== null) {
          if (Array.isArray(idValue)) {
            (idValue as string[]).forEach((v: string) => params.append('id', v));
          } else if (typeof idValue === 'string') {
            params.append('id', idValue);
          }
        }
        
        const separator = sourceUrl.includes('?') ? '&' : '?';
        url = `${sourceUrl}${separator}${params.toString()}`;
      }

      const response = await apiRequest<any>(url, { disableCache: true });

      if (response.success && (response.data || columnMap)) {
        // Extract items using column mapping if provided
        // When columnMap is used, pass the full response object so paths like 'data.0.data' can navigate correctly
        // When columnMap is not used, extractItemsFromPayload will fall back to response.data
        let data = columnMap 
          ? extractItemsFromPayload(response, columnMap)
          : (response.data || []);

        // Transform data if transform function is provided
        if (transform) {
          data = transform(data);
        } else {
          // Default transform: assume array of objects with id, label, name, or title
          data = (Array.isArray(data) ? data : []).map((item: any) => {
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
      } else {
        setError(response.error || 'Failed to fetch options');
        setOptions([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch options';
      setError(errorMessage);
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [sourceUrl, enabled, queryParams, columnMap]);

  useEffect(() => {
    // Only fetch if we have a valid sourceUrl and fetching is enabled
    // Important: This effect will trigger when sourceUrl changes from undefined/null to a valid URL
    // This is crucial for reference-based filtering where the URL is built dynamically
    if (sourceUrl && enabled) {
      void fetchOptions();
    } else if (!sourceUrl) {
      // Clear options only if we don't have a sourceUrl (not just when disabled)
      // This prevents clearing options when sourceUrl is temporarily undefined during context initialization
      setOptions([]);
      setError(null);
      setIsLoading(false);
    }
  }, [sourceUrl, enabled, fetchOptions]);

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

