import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormSchema } from '../types';
import {
  CreateSchemaPayload,
  DeleteDialogState,
  SchemaCreateResult,
  SchemaTab,
} from '../types/schema-manager-page';
import { MessagesResponse, Message } from '@/gradian-ui/layout/message-box';
import { config } from '@/lib/config';
import { useSchemas, SCHEMAS_QUERY_KEY, SCHEMAS_SUMMARY_QUERY_KEY } from './use-schemas';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { useTenantStore } from '@/stores/tenant.store';
import { DEFAULT_LIMIT } from '@/gradian-ui/shared/utils/pagination-utils';

/**
 * Transform API response messages to MessageBox format
 * API may return: { path: "$.description", en: "description is required" }
 * MessageBox expects: { path: "$.description", message: { en: "description is required" } }
 */
const transformMessages = (apiMessages: any[]): Message[] => {
  if (!Array.isArray(apiMessages)) return [];
  
  return apiMessages.map((msg: any) => {
    // If message already has the correct format, return as is
    if (msg.message !== undefined) {
      return msg;
    }
    
    // Extract path if exists
    const { path, ...languageKeys } = msg;
    
    // If there are language keys (en, fr, etc.), wrap them in message
    if (Object.keys(languageKeys).length > 0) {
      return {
        path,
        message: languageKeys,
      };
    }
    
    // Fallback: treat the whole object as a string message
    return {
      path,
      message: JSON.stringify(msg),
    };
  });
};

export const useSchemaManagerPage = () => {
  const queryClient = useQueryClient();
  // Default to showing statistics when the Schema Builder page is opened
  const [showStatistics, setShowStatistics] = useState(true);
  const tenantId = useTenantStore((state) => state.getTenantId());
  const { schemas: fetchedSchemas, isLoading, error: schemasError, refetch: refetchSchemas } = useSchemas({ 
    summary: true,
    includeStatistics: showStatistics,
    enabled: true,
    tenantIds: tenantId ? String(tenantId) : undefined,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SchemaTab>('system');
  const [showInactive, setShowInactive] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table' | 'hierarchy'>('table');
  const [tenantFilter, setTenantFilter] = useState<string | undefined>(undefined);
  const [syncStrategyFilter, setSyncStrategyFilter] = useState<'schema-only' | 'schema-and-data' | undefined>(undefined);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({ open: false, schema: null });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [messages, setMessages] = useState<MessagesResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(DEFAULT_LIMIT);
  
  // Track initial mount to skip first tenant change effect
  const isInitialMountRef = useRef(true);

  // Use schemas from React Query cache
  const schemas = fetchedSchemas;
  const loading = isLoading || refreshing;

  // Handle error messages from React Query
  useEffect(() => {
    if (schemasError) {
      const errorMessage = schemasError instanceof Error ? schemasError.message : 'Error fetching schemas';
      setMessages({
        success: false,
        message: errorMessage,
      });
    }
  }, [schemasError]);

  // Force refetch when showStatistics changes to ensure fresh data with/without statistics
  useEffect(() => {
    // Invalidate all schema summary queries (with and without statistics)
    queryClient.invalidateQueries({ 
      queryKey: SCHEMAS_SUMMARY_QUERY_KEY,
      exact: false, // Invalidate all queries that start with this key
    });
    // Remove the old query from cache to force a fresh fetch
    queryClient.removeQueries({ 
      queryKey: SCHEMAS_SUMMARY_QUERY_KEY,
      exact: false,
    });
    // Refetch the schemas with the new statistics flag
    refetchSchemas();
  }, [showStatistics, queryClient, refetchSchemas]);

  // Force refetch when tenantId changes to ensure schemas are filtered correctly
  useEffect(() => {
    // Skip on initial mount to avoid unnecessary refetch
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (tenantId !== undefined) {
      // Invalidate all schema queries to clear old tenant's data
      queryClient.invalidateQueries({ 
        queryKey: SCHEMAS_SUMMARY_QUERY_KEY,
        exact: false,
      });
      queryClient.invalidateQueries({ 
        queryKey: SCHEMAS_QUERY_KEY,
        exact: false,
      });
      // Remove old queries to force fresh fetch with new tenant
      queryClient.removeQueries({ 
        queryKey: SCHEMAS_SUMMARY_QUERY_KEY,
        exact: false,
      });
      queryClient.removeQueries({ 
        queryKey: SCHEMAS_QUERY_KEY,
        exact: false,
      });
      // Refetch schemas with new tenant filter
      refetchSchemas();
    }
  }, [tenantId, queryClient, refetchSchemas]);

  // Listen for cache clear events and refetch schemas
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCacheClear = () => {
      // Invalidate and refetch schemas when cache is cleared
      queryClient.invalidateQueries({ 
        queryKey: SCHEMAS_SUMMARY_QUERY_KEY,
        exact: false,
      });
      queryClient.invalidateQueries({ 
        queryKey: SCHEMAS_QUERY_KEY,
        exact: false,
      });
      refetchSchemas();
    };

    // Listen for React Query cache clear event
    window.addEventListener('react-query-cache-clear', handleCacheClear);
    // Listen for storage events (cross-tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'react-query-cache-cleared') {
        handleCacheClear();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('react-query-cache-clear', handleCacheClear);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [queryClient, refetchSchemas]);

  const normalizeSchemaType = useCallback((schema: FormSchema): 'system' | 'business' | 'action-form' => {
    if (schema.schemaType) return schema.schemaType;
    // Legacy fallback: infer from isSystemSchema
    if (schema.isSystemSchema === true) return 'system';
    return 'business';
  }, []);

  const systemSchemas = useMemo(
    () =>
      schemas
        .filter((schema) => normalizeSchemaType(schema) === 'system')
        .sort((a, b) => {
          const aName = a.plural_name || a.singular_name || a.id || '';
          const bName = b.plural_name || b.singular_name || b.id || '';
          return aName.localeCompare(bName);
        }),
    [normalizeSchemaType, schemas],
  );

  const businessSchemas = useMemo(
    () =>
      schemas
        .filter((schema) => normalizeSchemaType(schema) === 'business')
        .sort((a, b) => {
          const aName = a.plural_name || a.singular_name || a.id || '';
          const bName = b.plural_name || b.singular_name || b.id || '';
          return aName.localeCompare(bName);
        }),
    [normalizeSchemaType, schemas],
  );

  const actionFormSchemas = useMemo(
    () =>
      schemas
        .filter((schema) => normalizeSchemaType(schema) === 'action-form')
        .sort((a, b) => {
          const aName = a.plural_name || a.singular_name || a.id || '';
          const bName = b.plural_name || b.singular_name || b.id || '';
          return aName.localeCompare(bName);
        }),
    [normalizeSchemaType, schemas],
  );

  const systemSchemasCount = useMemo(
    () =>
      showInactive
        ? systemSchemas.length
        : systemSchemas.filter((schema) => !schema.inactive).length,
    [systemSchemas, showInactive],
  );

  const businessSchemasCount = useMemo(
    () =>
      showInactive
        ? businessSchemas.length
        : businessSchemas.filter((schema) => !schema.inactive).length,
    [businessSchemas, showInactive],
  );

  const actionFormSchemasCount = useMemo(
    () =>
      showInactive
        ? actionFormSchemas.length
        : actionFormSchemas.filter((schema) => !schema.inactive).length,
    [actionFormSchemas, showInactive],
  );

  const filteredSchemas = useMemo(() => {
    const listToFilter =
      activeTab === 'system'
        ? systemSchemas
        : activeTab === 'business'
          ? businessSchemas
          : actionFormSchemas;

    return listToFilter.filter(schema => {
      // Filter by inactive status if showInactive is false
      if (!showInactive && schema.inactive) {
        return false;
      }

      // Filter by search query
      const query = searchQuery.toLowerCase();
      const pluralName = schema.plural_name?.toLowerCase() || '';
      const singularName = schema.singular_name?.toLowerCase() || '';
      const schemaId = schema.id?.toLowerCase() || '';
      const matchesSearch =
        pluralName.includes(query) ||
        singularName.includes(query) ||
        schemaId.includes(query);

      if (!matchesSearch) return false;

      // Tenant filter
      if (tenantFilter) {
        if (tenantFilter === 'all-tenants') {
          if (!schema.applyToAllTenants) return false;
        } else {
          const relatedIds = Array.isArray(schema.relatedTenants)
            ? schema.relatedTenants
                .map((t: any) => (typeof t === 'string' ? t : t?.id))
                .filter(Boolean)
                .map(String)
            : [];
          if (!relatedIds.includes(tenantFilter)) {
            return false;
          }
        }
      }

      // Sync strategy filter
      if (
        syncStrategyFilter &&
        (schema.syncStrategy || 'schema-only') !== syncStrategyFilter
      ) {
        return false;
      }

      return true;
    });
  }, [
    actionFormSchemas,
    activeTab,
    businessSchemas,
    searchQuery,
    showInactive,
    systemSchemas,
    tenantFilter,
    syncStrategyFilter,
  ]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, tenantFilter, syncStrategyFilter, showInactive, activeTab]);

  // Paginate filtered schemas
  const paginatedSchemas = useMemo(() => {
    if (pageSize === 'all') {
      return filteredSchemas;
    }
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredSchemas.slice(start, end);
  }, [filteredSchemas, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1;
    return Math.ceil(filteredSchemas.length / pageSize);
  }, [filteredSchemas.length, pageSize]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number | 'all') => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  }, []);

  const tenantOptions = useMemo(() => {
    const seen = new Map<string, string>();
    schemas.forEach((schema) => {
      (schema.relatedTenants || []).forEach((t: any) => {
        const id = typeof t === 'string' ? t : t?.id;
        if (!id) return;
        const label =
          (typeof t === 'string' ? t : t?.label) ||
          t?.displayName ||
          t?.name ||
          t?.tenantName ||
          t?.companyName ||
          t?.code ||
          `${id}`;
        if (!seen.has(String(id))) {
          seen.set(String(id), String(label));
        }
      });
    });
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [schemas]);

  const syncStrategyOptions = useMemo(() => {
    const values = new Set<string>();
    schemas.forEach((s) => {
      const v = s.syncStrategy || 'schema-only';
      values.add(v);
    });
    return Array.from(values).map((id) => ({
      id,
      label: id === 'schema-and-data' ? 'Schema & data' : 'Schema only',
    }));
  }, [schemas]);

  const invalidateSchemaQueryCaches = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ 
        queryKey: SCHEMAS_SUMMARY_QUERY_KEY,
        refetchType: 'active', // Force refetch of active queries
      }),
      queryClient.invalidateQueries({ 
        queryKey: SCHEMAS_QUERY_KEY,
        refetchType: 'active', // Force refetch of active queries
      }),
    ]);
  }, [queryClient]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // First, clear the cache
      try {
        const clearCacheResponse = await fetch('/api/schemas/clear-cache', {
          method: 'POST',
        });
        const clearCacheData = await clearCacheResponse.json();
        
        if (clearCacheData.success && typeof window !== 'undefined' && clearCacheData.clearReactQueryCache) {
          const reactQueryKeys: string[] = Array.isArray(clearCacheData.reactQueryKeys) && clearCacheData.reactQueryKeys.length > 0
            ? clearCacheData.reactQueryKeys
            : ['schemas'];
          
          // Dispatch event to clear React Query caches
          window.dispatchEvent(new CustomEvent('react-query-cache-clear', { 
            detail: { queryKeys: reactQueryKeys } 
          }));
          
          // Also trigger storage event for other tabs
          window.localStorage.setItem('react-query-cache-cleared', JSON.stringify(reactQueryKeys));
          window.localStorage.removeItem('react-query-cache-cleared');
        }
      } catch (cacheError) {
        console.warn('[schema-manager] Failed to clear cache before refresh:', cacheError);
        // Continue with refresh even if cache clear fails
      }
      
      await invalidateSchemaQueryCaches();
      await refetchSchemas();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error refreshing schemas';
      setMessages({
        success: false,
        message: errorMessage,
      });
    } finally {
      setRefreshing(false);
    }
  }, [invalidateSchemaQueryCaches, refetchSchemas, showStatistics]);

  const openDeleteDialog = useCallback((schema: FormSchema) => {
    setDeleteDialog({ open: true, schema });
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog({ open: false, schema: null });
  }, []);

  const handleDelete = useCallback(async (hardDelete: boolean = false) => {
    if (!deleteDialog.schema) {
      return false;
    }

    try {
      let response: Response;
      let result: any;

      if (hardDelete) {
        // Hard delete: DELETE the schema and all its data
        response = await fetch(`${config.schemaApi.basePath}/${deleteDialog.schema.id}?hardDelete=true`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        result = await response.json();
      } else {
        // Soft delete: Set schema as inactive
        const updatedSchema = { ...deleteDialog.schema, inactive: true };
        const { id: _schemaId, ...payload } = updatedSchema;
        
        response = await fetch(`${config.schemaApi.basePath}/${deleteDialog.schema.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        result = await response.json();
      }

      if (result.success) {
        // Call clear cache route to clear all caches
        try {
          await fetch('/api/schemas/clear-cache', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          }).catch((error) => {
            console.warn('Failed to call clear-cache route:', error);
          });
        } catch (error) {
          console.warn('Error calling clear-cache route:', error);
        }

        // Invalidate and refetch queries to ensure fresh data
        await invalidateSchemaQueryCaches();
        
        // Wait a brief moment for cache clearing to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force refetch the schema list
        await refetchSchemas();
        
        // Show success message if available
        if (result.messages) {
          const transformedMessages = transformMessages(result.messages);
          setMessages({
            success: true,
            messages: transformedMessages,
            message: result.message,
          });
        } else if (result.message) {
          setMessages({
            success: true,
            message: result.message,
          });
        }
        closeDeleteDialog();
        return true;
      }

      // Extract error messages from response
      if (result.messages) {
        const transformedMessages = transformMessages(result.messages);
        setMessages({
          success: false,
          messages: transformedMessages,
          message: result.message,
        });
      } else if (result.message) {
        setMessages({
          success: false,
          message: result.message,
        });
      } else {
        setMessages({
          success: false,
          message: result.error || (hardDelete ? 'Failed to delete schema' : 'Failed to set schema inactive'),
        });
      }
      console.error(hardDelete ? 'Failed to delete schema:' : 'Failed to set schema inactive:', result);
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (hardDelete ? 'Error deleting schema' : 'Error setting schema inactive');
      setMessages({
        success: false,
        message: errorMessage,
      });
      console.error(hardDelete ? 'Error deleting schema:' : 'Error setting schema inactive:', error);
      return false;
    }
  }, [closeDeleteDialog, deleteDialog.schema, invalidateSchemaQueryCaches, refetchSchemas]);

  const handleCreate = useCallback(async (payload: CreateSchemaPayload): Promise<SchemaCreateResult> => {
    const {
      schemaId,
      singularName,
      pluralName,
      description,
      showInNavigation,
      schemaType,
      isNotCompanyBased,
      allowDataInactive,
      allowDataForce,
      allowDataHardDelete,
      allowDataAssignedTo,
      allowDataDueDate,
      allowDataBookmark,
    } = payload;

    if (!schemaId || !singularName || !pluralName) {
      return { success: false, error: 'Schema ID, Singular Name, and Plural Name are required' };
    }

    const resolvedSchemaType: 'system' | 'business' | 'action-form' =
      schemaType || 'business';

    // Clear any existing messages when starting a new create operation
    setMessages(null);

    try {
      const newSchema: FormSchema = {
        id: schemaId,
        description,
        singular_name: singularName,
        plural_name: pluralName,
        showInNavigation,
        schemaType: resolvedSchemaType,
      // Legacy bridge for older APIs that still expect isSystemSchema
        isSystemSchema:
          resolvedSchemaType === 'system'
            ? true
            : resolvedSchemaType === 'business'
              ? false
              : undefined,
        // System schemas automatically apply to all tenants
        applyToAllTenants: resolvedSchemaType === 'system' ? true : undefined,
        isNotCompanyBased,
        allowDataInactive,
        allowDataForce,
        allowDataHardDelete,
        allowDataAssignedTo,
        allowDataDueDate,
        allowDataBookmark,
        fields: [],
        sections: [],
      };

      const response = await fetch(config.schemaApi.basePath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSchema),
      });

      const result = await response.json();

      if (result.success) {
        // Invalidate schemas cache to refetch updated data
        await invalidateSchemaQueryCaches();
        // Don't set messages in hook when dialog is open - let dialog handle it
        // Only set messages after dialog closes if needed
        setCreateDialogOpen(false);
        // Show success message on background page after dialog closes
        if (result.messages) {
          const transformedMessages = transformMessages(result.messages);
          setMessages({
            success: true,
            messages: transformedMessages,
            message: result.message,
          });
        } else if (result.message) {
          setMessages({
            success: true,
            message: result.message,
          });
        }
        return { success: true };
      }

      // Extract error messages from response
      // Don't set messages in hook - return them to dialog instead
      if (result.messages) {
        const transformedMessages = transformMessages(result.messages);
        return { success: false, error: result.error || 'Failed to create schema', messages: transformedMessages };
      } else if (result.message) {
        return { success: false, error: result.error || 'Failed to create schema', message: result.message };
      } else {
        const errorMessage = result.error || 'Failed to create schema';
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error creating schema';
      // Don't set messages in hook - return to dialog instead
      console.error('Error creating schema:', error);
      return { success: false, error: errorMessage };
    }
  }, [invalidateSchemaQueryCaches, queryClient]);

  const openCreateDialog = useCallback(() => setCreateDialogOpen(true), []);
  const closeCreateDialog = useCallback(() => setCreateDialogOpen(false), []);

  return {
    schemas,
    loading,
    refreshing,
    searchQuery,
    setSearchQuery,
    tenantFilter,
    setTenantFilter,
    syncStrategyFilter,
    setSyncStrategyFilter,
    tenantOptions,
    syncStrategyOptions,
    activeTab,
    setActiveTab,
    showInactive,
    setShowInactive,
    viewMode,
    setViewMode,
    filteredSchemas,
    paginatedSchemas,
    currentPage,
    pageSize,
    totalPages,
    handlePageChange,
    handlePageSizeChange,
    systemSchemas,
    businessSchemas,
    actionFormSchemas,
    systemSchemasCount,
    businessSchemasCount,
    actionFormSchemasCount,
    handleRefresh,
    deleteDialog,
    openDeleteDialog,
    closeDeleteDialog,
    handleDelete,
    createDialogOpen,
    openCreateDialog,
    closeCreateDialog,
    handleCreate,
    messages,
    clearMessages: () => setMessages(null),
    showStatistics,
    setShowStatistics,
  };
};
