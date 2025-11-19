'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DynamicDetailPageRenderer, getPageTitle, getPageSubtitle } from '@/gradian-ui/data-display/components/DynamicDetailPageRenderer';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { useDynamicEntity } from '@/gradian-ui/shared/hooks/use-dynamic-entity';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { MainLayout } from '@/components/layout/main-layout';
import { useQueryClient } from '@tanstack/react-query';

interface DynamicDetailPageClientProps {
  schema: FormSchema;
  dataId: string;
  schemaId: string;
  entityName: string;
  navigationSchemas?: FormSchema[];
}

/**
 * Reconstruct RegExp objects from serialized schema
 */
function reconstructRegExp(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => reconstructRegExp(item));
  }
  
  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (value && typeof value === 'object' && value.__regexp) {
        result[key] = new RegExp(value.source, value.flags);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = reconstructRegExp(value);
      } else {
        result[key] = value;
      }
    }
  }
  
  return result;
}

/**
 * Ensure schema has default actions for form buttons
 */
function ensureSchemaActions(schema: FormSchema): FormSchema {
  if (!schema.actions || !Array.isArray(schema.actions)) {
    // Set default actions as an array of action types
    return {
      ...schema,
      actions: ['cancel', 'reset', 'submit'],
    };
  }
  return schema;
}

export function DynamicDetailPageClient({
  schema: rawSchema,
  dataId,
  schemaId,
  entityName,
  navigationSchemas,
}: DynamicDetailPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const showBack = searchParams?.get('showBack') === 'true';
  const [schemaState, setSchemaState] = useState<FormSchema>(() => {
    const reconstructed = reconstructRegExp(rawSchema) as FormSchema;
    return ensureSchemaActions(reconstructed);
  });

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reconstructedNavigationSchemas = useMemo(
    () => (navigationSchemas ?? []).map((schema) => reconstructRegExp(schema) as FormSchema),
    [navigationSchemas]
  );

  useEffect(() => {
    if (!reconstructedNavigationSchemas.length) {
      return;
    }

    reconstructedNavigationSchemas.forEach((schema) => {
      if (schema?.id) {
        queryClient.setQueryData(['schemas', schema.id], schema);
      }
    });
  }, [queryClient, reconstructedNavigationSchemas]);


  // Use the dynamic entity hook for CRUD operations
  const {
    deleteEntity,
  } = useDynamicEntity(schemaState);

  // Fetch schema from API on mount to ensure fresh data
  useEffect(() => {
    const fetchSchemaFromApi = async () => {
      try {
        // Fetch from /api/schemas/{schemaId} to get fresh schema data
        // Disable cache to ensure we always get fresh data from the server
        const response = await apiRequest<FormSchema>(`/api/schemas/${schemaId}`, {
          disableCache: true,
          callerName: 'DynamicDetailPageClient',
        });
        if (response.success && response.data) {
          const updated = reconstructRegExp(response.data) as FormSchema;
          setSchemaState(ensureSchemaActions(updated));
          queryClient.setQueryData(['schemas', schemaId], updated);
        }
      } catch (err) {
        console.warn('[DetailPage] Error fetching schema from API, keeping server-provided schema:', err);
      }
    };

    fetchSchemaFromApi();
  }, [schemaId, queryClient]); // Only run on mount and when schemaId changes

  const refreshSchema = useCallback(async () => {
    try {
      // Use the same endpoint as initial fetch, disable cache to get fresh data
      const response = await apiRequest<FormSchema>(`/api/schemas/${schemaId}`, {
        disableCache: true,
        callerName: 'DynamicDetailPageClient-refresh',
      });
      if (response.success && response.data) {
        const updated = reconstructRegExp(response.data) as FormSchema;
        setSchemaState(ensureSchemaActions(updated));
        queryClient.setQueryData(['schemas', schemaId], updated);
      } else {
        console.warn(`Schema ${schemaId} could not be reloaded after cache clear.`);
      }
    } catch (err) {
      console.error('Error refreshing schema after cache clear:', err);
    }
  }, [queryClient, schemaId]);

  // Expose refresh function to window for development/debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).refreshSchemaCache = async () => {
        try {
          // Clear server-side cache
          const response = await apiRequest<{ success: boolean; reactQueryKeys?: string[] }>('/api/schemas/clear-cache', { method: 'POST' });
          
          if (response.success) {
            const reactQueryKeys: string[] = Array.isArray(response.data?.reactQueryKeys) && response.data.reactQueryKeys.length > 0
              ? response.data.reactQueryKeys
              : ['schemas', 'companies'];
            
            // Dispatch event to clear React Query caches (this will be handled by query-provider)
            window.dispatchEvent(new CustomEvent('react-query-cache-clear', { 
              detail: { queryKeys: reactQueryKeys } 
            }));
            
            // Also trigger storage event for other tabs
            window.localStorage.setItem('react-query-cache-cleared', JSON.stringify(reactQueryKeys));
            window.localStorage.removeItem('react-query-cache-cleared');
            
            // Wait a bit for cache to clear, then refresh
            setTimeout(async () => {
              await refreshSchema();
              router.refresh();
              console.log('✅ Schema cache cleared and refreshed');
            }, 100);
          } else {
            console.error('❌ Failed to clear cache:', response.error);
          }
        } catch (error) {
          console.error('❌ Failed to refresh schema cache:', error);
        }
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).refreshSchemaCache;
      }
    };
  }, [queryClient, refreshSchema, router]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleCacheCleared = () => {
      refreshSchema();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'schema-cache-cleared') {
        refreshSchema();
      }
    };

    window.addEventListener('schema-cache-cleared', handleCacheCleared);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('schema-cache-cleared', handleCacheCleared);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshSchema]);

  // Fetch entity data
  const loadData = useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoading(true);
      }
      try {
        setError(null);
        const response = await apiRequest<any>(`/api/data/${schemaId}/${dataId}`);

        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.error || 'Failed to fetch entity');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch entity');
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [dataId, schemaId]
  );

  useEffect(() => {
    if (dataId) {
      loadData();
    }
  }, [dataId, loadData]);

  const handleBack = useCallback(() => {
    if (showBack) {
      // Use browser history back when showBack query param is present
      router.back();
    } else {
      // Default: navigate to schema list page
      router.push(`/page/${schemaId}`);
    }
  }, [router, schemaId, showBack]);

  const handleEdit = useCallback(() => {
    // Edit is now handled by DynamicDetailPageRenderer's FormModal
    // This callback can be used for external handling if needed
  }, []);

  const handleDelete = useCallback(async () => {
    if (data && window.confirm(`Are you sure you want to delete this ${entityName.toLowerCase()}?`)) {
      try {
        await deleteEntity(dataId);
        router.push(`/page/${schemaId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete entity');
      }
    }
  }, [data, dataId, entityName, deleteEntity, router, schemaId]);


  const pageTitle = getPageTitle(schemaState, data, dataId);
  const pageSubtitle = getPageSubtitle(schemaState, entityName);

  return (
    <MainLayout
      title={pageTitle}
      subtitle={pageSubtitle}
      navigationSchemas={reconstructedNavigationSchemas}
    >
      <DynamicDetailPageRenderer
        schema={schemaState}
        data={data}
        isLoading={isLoading}
        error={error}
        onBack={handleBack}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefreshData={() => loadData({ silent: true })}
        disableAnimation={false}
        showBack={showBack}
        preloadedSchemas={reconstructedNavigationSchemas}
      />
    </MainLayout>
  );
}

