'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getInitials } from '@/gradian-ui/data-display/utils';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { cn } from '@/gradian-ui/shared/utils';
import { UI_PARAMS } from '@/gradian-ui/shared/constants/application-variables';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, List, Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getArrayValuesByRole, getFieldsByRole, getSingleValueByRole, getValueByRole } from '../utils/field-resolver';
import { Avatar } from './Avatar';
import { CodeBadge } from './CodeBadge';
import { SearchInput } from './SearchInput';
import { normalizeOptionArray, normalizeOptionEntry, NormalizedOption } from '../utils/option-normalizer';
import { BadgeOption, getBadgeMetadata } from '../utils/badge-utils';
import { renderHighlightedText } from '@/gradian-ui/shared/utils/highlighter';
import { formatFieldValue, getFieldValue } from '@/gradian-ui/data-display/table/utils/field-formatters';
import { cacheSchemaClientSide } from '@/gradian-ui/schema-manager/utils/schema-client-cache';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { AddButtonFull } from './AddButtonFull';
import { EndLine } from '@/gradian-ui/layout';
import { ColumnMapConfig, extractItemsFromPayload, extractMetaFromPayload, mapRequestParams } from '@/gradian-ui/shared/utils/column-mapper';
import { useCompanyStore } from '@/stores/company.store';
import { sortOptions, SortType } from '@/gradian-ui/shared/utils/sort-utils';
import { buildHierarchyTree, getAncestorIds, HierarchyNode } from '@/gradian-ui/schema-manager/utils/hierarchy-utils';
import { FormModal } from '@/gradian-ui/form-builder/components/FormModal';
import { Plus } from 'lucide-react';

const cardVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.99 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      delay: Math.min(index * UI_PARAMS.CARD_INDEX_DELAY.STEP * 0.7, UI_PARAMS.CARD_INDEX_DELAY.MAX * 0.7),
    },
  }),
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.99,
    transition: {
      duration: 0.18,
    },
  },
};

interface PendingSelection {
  action: 'add' | 'remove';
  normalized?: NormalizedOption | null;
  raw?: any | null;
}

const COMPANY_REQUIRED_MESSAGE = 'Please select a company to view these records.';

const normalizeIdList = (ids?: Array<string | number>): string[] =>
  (ids ?? []).map((id) => String(id));

const buildIdsKey = (ids?: Array<string | number>): string => {
  const normalized = normalizeIdList(ids);
  if (normalized.length === 0) {
    return '';
  }
  return normalized.slice().sort().join('|');
};

// Helper function to get value by role from sourceColumnRoles
const getValueByRoleFromSourceColumns = (
  item: any,
  role: string,
  sourceColumnRoles?: Array<{ column: string; role?: string }>
): any => {
  if (!sourceColumnRoles || !item) {
    return undefined;
  }

  const roleMapping = sourceColumnRoles.find(mapping => mapping.role === role);
  if (roleMapping && item[roleMapping.column] !== undefined) {
    return item[roleMapping.column];
  }

  // If no explicit role mapping, try to find by column name matching common patterns
  if (role === 'title') {
    const titleColumn = sourceColumnRoles.find(m => m.column === 'singular_name' || m.column === 'name' || m.column === 'title');
    if (titleColumn && item[titleColumn.column] !== undefined) {
      return item[titleColumn.column];
    }
  }

  return undefined;
};

const buildSelectionEntry = (
  item: any,
  schema?: FormSchema | null,
  sourceColumnRoles?: Array<{ column: string; role?: string }>
): NormalizedOption => {
  if (!item) {
    return {
      id: '',
      label: '',
    };
  }

  const baseId = item.id ? String(item.id) : '';

  // Extract metadata from fields with addToReferenceMetadata: true
  const extractMetadata = (item: any, schema?: FormSchema | null): Record<string, any> | undefined => {
    if (!schema || !schema.fields) {
      return undefined;
    }

    const metadataFields = schema.fields.filter(field => field.addToReferenceMetadata === true);
    if (metadataFields.length === 0) {
      return undefined;
    }

    const metadata: Record<string, any> = {};
    metadataFields.forEach(field => {
      const fieldName = field.name;
      if (fieldName && item[fieldName] !== undefined && item[fieldName] !== null) {
        metadata[fieldName] = item[fieldName];
      }
    });

    return Object.keys(metadata).length > 0 ? metadata : undefined;
  };

  if (!schema) {
    // Use sourceColumnRoles if available
    if (sourceColumnRoles) {
      const title = getValueByRoleFromSourceColumns(item, 'title', sourceColumnRoles) || 
                    item.label || item.name || item.title || item.singular_name || baseId;
      const description = getValueByRoleFromSourceColumns(item, 'description', sourceColumnRoles) || 
                          item.description;
      const icon = getValueByRoleFromSourceColumns(item, 'icon', sourceColumnRoles) || item.icon;
      const color = getValueByRoleFromSourceColumns(item, 'color', sourceColumnRoles) || 
                    getValueByRoleFromSourceColumns(item, 'status', sourceColumnRoles) || 
                    item.color;

      return {
        id: baseId,
        label: title || baseId,
        icon,
        color,
        description,
        metadata: description ? { description } : undefined,
      };
    }

    const fallbackLabel = item.label || item.name || item.title || item.singular_name || baseId;
    return {
      id: baseId,
      label: fallbackLabel || baseId,
      icon: item.icon,
      color: item.color,
      metadata: extractMetadata(item, schema),
    };
  }

  const title = getValueByRole(schema, item, 'title') || item.name || item.title || baseId;
  const icon = getSingleValueByRole(schema, item, 'icon') || item.icon;

  let color: string | undefined;
  const statusValue = getSingleValueByRole(schema, item, 'status') ?? item.status;
  if (statusValue) {
    const statusField = schema.fields?.find(field => field.role === 'status');
    const statusOptions = statusField?.options;
    if (statusOptions) {
      const statusMeta = getBadgeMetadata(statusValue, statusOptions as BadgeOption[]);
      color = statusMeta.color;
    }
  }

  const metadata = extractMetadata(item, schema);

  const normalized = normalizeOptionEntry({
    id: baseId,
    label: title || baseId,
    icon,
    color,
    metadata,
  });

  return normalized || { id: baseId, label: title || baseId, icon, color, metadata };
};

export interface PopupPickerProps {
  isOpen: boolean;
  onClose: () => void;
  schemaId?: string;
  sourceUrl?: string;
  schema?: FormSchema;
  onSelect: (selections: NormalizedOption[], rawItems: any[]) => Promise<void> | void;
  title?: string;
  description?: string;
  excludeIds?: string[]; // IDs to exclude from selection (already selected items)
  includeIds?: string[]; // IDs to include in selection (only show these items)
  selectedIds?: string[]; // IDs of items that are already selected (will be shown with distinct styling)
  canViewList?: boolean; // If true, shows a button to navigate to the list page
  viewListUrl?: string; // Custom URL for the list page (defaults to /page/{schemaId})
  allowMultiselect?: boolean; // Enables multi-select mode with confirm button
  columnMap?: ColumnMapConfig; // Optional mapping for request/response and item fields
  staticItems?: any[]; // Optional dataset (skips API calls when provided)
  pageSize?: number; // Page size for paginated data sources
  sortType?: 'ASC' | 'DESC' | null; // Sort order for items (null = no sorting, default)
  sourceColumnRoles?: Array<{ column: string; role?: string }>; // Column to role mapping for sourceUrl items
  showAddButton?: boolean; // If true, shows an "Add Item" button that opens the schema form
}

export const PopupPicker: React.FC<PopupPickerProps> = ({
  isOpen,
  onClose,
  schemaId,
  sourceUrl,
  schema: providedSchema,
  onSelect,
  title,
  description,
  excludeIds = [],
  includeIds,
  selectedIds = [],
  canViewList = false,
  viewListUrl,
  allowMultiselect = false,
  columnMap,
  staticItems,
  pageSize = 48,
  sortType = null,
  sourceColumnRoles,
  showAddButton = true,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Hardcoded config for schemas picker
  const SCHEMAS_PICKER_CONFIG = {
    sourceUrl: '/api/schemas?summary=true',
    sourceColumnRoles: [
      { column: 'singular_name', role: 'title' },
      { column: 'description', role: 'description' },
      { column: 'icon', role: 'icon' },
      { column: 'color', role: 'color' },
    ],
  };

  // Override sourceUrl and sourceColumnRoles when schemaId is "schemas"
  const effectiveSourceUrl = schemaId === 'schemas' ? SCHEMAS_PICKER_CONFIG.sourceUrl : sourceUrl;
  const effectiveSourceColumnRoles = schemaId === 'schemas' ? SCHEMAS_PICKER_CONFIG.sourceColumnRoles : sourceColumnRoles;

  const [schema, setSchema] = useState<FormSchema | null>(providedSchema || null);
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionSelectedIds, setSessionSelectedIds] = useState<Set<string>>(new Set());
  const [pendingSelections, setPendingSelections] = useState<Map<string, PendingSelection>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const effectivePageSize = Math.max(1, pageSize);
  const [pageMeta, setPageMeta] = useState({
    page: 1,
    limit: effectivePageSize,
    totalItems: 0,
    hasMore: true,
  });
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const activeCompanyId = selectedCompany && selectedCompany.id !== -1 ? String(selectedCompany.id) : null;
  // When using hardcoded schemas config, don't use schema-based logic
  const effectiveSchema = useMemo(() => {
    if (schemaId === 'schemas' && effectiveSourceUrl) {
      return null;
    }
    return schema ?? providedSchema ?? null;
  }, [schema, providedSchema, schemaId, effectiveSourceUrl]);
  const isHierarchical = Boolean(effectiveSchema?.allowHierarchicalParent);
  const shouldFilterByCompany = useMemo(() => {
    if (effectiveSchema) {
      return effectiveSchema.id !== 'companies' && effectiveSchema.isNotCompanyBased !== true;
    }
    if (schemaId && schemaId !== 'companies') {
      return true;
    }
    return false;
  }, [effectiveSchema, schemaId]);
  const companyQueryParam = shouldFilterByCompany && activeCompanyId ? activeCompanyId : null;
  const companyKey = useMemo(() => {
    if (!shouldFilterByCompany) {
      return '__company_not_required__';
    }
    return companyQueryParam ?? '__missing_company__';
  }, [shouldFilterByCompany, companyQueryParam]);

  const baseSelectedIdsRef = useRef<Set<string>>(new Set());
  const baseSelectedIds = baseSelectedIdsRef.current;
  const listContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const supportsPagination = Boolean((effectiveSourceUrl || schemaId) && !staticItems);
  const includeKey = useMemo(() => (includeIds && includeIds.length > 0 ? includeIds.slice().sort().join(',') : ''), [includeIds]);
  const excludeKey = useMemo(() => (excludeIds && excludeIds.length > 0 ? excludeIds.slice().sort().join(',') : ''), [excludeIds]);
  const lastQueryKeyRef = useRef<string>('__init__');
  const hasInitialLoadRef = useRef<boolean>(false);
  const isRefreshingRef = useRef<boolean>(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPageMeta((prev) => ({
      ...prev,
      limit: effectivePageSize,
    }));
  }, [effectivePageSize]);

  // Use refs to track previous array values for comparison
  const prevExcludeIdsRef = useRef<string>('');
  const prevIncludeIdsRef = useRef<string>('');
  const prevSelectedIdsKeyRef = useRef<string>('');
  const prevCompanyKeyRef = useRef<string>('');

  // Fetch schema if not provided (skip if using effectiveSourceUrl for schemas)
  useEffect(() => {
    // Don't fetch schema if we're using the hardcoded schemas config
    if (schemaId === 'schemas' && effectiveSourceUrl) {
      setSchema(null);
      return;
    }
    
    if (!staticItems && !effectiveSourceUrl && !providedSchema && schemaId && isOpen) {
      const fetchSchema = async () => {
        try {
          const response = await apiRequest<FormSchema>(`/api/schemas/${schemaId}`);
          if (response.success && response.data) {
            await cacheSchemaClientSide(response.data, { queryClient, persist: false });
            setSchema(response.data);
          }
        } catch (err) {
          console.error('Error fetching schema:', err);
        }
      };
      fetchSchema();
    } else if (providedSchema) {
      setSchema(providedSchema);
    }
  }, [schemaId, providedSchema, isOpen, queryClient, effectiveSourceUrl]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setItems([]);
      setFilteredItems([]);
      setSearchQuery('');
      setError(null);
      setPendingSelections(new Map());
      setSessionSelectedIds(new Set(baseSelectedIdsRef.current));
    }
  }, [isOpen]);

  useEffect(() => {
    const nextKey = buildIdsKey(selectedIds);
    if (nextKey === prevSelectedIdsKeyRef.current) {
      return;
    }
    prevSelectedIdsKeyRef.current = nextKey;
    const normalized = new Set(normalizeIdList(selectedIds));
    baseSelectedIdsRef.current = normalized;
    setSessionSelectedIds(new Set(normalized));
    setPendingSelections(new Map());
  }, [selectedIds]);

  const buildSourceRequestUrl = useCallback(
    (pageToLoad: number, forceRefresh = false) => {
      if (!effectiveSourceUrl) {
        return '';
      }
      const paramRecord: Record<string, string> = {
        page: pageToLoad.toString(),
        limit: effectivePageSize.toString(),
      };
      const trimmedSearch = searchQuery.trim();
      if (trimmedSearch) {
        paramRecord.search = trimmedSearch;
      }
      if (includeIds && includeIds.length > 0) {
        paramRecord.includeIds = includeIds.join(',');
      }
      if (excludeIds && excludeIds.length > 0) {
        paramRecord.excludeIds = excludeIds.join(',');
      }
      if (companyQueryParam) {
        paramRecord.companyIds = companyQueryParam;
      }
      // Add cache-busting parameter for refresh
      if (forceRefresh) {
        paramRecord._t = Date.now().toString();
      }
      const params = mapRequestParams(paramRecord, columnMap);
      const queryString = params.toString();
      
      // Always use relative URLs so requests go through Next.js API routes
      // The API routes will check isDemoModeEnabled() and proxy to backend if needed
      // This centralizes the proxying logic in the API routes
      const separator = effectiveSourceUrl.includes('?') ? '&' : '?';
      return `${effectiveSourceUrl}${queryString ? `${separator}${queryString}` : ''}`;
    },
    [effectiveSourceUrl, effectivePageSize, searchQuery, includeIds, excludeIds, columnMap, companyQueryParam]
  );

  const fetchSourceItems = useCallback(
    async (pageToLoad = 1, append = false, forceRefresh = false) => {
      if (!effectiveSourceUrl) {
        return;
      }
      if (shouldFilterByCompany && !companyQueryParam) {
        setError(COMPANY_REQUIRED_MESSAGE);
        if (!append) {
          setItems([]);
          setFilteredItems([]);
        }
        return;
      }
      setError(null);
      if (pageToLoad === 1) {
        setIsLoading(true);
      } else {
        setIsFetchingMore(true);
      }
      try {
        const requestUrl = buildSourceRequestUrl(pageToLoad, forceRefresh);
        const response = await fetch(requestUrl, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed to fetch items (${response.status})`);
        }
        const payload = await response.json();
        const dataArray = extractItemsFromPayload(payload, columnMap);
        const sortedArray = sortOptions(dataArray, sortType);
        setItems((prev) => (append ? [...prev, ...sortedArray] : sortedArray));
        setFilteredItems((prev) => (append ? [...prev, ...sortedArray] : sortedArray));
        setPageMeta((prev) => {
          const mappedMeta = extractMetaFromPayload(payload, columnMap, {
            page: pageToLoad,
            limit: effectivePageSize,
            totalItems: append ? (prev.totalItems || prev.page * prev.limit) + dataArray.length : dataArray.length,
            hasMore: undefined,
          });
          const nextLimit = mappedMeta.limit ?? effectivePageSize;
          const nextPage = mappedMeta.page ?? pageToLoad;
          const nextTotal = mappedMeta.totalItems ?? (append ? (prev.totalItems || prev.page * prev.limit) + dataArray.length : dataArray.length);
          const derivedHasMore = typeof mappedMeta.hasMore === 'boolean' ? mappedMeta.hasMore : nextPage * nextLimit < nextTotal;
          return {
            page: nextPage,
            limit: nextLimit,
            totalItems: nextTotal,
            hasMore: Boolean(derivedHasMore),
          };
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch items');
        if (!append) {
          setItems([]);
          setFilteredItems([]);
          setPageMeta((prev) => ({
            ...prev,
            page: 1,
            hasMore: false,
            totalItems: 0,
          }));
        }
      } finally {
        if (pageToLoad === 1) {
          setIsLoading(false);
        } else {
          setIsFetchingMore(false);
        }
      }
    },
    [buildSourceRequestUrl, effectivePageSize, effectiveSourceUrl, columnMap, shouldFilterByCompany, companyQueryParam, sortType]
  );

  const fetchSchemaItems = useCallback(
    async (pageToLoad = 1, append = false, forceRefresh = false) => {
      if (!schemaId) {
        return;
      }
      if (shouldFilterByCompany && !companyQueryParam) {
        setError(COMPANY_REQUIRED_MESSAGE);
        if (!append) {
          setItems([]);
          setFilteredItems([]);
        }
        return;
      }
      setError(null);
      if (pageToLoad === 1) {
        setIsLoading(true);
      } else {
        setIsFetchingMore(true);
      }
      try {
        const params: Record<string, string> = {
          page: pageToLoad.toString(),
          limit: effectivePageSize.toString(),
        };
        const trimmedSearch = searchQuery.trim();
        if (trimmedSearch) {
          params.search = trimmedSearch;
        }
        if (includeIds && includeIds.length > 0) {
          params.includeIds = includeIds.join(',');
        }
        if (excludeIds && excludeIds.length > 0) {
          params.excludeIds = excludeIds.join(',');
        }
        if (companyQueryParam) {
          params.companyIds = companyQueryParam;
        }
        // Add cache-busting parameter for refresh
        if (forceRefresh) {
          params._t = Date.now().toString();
        }

        // Always use apiRequest which goes through Next.js API routes
        // The API routes will check isDemoModeEnabled() and proxy to backend if needed
        const response = await apiRequest<any>(`/api/data/${schemaId}`, { params });

        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(response.error || 'Failed to fetch items');
        }

        const dataArray = response.data;
        const sortedArray = sortOptions(dataArray, sortType);
        setItems((prev) => (append ? [...prev, ...sortedArray] : sortedArray));
        setFilteredItems((prev) => (append ? [...prev, ...sortedArray] : sortedArray));

        setPageMeta((prev) => {
          const meta = (response as { meta?: { page?: number; limit?: number; totalItems?: number; hasMore?: boolean } }).meta;
          const nextLimit = meta?.limit ?? effectivePageSize;
          const nextPage = meta?.page ?? pageToLoad;
          const nextTotal =
            meta?.totalItems ??
            (append ? (prev.totalItems || prev.page * prev.limit) + dataArray.length : dataArray.length);
          const derivedHasMore =
            typeof meta?.hasMore === 'boolean' ? meta.hasMore : nextPage * nextLimit < nextTotal;
          return {
            page: nextPage,
            limit: nextLimit,
            totalItems: nextTotal,
            hasMore: Boolean(derivedHasMore),
          };
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch items');
        if (!append) {
          setItems([]);
          setFilteredItems([]);
          setPageMeta((prev) => ({
            ...prev,
            page: 1,
            hasMore: false,
            totalItems: 0,
          }));
        }
      } finally {
        if (pageToLoad === 1) {
          setIsLoading(false);
        } else {
          setIsFetchingMore(false);
        }
      }
    },
    [schemaId, effectivePageSize, searchQuery, includeIds, excludeIds, shouldFilterByCompany, companyQueryParam, sortType]
  );

  const loadItems = useCallback(
    async (pageToLoad = 1, append = false) => {
      if (effectiveSourceUrl) {
        await fetchSourceItems(pageToLoad, append);
        return;
      }
      if (supportsPagination && schemaId) {
        await fetchSchemaItems(pageToLoad, append);
        return;
      }

      if (!staticItems && shouldFilterByCompany && !companyQueryParam) {
        setError(COMPANY_REQUIRED_MESSAGE);
        setItems([]);
        setFilteredItems([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        if (staticItems) {
          const sortedStaticItems = sortOptions(staticItems, sortType);
          setItems(sortedStaticItems);
          setFilteredItems(sortedStaticItems);
          return;
        }

        // Build query params
        const queryParams = new URLSearchParams();

        if (includeIds && includeIds.length > 0) {
          queryParams.append('includeIds', includeIds.join(','));
        }

        if (excludeIds && excludeIds.length > 0) {
          queryParams.append('excludeIds', excludeIds.join(','));
        }

        if (companyQueryParam) {
          queryParams.append('companyIds', companyQueryParam);
        }

        const queryString = queryParams.toString();
        const relativeUrl = `/api/data/${schemaId}${queryString ? `?${queryString}` : ''}`;
        
        // Always use apiRequest which goes through Next.js API routes
        // The API routes will check isDemoModeEnabled() and proxy to backend if needed
        const response = await apiRequest<any[]>(relativeUrl);

        if (response.success && response.data) {
          const itemsArray = Array.isArray(response.data) ? response.data : [];
          const sortedArray = sortOptions(itemsArray, sortType);
          setItems(sortedArray);
          setFilteredItems(sortedArray);
        } else {
          setError(response.error || 'Failed to fetch items');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch items');
      } finally {
        setIsLoading(false);
      }
    },
    [effectiveSourceUrl, fetchSourceItems, fetchSchemaItems, supportsPagination, schemaId, staticItems, includeIds, excludeIds, shouldFilterByCompany, companyQueryParam, sortType]
  );

  // Keep items in sync when static dataset changes or when modal opens
  useEffect(() => {
    if (!staticItems) {
      return;
    }
    if (isOpen) {
      const sortedStaticItems = sortOptions(staticItems, sortType);
      setItems(sortedStaticItems);
      setFilteredItems(sortedStaticItems);
    }
  }, [staticItems, isOpen, sortType]);

  // Ensure initial load on open for paginated sources (schema or sourceUrl)
  useEffect(() => {
    if (!isOpen || !supportsPagination) {
      hasInitialLoadRef.current = false;
      return;
    }
    // Don't run if we're currently refreshing (handleRefresh will handle the fetch)
    if (isRefreshingRef.current) {
      return;
    }
    if (hasInitialLoadRef.current) {
      return;
    }
    setPageMeta((prev) => ({ ...prev, page: 1, hasMore: true, totalItems: 0 }));
    lastQueryKeyRef.current = `${searchQuery.trim()}|${includeKey}|${excludeKey}|${companyKey}`;
    hasInitialLoadRef.current = true;
    void loadItems(1, false);
  }, [isOpen, supportsPagination, includeKey, excludeKey, searchQuery, loadItems, companyKey]);

  // Fetch items - only when modal opens (skipped for static datasets)
  // Array comparisons are done inside the effect to avoid dependency issues
  useEffect(() => {
    if (!isOpen || staticItems || supportsPagination) {
      return;
    }

    // Convert arrays to strings for comparison (compute inside effect to avoid dependency issues)
    const excludeIdsKey = excludeIds && excludeIds.length > 0 
      ? JSON.stringify(excludeIds.slice().sort())
      : '';
    const includeIdsKey = includeIds && includeIds.length > 0
      ? JSON.stringify(includeIds.slice().sort())
      : '';

    // Check if arrays have actually changed (by content, not reference)
    const excludeIdsChanged = excludeIdsKey !== prevExcludeIdsRef.current;
    const includeIdsChanged = includeIdsKey !== prevIncludeIdsRef.current;

    // Only fetch if this is the first time opening OR if arrays have changed
    const companyKeyChanged = companyKey !== prevCompanyKeyRef.current;
    const shouldFetch =
      prevExcludeIdsRef.current === '' ||
      prevIncludeIdsRef.current === '' ||
      prevCompanyKeyRef.current === '' ||
      excludeIdsChanged ||
      includeIdsChanged ||
      companyKeyChanged;

    if (!shouldFetch) {
      return;
    }

    // Update refs with current values
    prevExcludeIdsRef.current = excludeIdsKey;
    prevIncludeIdsRef.current = includeIdsKey;
    prevCompanyKeyRef.current = companyKey;

    void loadItems();
    // Note: excludeIds and includeIds are intentionally not in dependencies
    // We compare them inside the effect using refs to avoid infinite loops
  }, [schemaId, isOpen, staticItems, effectiveSourceUrl, loadItems, companyKey]);
  const handleRefresh = async (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (staticItems) {
      const sortedStaticItems = sortOptions(staticItems, sortType);
      setItems(sortedStaticItems);
      setFilteredItems(sortedStaticItems);
      return;
    }
    
    // Set refreshing flag to prevent useEffect from triggering duplicate requests
    isRefreshingRef.current = true;
    
    // Clear items to show loading state
    setItems([]);
    setFilteredItems([]);
    setError(null);
    
    // Reset query key to ensure reload happens (before setting loading state)
    lastQueryKeyRef.current = '';
    
    try {
      if (supportsPagination) {
        // Reset pagination state
        setPageMeta((prev) => ({ ...prev, page: 1, hasMore: true, totalItems: 0 }));
        
        // Directly call the appropriate fetch function with forceRefresh flag
        if (effectiveSourceUrl) {
          await fetchSourceItems(1, false, true);
        } else if (schemaId) {
          await fetchSchemaItems(1, false, true);
        }
      } else {
        // For non-paginated sources, we need to add cache-busting to loadItems
        // Build query params with cache-busting
        const queryParams = new URLSearchParams();
        if (includeIds && includeIds.length > 0) {
          queryParams.append('includeIds', includeIds.join(','));
        }
        if (excludeIds && excludeIds.length > 0) {
          queryParams.append('excludeIds', excludeIds.join(','));
        }
        if (companyQueryParam) {
          queryParams.append('companyIds', companyQueryParam);
        }
        queryParams.append('_t', Date.now().toString()); // Cache-busting
        
        const queryString = queryParams.toString();
        const relativeUrl = `/api/data/${schemaId}${queryString ? `?${queryString}` : ''}`;
        
        setIsLoading(true);
        setError(null);
        try {
          // Always use apiRequest which goes through Next.js API routes
          // The API routes will check isDemoModeEnabled() and proxy to backend if needed
          const response = await apiRequest<any[]>(relativeUrl);

          if (response.success && response.data) {
            const itemsArray = Array.isArray(response.data) ? response.data : [];
            const sortedArray = sortOptions(itemsArray, sortType);
            setItems(sortedArray);
            setFilteredItems(sortedArray);
          } else {
            setError(response.error || 'Failed to fetch items');
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch items');
        } finally {
          setIsLoading(false);
        }
      }
    } finally {
      // Clear refreshing flag after fetch completes
      isRefreshingRef.current = false;
    }
  };

  const handleLoadMore = useCallback(() => {
    if (!supportsPagination || isLoading || isFetchingMore || !pageMeta.hasMore) {
      return;
    }
    void loadItems(pageMeta.page + 1, true);
  }, [supportsPagination, isLoading, isFetchingMore, pageMeta.hasMore, pageMeta.page, loadItems]);

  useEffect(() => {
    if (!isOpen || !supportsPagination) {
      return;
    }
    const trimmed = searchQuery.trim();
    const queryKey = `${trimmed}|${includeKey}|${excludeKey}|${companyKey}`;
    if (queryKey === lastQueryKeyRef.current) {
      return;
    }
    const handler = setTimeout(() => {
      lastQueryKeyRef.current = queryKey;
      setPageMeta((prev) => ({
        ...prev,
        page: 1,
        hasMore: true,
        totalItems: 0,
      }));
      void loadItems(1, false);
    }, 250);
    return () => clearTimeout(handler);
  }, [isOpen, supportsPagination, searchQuery, includeKey, excludeKey, loadItems, companyKey]);

  useEffect(() => {
    if (supportsPagination) {
      return;
    }

    if (!searchQuery.trim()) {
      const sortedItems = sortOptions(items, sortType);
      setFilteredItems(sortedItems);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = items.filter((item) => {
      if (!effectiveSchema) {
        if (effectiveSourceColumnRoles) {
          const title = getValueByRoleFromSourceColumns(item, 'title', effectiveSourceColumnRoles) ||
                        item.name || item.title || item.singular_name || '';
          const subtitle = getValueByRoleFromSourceColumns(item, 'subtitle', effectiveSourceColumnRoles) ||
                           item.email || item.subtitle || '';
          const description = getValueByRoleFromSourceColumns(item, 'description', effectiveSourceColumnRoles) ||
                              item.description || '';
          return title.toLowerCase().includes(query) ||
                 subtitle.toLowerCase().includes(query) ||
                 description.toLowerCase().includes(query);
        }
        const title = item.name || item.title || item.singular_name || '';
        const subtitle = item.email || item.subtitle || '';
        return title.toLowerCase().includes(query) || subtitle.toLowerCase().includes(query);
      }

      const title = getValueByRole(effectiveSchema, item, 'title') || item.name || '';
      const subtitle = getSingleValueByRole(effectiveSchema, item, 'subtitle', item.email) || item.email || '';
      return title.toLowerCase().includes(query) || subtitle.toLowerCase().includes(query);
    });

    const sortedFiltered = sortOptions(filtered, sortType);
    setFilteredItems(sortedFiltered);
  }, [supportsPagination, searchQuery, items, effectiveSchema, sortType, effectiveSourceColumnRoles]);

  useEffect(() => {
    if (!supportsPagination || !isOpen) {
      return;
    }
    const target = loadMoreTriggerRef.current;
    if (!target) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && pageMeta.hasMore && !isLoading && !isFetchingMore) {
          void loadItems(pageMeta.page + 1, true);
        }
      },
      {
        root: listContainerRef.current,
        threshold: 0.25,
      }
    );

    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [supportsPagination, isOpen, pageMeta.hasMore, pageMeta.page, isLoading, isFetchingMore, loadItems]);

  const commitSingleSelection = async (item: any) => {
    if (isSubmitting) return;
    try {
      if (item.id) {
        setSessionSelectedIds((prev) => new Set([...prev, String(item.id)]));
      }
      const selectionEntry = buildSelectionEntry(item, effectiveSchema, effectiveSourceColumnRoles);
      await onSelect([selectionEntry], [item]);
      onClose();
    } catch (error) {
      console.error('Error in commitSingleSelection:', error);
    }
  };

  const toggleSelection = (item: any) => {
    if (isSubmitting) {
      return;
    }

    if (!allowMultiselect) {
      void commitSingleSelection(item);
      return;
    }

    const itemId = String(item?.id ?? '');
    if (!itemId) {
      return;
    }

    const currentlySelected = sessionSelectedIds.has(itemId);
    const nextSelected = !currentlySelected;

    setSessionSelectedIds((prevIds) => {
      const updated = new Set(prevIds);
      if (nextSelected) {
        updated.add(itemId);
      } else {
        updated.delete(itemId);
      }
      return updated;
    });

    setPendingSelections((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      const selectionEntry = buildSelectionEntry(item, effectiveSchema, effectiveSourceColumnRoles);
      const isBaseSelection = baseSelectedIds.has(itemId);

      if (nextSelected) {
        // Selecting item
        if (isBaseSelection && existing?.action === 'remove') {
          next.delete(itemId);
        } else if (!isBaseSelection) {
          next.set(itemId, { action: 'add', normalized: selectionEntry, raw: item });
        } else {
          // Base item re-selected without pending removal - no change needed
          next.delete(itemId);
        }
      } else {
        // Deselecting item
        if (existing?.action === 'add') {
          next.delete(itemId);
        } else if (isBaseSelection) {
          next.set(itemId, { action: 'remove', normalized: selectionEntry, raw: item });
        } else {
          next.delete(itemId);
        }
      }

      return next;
    });

  };

  const buildSelectionData = (id: string): { normalized: NormalizedOption; raw: any } => {
    const pendingEntry = pendingSelections.get(id);
    if (pendingEntry && pendingEntry.action === 'add' && pendingEntry.normalized) {
      return {
        normalized: pendingEntry.normalized,
        raw: pendingEntry.raw ?? { id },
      };
    }

    const match = items.find((candidate) => String(candidate?.id ?? '') === id);
    if (match) {
      return {
        normalized: buildSelectionEntry(match, schema, effectiveSourceColumnRoles),
        raw: match,
      };
    }

    return {
      normalized: {
        id,
        label: id,
      },
      raw: { id },
    };
  };

  const handleClearSelection = () => {
    if (isSubmitting) {
      return;
    }

    if (!allowMultiselect) {
      return;
    }

    setSessionSelectedIds(new Set());
    setPendingSelections(() => {
      const next = new Map<string, PendingSelection>();
      baseSelectedIds.forEach((id) => {
        next.set(id, { action: 'remove' });
      });
      return next;
    });
  };

  const handleConfirmSelections = async () => {
    if (!allowMultiselect) {
      return;
    }

    let hasChanges = false;
    pendingSelections.forEach((entry) => {
      if (entry && (entry.action === 'add' || entry.action === 'remove')) {
        hasChanges = true;
      }
    });

    if (!hasChanges) {
      return;
    }
    setIsSubmitting(true);
    try {
      const finalSelectionIds = Array.from(sessionSelectedIds);
      const normalizedSelections: NormalizedOption[] = [];
      const rawSelections: any[] = [];

      finalSelectionIds.forEach((id) => {
        const data = buildSelectionData(id);
        normalizedSelections.push(data.normalized);
        rawSelections.push(data.raw);
      });

      await onSelect(normalizedSelections, rawSelections);
      setPendingSelections(new Map());
      onClose();
    } catch (error) {
      console.error('Error confirming selections:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingStats = useMemo(() => {
    let additions = 0;
    let removals = 0;
    pendingSelections.forEach((entry) => {
      if (!entry) return;
      if (entry.action === 'add') additions += 1;
      if (entry.action === 'remove') removals += 1;
    });
    return { additions, removals };
  }, [pendingSelections]);

  const hasPendingSelections = pendingStats.additions + pendingStats.removals > 0;
  const selectedCount = sessionSelectedIds.size;

  // Check if an item is selected
  const isItemSelected = (item: any): boolean => {
    const itemId = String(item.id || '');
    return sessionSelectedIds.has(itemId);
  };

  const handleViewList = () => {
    const url = viewListUrl || `/page/${schemaId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAddItemSuccess = async (createdEntity: any) => {
    if (!createdEntity?.id) {
      setIsAddModalOpen(false);
      return;
    }

    const newItemId = String(createdEntity.id);
    setIsAddModalOpen(false);
    
    // Add the created item to items and filteredItems immediately so it's available for selection
    setItems((prev) => {
      // Check if item already exists
      const exists = prev.some(item => String(item.id) === newItemId);
      if (exists) {
        return prev;
      }
      // Add to beginning of list
      return [createdEntity, ...prev];
    });
    
    setFilteredItems((prev) => {
      // Check if item already exists
      const exists = prev.some(item => String(item.id) === newItemId);
      if (exists) {
        return prev;
      }
      // Add to beginning of list
      return [createdEntity, ...prev];
    });
    
    // Now select the item
    if (allowMultiselect) {
      // For multiselect, add to session selection and update pending selections
      setSessionSelectedIds((prev) => new Set([...prev, newItemId]));
      
      // Build selection entry and add to pending selections
      const selectionEntry = buildSelectionEntry(createdEntity, effectiveSchema, effectiveSourceColumnRoles);
      setPendingSelections((prev) => {
        const next = new Map(prev);
        // Only add if it's not already in base selections
        if (!baseSelectedIds.has(newItemId)) {
          next.set(newItemId, { action: 'add', normalized: selectionEntry, raw: createdEntity });
        }
        return next;
      });
    } else {
      // For single select, immediately commit the selection
      void commitSingleSelection(createdEntity);
    }
    
    // Refresh the picker data in the background to get the full item data
    // This ensures the item has all its fields populated
    void handleRefresh();
  };

  const renderItemCard = (item: any, index: number) => {
    const isSelected = isItemSelected(item);

    const baseCardClasses = "relative p-3 rounded-xl border cursor-pointer transition-all duration-200 group";
    const selectedCardClasses = "border-violet-500 dark:border-violet-400 bg-gradient-to-br from-gray-100 via-white to-violet-100 dark:from-gray-900 dark:via-gray-800 dark:to-violet-900 shadow-lg ring-1 ring-violet-200 dark:ring-violet-800";
    const defaultCardClasses = "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700/50";

    const motionProps = {
      layout: true,
      variants: cardVariants,
      initial: 'hidden',
      animate: 'visible',
      exit: 'exit',
      custom: index,
    } as const;

    const highlightQuery = searchQuery.trim();

    if (!effectiveSchema) {
      // Fallback rendering with sourceColumnRoles support
      const displayName = effectiveSourceColumnRoles
        ? getValueByRoleFromSourceColumns(item, 'title', effectiveSourceColumnRoles) || 
          item.name || item.title || item.singular_name || item.id || `Item ${index + 1}`
        : item.name || item.title || item.id || `Item ${index + 1}`;
      const iconName = effectiveSourceColumnRoles
        ? getValueByRoleFromSourceColumns(item, 'icon', effectiveSourceColumnRoles) || item.icon
        : item.icon || item.name || item.title;
      const description = effectiveSourceColumnRoles
        ? getValueByRoleFromSourceColumns(item, 'description', effectiveSourceColumnRoles)
        : undefined;
      
      return (
        <motion.div key={item.id || index} {...motionProps}>
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleSelection(item);
            }}
            className={cn(
              baseCardClasses,
              isSelected ? selectedCardClasses : defaultCardClasses
            )}
          >
            <div className="flex items-center gap-3">
              {iconName && (
                <div className="h-10 w-10 rounded-lg bg-violet-50 dark:bg-gray-700 text-violet-600 dark:text-violet-300 flex items-center justify-center">
                  <IconRenderer iconName={iconName} className="h-5 w-5" />
                </div>
              )}
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "font-medium text-sm",
                  isSelected ? "text-violet-900 dark:text-violet-100" : "text-gray-900 dark:text-gray-100"
                )}
              >
                {renderHighlightedText(displayName, highlightQuery)}
              </div>
              {description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {renderHighlightedText(description, highlightQuery)}
                </p>
              )}
            </div>
            </div>
          </div>
        </motion.div>
      );
    }

    // Extract data using schema roles
    const title = getValueByRole(effectiveSchema, item, 'title') || item.name || `Item ${index + 1}`;
    const subtitle = getSingleValueByRole(effectiveSchema, item, 'subtitle', item.email) || item.email || '';
    const avatarField = getSingleValueByRole(effectiveSchema, item, 'avatar', item.name) || item.name || '?';
    // Get badge fields
    const badgeFields = getFieldsByRole(effectiveSchema, 'badge');
    const allOptions = new Map<string, NormalizedOption>();
    let combinedBadgeField: any = null;

    badgeFields.forEach(field => {
      const value = item[field.name];
      const normalizedValue = normalizeOptionArray(value);
      if (field.options && Array.isArray(field.options)) {
        normalizeOptionArray(field.options).forEach((opt) => {
          if (!allOptions.has(opt.id)) {
            allOptions.set(opt.id, opt);
          }
        });
      }
      if (!combinedBadgeField && field) {
        combinedBadgeField = { ...field, options: Array.from(allOptions.values()) };
      }
    });

    if (combinedBadgeField && allOptions.size > 0) {
      combinedBadgeField.options = Array.from(allOptions.values());
    }

    // Find status field options
    const statusFieldDef = effectiveSchema?.fields?.find(f => f.role === 'status');
    const ratingFieldDef = effectiveSchema?.fields?.find(f => f.role === 'rating');
    const hasCodeField = effectiveSchema?.fields?.some(f => f.role === 'code') || false;
    const codeField = getSingleValueByRole(effectiveSchema, item, 'code');
    const statusFieldValue = statusFieldDef ? getFieldValue(statusFieldDef, item) : null;
    const ratingFieldValue = ratingFieldDef ? getFieldValue(ratingFieldDef, item) : null;
    const statusFieldNode = statusFieldDef ? formatFieldValue(statusFieldDef, statusFieldValue, item) : null;
    const ratingFieldNode = ratingFieldDef ? formatFieldValue(ratingFieldDef, ratingFieldValue, item) : null;

    return (
      <motion.div key={item.id || index} {...motionProps}>
        <div
          onClick={() => toggleSelection(item)}
          className={cn(
            baseCardClasses,
            isSelected ? selectedCardClasses : defaultCardClasses
          )}
        >
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <Avatar
              fallback={getInitials(avatarField)}
              size="md"
              variant="primary"
              className={cn(
                "border shrink-0 transition-colors",
                isSelected
                  ? "border-violet-400"
                  : "border-gray-200"
              )}
            >
              {getInitials(avatarField)}
            </Avatar>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4
                      className={cn(
                        "text-sm font-semibold truncate transition-colors flex-1 min-w-0",
                        isSelected
                          ? "text-violet-900 dark:text-violet-100"
                          : "text-gray-900 dark:text-gray-100 group-hover:text-violet-700 dark:group-hover:text-violet-300"
                      )}
                    >
                      {renderHighlightedText(title, highlightQuery)}
                    </h4>
                    {/* Code Badge */}
                    {hasCodeField && codeField && (
                      <CodeBadge code={codeField} />
                    )}
                  </div>
                  {subtitle && subtitle.trim() && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {renderHighlightedText(subtitle, highlightQuery)}
                    </p>
                  )}

                </div>

                {/* Rating and Status - Only render if at least one exists */}
                {(ratingFieldNode || statusFieldNode) && (
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {ratingFieldNode && <div className="flex items-center gap-1">{ratingFieldNode}</div>}
                    {statusFieldNode && <div className="flex items-center gap-1">{statusFieldNode}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const schemaName = schema?.plural_name || schema?.singular_name || schemaId;

  // Hierarchy helpers (used when schema.allowHierarchicalParent is true)
  const { roots: hierarchyRoots, nodeMap: hierarchyNodeMap } = useMemo(() => {
    if (!isHierarchical) {
      return { roots: [] as HierarchyNode[], nodeMap: new Map<string, HierarchyNode>() };
    }
    return buildHierarchyTree(filteredItems || []);
  }, [isHierarchical, filteredItems]);

  const handleHierarchyToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleHierarchyExpandAll = useCallback(() => {
    const allIds = new Set<string>();
    hierarchyNodeMap.forEach((node) => {
      if (node.children.length > 0) {
        allIds.add(node.id);
      }
    });
    setExpandedIds(allIds);
  }, [hierarchyNodeMap]);

  const handleHierarchyCollapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  // Auto-expand ancestors of matches when searching
  useEffect(() => {
    if (!isHierarchical) return;
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return;

    const matches = new Set<string>();
    hierarchyNodeMap.forEach((node) => {
      const data = node.entity;
      const candidateFields: any[] = [];
      if (effectiveSchema) {
        candidateFields.push(
          getValueByRole(effectiveSchema, data, 'title'),
          getSingleValueByRole(effectiveSchema, data, 'subtitle', data.email)
        );
      } else if (effectiveSourceColumnRoles) {
        candidateFields.push(
          getValueByRoleFromSourceColumns(data, 'title', effectiveSourceColumnRoles),
          getValueByRoleFromSourceColumns(data, 'subtitle', effectiveSourceColumnRoles),
          getValueByRoleFromSourceColumns(data, 'description', effectiveSourceColumnRoles)
        );
      }
      candidateFields.push(data.name, data.title, data.singular_name, data.email, data.description);

      if (
        candidateFields.some(
          (val) => typeof val === 'string' && val.toLowerCase().includes(normalized)
        )
      ) {
        matches.add(node.id);
      }
    });

    if (matches.size > 0) {
      const nextExpanded = new Set<string>();
      matches.forEach((id) => {
        const ancestors = getAncestorIds(hierarchyNodeMap, id);
        ancestors.forEach((ancestorId) => nextExpanded.add(ancestorId));
      });
      setExpandedIds((prev) => {
        const merged = new Set(prev);
        nextExpanded.forEach((id) => merged.add(id));
        return merged;
      });
    }
  }, [isHierarchical, searchQuery, hierarchyNodeMap, effectiveSchema, effectiveSourceColumnRoles]);

  // When search is cleared in hierarchical mode, collapse all
  useEffect(() => {
    if (!isHierarchical) return;
    if (!searchQuery.trim()) {
      setExpandedIds(new Set());
    }
  }, [isHierarchical, searchQuery]);

  const renderHierarchyNode = (node: HierarchyNode, depth: number, index: number) => {
    const item = node.entity;
    const isSelected = isItemSelected(item);
    const highlightQuery = searchQuery.trim();

    const baseCardClasses = 'relative h-full p-3 rounded-xl border cursor-pointer transition-all duration-200 group';
    const selectedCardClasses =
      'border-violet-500 dark:border-violet-400 bg-gradient-to-br from-gray-100 via-white to-violet-100 dark:from-gray-900 dark:via-gray-800 dark:to-violet-900 shadow-lg ring-1 ring-violet-200 dark:ring-violet-800';
    const defaultCardClasses =
      'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700/50';

    const motionProps = {
      layout: true,
      variants: cardVariants,
      initial: 'hidden',
      animate: 'visible',
      exit: 'exit',
      custom: index,
    } as const;

    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);

    if (!effectiveSchema) {
      // Fallback rendering with sourceColumnRoles support
      const displayName = effectiveSourceColumnRoles
        ? getValueByRoleFromSourceColumns(item, 'title', effectiveSourceColumnRoles) || 
          item.name || item.title || item.singular_name || item.id || `Item ${index + 1}`
        : item.name || item.title || item.id || `Item ${index + 1}`;
      const iconName = effectiveSourceColumnRoles
        ? getValueByRoleFromSourceColumns(item, 'icon', effectiveSourceColumnRoles) || item.icon
        : item.icon || item.name || item.title;
      const description = effectiveSourceColumnRoles
        ? getValueByRoleFromSourceColumns(item, 'description', effectiveSourceColumnRoles)
        : undefined;
      
      return (
        <motion.div key={item.id || index} {...motionProps} style={{ marginLeft: depth * 16 }}>
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleSelection(item);
            }}
            className={cn(baseCardClasses, isSelected ? selectedCardClasses : defaultCardClasses)}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleHierarchyToggle(node.id);
                }}
                className={cn(
                  'h-6 w-6 flex items-center justify-center rounded-md border text-gray-500 dark:text-gray-400',
                  'border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60',
                  !hasChildren && 'opacity-40 cursor-default'
                )}
                disabled={!hasChildren}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )
                ) : (
                  <span className="h-1 w-1 rounded-full bg-gray-400" />
                )}
              </button>
              {iconName && (
                <div className="h-10 w-10 rounded-lg bg-violet-50 dark:bg-gray-700 text-violet-600 dark:text-violet-300 flex items-center justify-center">
                  <IconRenderer iconName={iconName} className="h-5 w-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'font-medium text-sm',
                    isSelected ? 'text-violet-900 dark:text-violet-100' : 'text-gray-900 dark:text-gray-100'
                  )}
                >
                  {renderHighlightedText(displayName, highlightQuery)}
                </div>
                {description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {renderHighlightedText(description, highlightQuery)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    // Schema-aware rendering
    const title = getValueByRole(effectiveSchema, item, 'title') || item.name || `Item ${index + 1}`;
    const subtitle = getSingleValueByRole(effectiveSchema, item, 'subtitle', item.email) || item.email || '';
    const avatarField = getSingleValueByRole(effectiveSchema, item, 'avatar', item.name) || item.name || '?';

    const hasCodeField = effectiveSchema?.fields?.some((f) => f.role === 'code') || false;
    const codeField = getSingleValueByRole(effectiveSchema, item, 'code');

    return (
      <div key={item.id || index} className="space-y-1" style={{ marginLeft: depth * 16 }}>
        <motion.div {...motionProps}>
          <div
            onClick={() => toggleSelection(item)}
            className={cn(baseCardClasses, isSelected ? selectedCardClasses : defaultCardClasses)}
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleHierarchyToggle(node.id);
                }}
                className={cn(
                  'h-6 w-6 mt-1 flex items-center justify-center rounded-md border text-gray-500 dark:text-gray-400',
                  'border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60',
                  !hasChildren && 'opacity-40 cursor-default'
                )}
                disabled={!hasChildren}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )
                ) : (
                  <span className="h-1 w-1 rounded-full bg-gray-400" />
                )}
              </button>
              <Avatar
                fallback={getInitials(avatarField)}
                size="md"
                variant="primary"
                className={cn(
                  'border shrink-0 transition-colors',
                  isSelected ? 'border-violet-400' : 'border-gray-200'
                )}
              >
                {getInitials(avatarField)}
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4
                        className={cn(
                          'text-sm font-semibold truncate transition-colors flex-1 min-w-0',
                          isSelected
                            ? 'text-violet-900 dark:text-violet-100'
                            : 'text-gray-900 dark:text-gray-100 group-hover:text-violet-700 dark:group-hover:text-violet-300'
                        )}
                      >
                        {renderHighlightedText(title, highlightQuery)}
                      </h4>
                      {hasCodeField && codeField && <CodeBadge code={codeField} />}
                    </div>
                    {subtitle && subtitle.trim() && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {renderHighlightedText(subtitle, highlightQuery)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <AnimatePresence initial={false}>
          {isExpanded && node.children.length > 0 && (
            <motion.div
              key={`${node.id}-children`}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <div className="space-y-1 border-l border-dashed border-gray-200 dark:border-gray-700 ml-4 pl-3">
                {node.children.map((child, idx) =>
                  renderHierarchyNode(child, depth + 1, index + idx + 1)
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Only close if explicitly set to false (not opening)
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-3xl w-full h-full rounded-none md:rounded-2xl md:max-h-[70vh] flex flex-col" onPointerDownOutside={(e) => {
        // Prevent closing on outside click during loading or submission
        if (isLoading || isSubmitting) {
          e.preventDefault();
        }
      }} onEscapeKeyDown={(e) => {
        // Prevent closing on escape during loading or submission
        if (isLoading || isSubmitting) {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
            <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle>{title || `Select ${schemaName}`}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </div>
            <div className="flex items-center gap-2 me-8">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isLoading || isSubmitting}
                aria-label="Refresh items"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-violet-600 dark:text-violet-300' : ''}`} />
              </Button>
              {isHierarchical && (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleHierarchyExpandAll();
                    }}
                    disabled={isLoading || isSubmitting}
                    aria-label="Expand all"
                  >
                    <ChevronsDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleHierarchyCollapseAll();
                    }}
                    disabled={isLoading || isSubmitting}
                    aria-label="Collapse all"
                  >
                    <ChevronsUp className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {showAddButton && schemaId && effectiveSchema && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsAddModalOpen(true);
                  }}
                  disabled={isSubmitting || isLoading}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add {effectiveSchema.singular_name || 'Item'}
                </Button>
              )}
              {canViewList && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleViewList();
                  }}
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  <List className="h-4 w-4" />
                  View List
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Search */}
        <div className="mb-4">
          <SearchInput
            config={{ name: 'picker-search', placeholder: `Search ${schemaName}...` }}
            value={searchQuery}
            onChange={(value) => setSearchQuery(value)}
            onClear={() => setSearchQuery('')}
          />
        </div>

        {/* Items Grid / Hierarchy */}
        <div ref={listContainerRef} className="flex-1 overflow-y-auto min-h-0 px-2 py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Loading items...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500 text-sm">{error}</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              {searchQuery ? `No items found matching "${searchQuery}"` : 'No items available'}
            </div>
          ) : (
            <>
              {isHierarchical ? (
                <div className="space-y-2">
                  {hierarchyRoots.map((node, index) => renderHierarchyNode(node, 0, index))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <AnimatePresence mode="sync">
                    {filteredItems.map((item, index) => renderItemCard(item, index))}
                  </AnimatePresence>
                  {supportsPagination && (
                    <>
                      <div ref={loadMoreTriggerRef} className="col-span-full h-1 w-full" />
                      {isFetchingMore && (
                        <div className="col-span-full flex items-center justify-center py-4 text-sm text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading more icons...
                        </div>
                      )}
                      {!pageMeta.hasMore && filteredItems.length > 0 && !isFetchingMore && (
                        <div className="col-span-full">
                          <EndLine />
                        </div>
                      )}
                      {pageMeta.hasMore && (
                        <div className="col-span-full">
                          <AddButtonFull
                            label="Load More"
                            onClick={handleLoadMore}
                            loading={isFetchingMore}
                            disabled={isLoading || isFetchingMore}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-2 pt-4 border-t">
          <Button 
            type="button"
            variant="outline" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {allowMultiselect && (
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClearSelection();
              }}
              disabled={isSubmitting || selectedCount === 0}
            >
              Clear Selection
            </Button>
          )}
          {allowMultiselect && (
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleConfirmSelections();
              }}
              disabled={!hasPendingSelections || isSubmitting}
              className="inline-flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting
                ? 'Applying...'
                : `Apply${hasPendingSelections ? ` (${selectedCount})` : ''}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Add Item Form Modal */}
    {showAddButton && schemaId && effectiveSchema && isAddModalOpen && (
      <FormModal
        schemaId={schemaId}
        mode="create"
        getInitialSchema={(requestedId) => (requestedId === schemaId ? effectiveSchema : null)}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddItemSuccess}
      />
    )}
    </>
  );
};

PopupPicker.displayName = 'PopupPicker';

