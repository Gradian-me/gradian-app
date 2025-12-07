'use client';

import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { sortOptions, SortType } from '@/gradian-ui/shared/utils/sort-utils';
import { extractItemsFromPayload, extractMetaFromPayload, mapRequestParams, ColumnMapConfig } from '@/gradian-ui/shared/utils/column-mapper';

export interface FetchOptionsParams {
  /**
   * Schema ID to fetch from (e.g., 'users', 'companies')
   */
  schemaId?: string;
  
  /**
   * URL to fetch from (alternative to schemaId)
   */
  sourceUrl?: string;
  
  /**
   * Query parameters to include in the request
   */
  queryParams?: Record<string, string | number | boolean | string[]>;
  
  /**
   * Transform function for sourceUrl responses
   */
  transform?: (data: any) => any[];
  
  /**
   * Column mapping for sourceUrl responses
   */
  columnMap?: ColumnMapConfig;
  
  /**
   * Sort order for results
   */
  sortType?: SortType;
  
  /**
   * Company ID to filter by (for schemaId requests)
   */
  companyId?: string | null;
  
  /**
   * Whether to filter by company (for schemaId requests)
   */
  filterByCompany?: boolean;
}

export interface FetchOptionsResult {
  /**
   * Array of fetched items
   */
  data: any[];
  
  /**
   * Pagination metadata (if available)
   */
  meta?: {
    page?: number;
    limit?: number;
    totalItems?: number;
    hasMore?: boolean;
  };
}

/**
 * Shared utility to fetch options from either a schemaId or sourceUrl
 * This is the core fetching logic used by both Select and PopupPicker
 */
export async function fetchOptionsFromSchemaOrUrl(
  params: FetchOptionsParams
): Promise<FetchOptionsResult> {
  const {
    schemaId,
    sourceUrl,
    queryParams = {},
    transform,
    columnMap,
    sortType = null,
    companyId,
    filterByCompany = true,
  } = params;

  // Prefer sourceUrl over schemaId if both are provided
  const useSourceUrl = Boolean(sourceUrl);
  const useSchemaId = Boolean(schemaId) && !useSourceUrl;

  if (!useSourceUrl && !useSchemaId) {
    throw new Error('Either schemaId or sourceUrl must be provided');
  }

  let data: any[] = [];
  let meta: FetchOptionsResult['meta'] = undefined;

  if (useSourceUrl) {
    // Fetch from sourceUrl
    // Convert queryParams to Record<string, string> for mapRequestParams
    // Extract 'id' parameter to add it last
    const stringParams: Record<string, string> = {};
    
    // Extract 'id' value first
    const idParam = queryParams.id;
    let idValue: string | undefined = undefined;
    if (idParam !== undefined) {
      if (Array.isArray(idParam)) {
        idValue = idParam.join(',');
      } else {
        idValue = String(idParam);
      }
    }
    
    // Process all other parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key !== 'id') {
        // Add all other parameters first
        if (Array.isArray(value)) {
          stringParams[key] = value.join(',');
        } else if (value !== undefined && value !== null) {
          stringParams[key] = String(value);
        }
      }
    });
    
    const mappedParams = mapRequestParams(stringParams, columnMap);
    
    // Add 'id' as the last parameter if it exists
    if (idValue !== undefined && idValue.length > 0) {
      mappedParams.set('id', idValue);
    }
    
    const queryString = mappedParams.toString();
    const separator = sourceUrl!.includes('?') ? '&' : '?';
    const url = `${sourceUrl}${queryString ? `${separator}${queryString}` : ''}`;

    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch items (${response.status})`);
    }

    const payload = await response.json();
    
    // Extract items using column mapping if provided
    data = extractItemsFromPayload(payload, columnMap);
    
    // Extract metadata if available
    meta = extractMetaFromPayload(payload, columnMap, {
      page: queryParams.page ? Number(queryParams.page) : undefined,
      limit: queryParams.limit ? Number(queryParams.limit) : undefined,
      totalItems: undefined,
      hasMore: undefined,
    });

    // Apply transform if provided
    if (transform) {
      data = transform(data);
    }
  } else if (useSchemaId) {
    // Fetch from schemaId
    const apiParams: Record<string, string> = {};
    
    // Add query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        apiParams[key] = value.join(',');
      } else if (value !== undefined && value !== null) {
        apiParams[key] = String(value);
      }
    });
    
    // Add company filter if enabled and company is selected
    if (filterByCompany && companyId) {
      apiParams.companyIds = companyId;
    }

    const response = await apiRequest<any[]>(`/api/data/${schemaId}`, { params: apiParams });

    if (!response.success || !Array.isArray(response.data)) {
      throw new Error(response.error || 'Failed to fetch items');
    }

    data = response.data;
    
    // Extract metadata from response if available
    const responseMeta = (response as { meta?: { page?: number; limit?: number; totalItems?: number; hasMore?: boolean } }).meta;
    if (responseMeta) {
      meta = responseMeta;
    } else if (queryParams.page || queryParams.limit) {
      // Infer metadata from query params if not provided
      meta = {
        page: queryParams.page ? Number(queryParams.page) : undefined,
        limit: queryParams.limit ? Number(queryParams.limit) : undefined,
      };
    }
  }

  // Sort data if sortType is specified
  if (sortType && data.length > 0) {
    data = sortOptions(data, sortType);
  }

  return {
    data,
    meta,
  };
}

