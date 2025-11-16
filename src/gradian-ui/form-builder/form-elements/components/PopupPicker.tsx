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
import { List, Loader2, RefreshCw } from 'lucide-react';
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

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.28,
      delay: Math.min(index * UI_PARAMS.CARD_INDEX_DELAY.STEP, UI_PARAMS.CARD_INDEX_DELAY.MAX),
    },
  }),
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.96,
    transition: {
      duration: 0.2,
    },
  },
};

interface PendingSelection {
  action: 'add' | 'remove';
  normalized?: NormalizedOption | null;
  raw?: any | null;
}

const normalizeIdList = (ids?: Array<string | number>): string[] =>
  (ids ?? []).map((id) => String(id));

const buildIdsKey = (ids?: Array<string | number>): string => {
  const normalized = normalizeIdList(ids);
  if (normalized.length === 0) {
    return '';
  }
  return normalized.slice().sort().join('|');
};

const buildSelectionEntry = (item: any, schema?: FormSchema | null): NormalizedOption => {
  if (!item) {
    return {
      id: '',
      label: '',
    };
  }

  const baseId = item.id ? String(item.id) : '';

  if (!schema) {
    const fallbackLabel = item.name || item.title || baseId;
    return {
      id: baseId,
      label: fallbackLabel || baseId,
      icon: item.icon,
      color: item.color,
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

  const normalized = normalizeOptionEntry({
    id: baseId,
    label: title || baseId,
    icon,
    color,
  });

  return normalized || { id: baseId, label: title || baseId, icon, color };
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
  staticItems?: any[]; // Optional static dataset (skips API calls when provided)
  pageSize?: number; // Page size for paginated data sources
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
  staticItems,
  pageSize = 48,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
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

  const baseSelectedIdsRef = useRef<Set<string>>(new Set());
  const baseSelectedIds = baseSelectedIdsRef.current;
  const listContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const supportsPagination = Boolean((sourceUrl || schemaId) && !staticItems);
  const includeKey = useMemo(() => (includeIds && includeIds.length > 0 ? includeIds.slice().sort().join(',') : ''), [includeIds]);
  const excludeKey = useMemo(() => (excludeIds && excludeIds.length > 0 ? excludeIds.slice().sort().join(',') : ''), [excludeIds]);
  const lastQueryKeyRef = useRef<string>('__init__');
  const hasInitialLoadRef = useRef<boolean>(false);

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

  // Fetch schema if not provided
  useEffect(() => {
    if (!staticItems && !sourceUrl && !providedSchema && schemaId && isOpen) {
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
  }, [schemaId, providedSchema, isOpen, queryClient]);

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
    (pageToLoad: number) => {
      if (!sourceUrl) {
        return '';
      }
      const params = new URLSearchParams();
      params.set('page', pageToLoad.toString());
      params.set('limit', effectivePageSize.toString());
      const trimmedSearch = searchQuery.trim();
      if (trimmedSearch) {
        params.set('search', trimmedSearch);
      }
      if (includeIds && includeIds.length > 0) {
        params.set('includeIds', includeIds.join(','));
      }
      if (excludeIds && excludeIds.length > 0) {
        params.set('excludeIds', excludeIds.join(','));
      }
      const queryString = params.toString();
      return `${sourceUrl}${sourceUrl.includes('?') ? '&' : '?'}${queryString}`;
    },
    [sourceUrl, effectivePageSize, searchQuery, includeIds, excludeIds]
  );

  const fetchSourceItems = useCallback(
    async (pageToLoad = 1, append = false) => {
      if (!sourceUrl) {
        return;
      }
      setError(null);
      if (pageToLoad === 1) {
        setIsLoading(true);
      } else {
        setIsFetchingMore(true);
      }
      try {
        const requestUrl = buildSourceRequestUrl(pageToLoad);
        const response = await fetch(requestUrl, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed to fetch items (${response.status})`);
        }
        const payload = await response.json();
        const dataArray = Array.isArray(payload)
          ? payload
          : payload &&
              typeof payload === 'object' &&
              'data' in payload &&
              Array.isArray((payload as Record<string, any>).data)
            ? ((payload as Record<string, any>).data as any[])
            : [];
        setItems((prev) => (append ? [...prev, ...dataArray] : dataArray));
        setFilteredItems((prev) => (append ? [...prev, ...dataArray] : dataArray));
        setPageMeta((prev) => {
          const meta = (payload as { meta?: { page?: number; limit?: number; totalItems?: number; hasMore?: boolean } }).meta;
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
    [buildSourceRequestUrl, effectivePageSize, sourceUrl]
  );

  const fetchSchemaItems = useCallback(
    async (pageToLoad = 1, append = false) => {
      if (!schemaId) {
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

        const response = await apiRequest<any>(`/api/data/${schemaId}`, { params });
        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(response.error || 'Failed to fetch items');
        }

        const dataArray = response.data;
        setItems((prev) => (append ? [...prev, ...dataArray] : dataArray));
        setFilteredItems((prev) => (append ? [...prev, ...dataArray] : dataArray));

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
    [schemaId, effectivePageSize, searchQuery, includeIds, excludeIds]
  );

  const loadItems = useCallback(
    async (pageToLoad = 1, append = false) => {
      if (sourceUrl) {
        await fetchSourceItems(pageToLoad, append);
        return;
      }
      if (supportsPagination && schemaId) {
        await fetchSchemaItems(pageToLoad, append);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        if (staticItems) {
          setItems(staticItems);
          setFilteredItems(staticItems);
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

        const url = `/api/data/${schemaId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await apiRequest<any[]>(url);

        if (response.success && response.data) {
          const itemsArray = Array.isArray(response.data) ? response.data : [];
          setItems(itemsArray);
          setFilteredItems(itemsArray);
        } else {
          setError(response.error || 'Failed to fetch items');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch items');
      } finally {
        setIsLoading(false);
      }
    },
    [sourceUrl, fetchSourceItems, fetchSchemaItems, supportsPagination, schemaId, staticItems, includeIds, excludeIds]
  );

  // Keep items in sync when static dataset changes or when modal opens
  useEffect(() => {
    if (!staticItems) {
      return;
    }
    if (isOpen) {
      setItems(staticItems);
      setFilteredItems(staticItems);
    }
  }, [staticItems, isOpen]);

  // Ensure initial load on open for paginated sources (schema or sourceUrl)
  useEffect(() => {
    if (!isOpen || !supportsPagination) {
      hasInitialLoadRef.current = false;
      return;
    }
    if (hasInitialLoadRef.current) {
      return;
    }
    setPageMeta((prev) => ({ ...prev, page: 1, hasMore: true, totalItems: 0 }));
    lastQueryKeyRef.current = `${searchQuery.trim()}|${includeKey}|${excludeKey}`;
    hasInitialLoadRef.current = true;
    void loadItems(1, false);
  }, [isOpen, supportsPagination, includeKey, excludeKey, searchQuery, loadItems]);

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
    const shouldFetch = prevExcludeIdsRef.current === '' || prevIncludeIdsRef.current === '' || excludeIdsChanged || includeIdsChanged;

    if (!shouldFetch) {
      return;
    }

    // Update refs with current values
    prevExcludeIdsRef.current = excludeIdsKey;
    prevIncludeIdsRef.current = includeIdsKey;

    void loadItems();
    // Note: excludeIds and includeIds are intentionally not in dependencies
    // We compare them inside the effect using refs to avoid infinite loops
  }, [schemaId, isOpen, staticItems, sourceUrl, loadItems]);
  const handleRefresh = async (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (staticItems) {
      setItems(staticItems);
      return;
    }
    if (supportsPagination) {
      setPageMeta((prev) => ({ ...prev, page: 1, hasMore: true }));
      await loadItems(1, false);
      return;
    }
    await loadItems(1, false);
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
    const queryKey = `${trimmed}|${includeKey}|${excludeKey}`;
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
  }, [isOpen, supportsPagination, searchQuery, includeKey, excludeKey, loadItems]);

  useEffect(() => {
    if (supportsPagination) {
      return;
    }

    if (!searchQuery.trim()) {
      setFilteredItems(items);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = items.filter((item) => {
      if (!schema) {
        const title = item.name || item.title || '';
        const subtitle = item.email || item.subtitle || '';
        return title.toLowerCase().includes(query) || subtitle.toLowerCase().includes(query);
      }

      const title = getValueByRole(schema, item, 'title') || item.name || '';
      const subtitle = getSingleValueByRole(schema, item, 'subtitle', item.email) || item.email || '';
      return title.toLowerCase().includes(query) || subtitle.toLowerCase().includes(query);
    });

    setFilteredItems(filtered);
  }, [supportsPagination, searchQuery, items, schema]);

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
      const selectionEntry = buildSelectionEntry(item, schema);
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
      const selectionEntry = buildSelectionEntry(item, schema);
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
        normalized: buildSelectionEntry(match, schema),
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

  const renderItemCard = (item: any, index: number) => {
    const isSelected = isItemSelected(item);

    const baseCardClasses = "relative p-3 rounded-xl border cursor-pointer transition-all duration-200 group";
    const selectedCardClasses = "border-violet-500 dark:border-violet-400 bg-gradient-to-br from-violet-50 via-white to-white dark:from-gray-900 dark:via-gray-800 dark:to-violet-900 shadow-lg ring-1 ring-violet-200 dark:ring-violet-800";
    const defaultCardClasses = "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-300 hover:shadow-md";

    const motionProps = {
      layout: true,
      variants: cardVariants,
      initial: 'hidden',
      animate: 'visible',
      exit: 'exit',
      custom: index,
    } as const;

    const highlightQuery = searchQuery.trim();

    if (!schema) {
      // Fallback rendering
      const displayName = item.name || item.title || item.id || `Item ${index + 1}`;
      const iconName = item.icon || item.name || item.title;
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
            <div
              className={cn(
                "font-medium text-sm",
                isSelected ? "text-violet-900 dark:text-violet-100" : "text-gray-900 dark:text-gray-100"
              )}
            >
              {renderHighlightedText(displayName, highlightQuery)}
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    // Extract data using schema roles
    const title = getValueByRole(schema, item, 'title') || item.name || `Item ${index + 1}`;
    const subtitle = getSingleValueByRole(schema, item, 'subtitle', item.email) || item.email || '';
    const avatarField = getSingleValueByRole(schema, item, 'avatar', item.name) || item.name || '?';
    // Get badge fields
    const badgeFields = getFieldsByRole(schema, 'badge');
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
    const statusFieldDef = schema.fields?.find(f => f.role === 'status');
    const ratingFieldDef = schema.fields?.find(f => f.role === 'rating');
    const hasCodeField = schema.fields?.some(f => f.role === 'code') || false;
    const codeField = getSingleValueByRole(schema, item, 'code');
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
                  : "border-gray-200 group-hover:border-violet-300"
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
                          ? "text-violet-900"
                          : "text-gray-900 group-hover:text-violet-700 dark:group-hover:text-violet-300"
                      )}
                    >
                      {renderHighlightedText(title, highlightQuery)}
                    </h4>
                    {/* Code Badge */}
                    {hasCodeField && codeField && (
                      <CodeBadge code={codeField} />
                    )}
                  </div>
                  {subtitle && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {renderHighlightedText(subtitle, highlightQuery)}
                    </p>
                  )}

                </div>

                {/* Rating and Status */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {ratingFieldNode && <div className="flex items-center gap-1">{ratingFieldNode}</div>}
                  {statusFieldNode && <div className="flex items-center gap-1">{statusFieldNode}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const schemaName = schema?.plural_name || schema?.singular_name || schemaId;

  return (
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
            <div className="flex items-center gap-2 me-4">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isLoading || isSubmitting}
                aria-label="Refresh items"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-violet-600' : ''}`} />
              </Button>
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

        {/* Items Grid */}
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
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-2 pt-4 border-t">
          <Button 
            type="button"
            variant="ghost" 
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
  );
};

PopupPicker.displayName = 'PopupPicker';

