'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DynamicDetailPageRenderer, getPageTitle, getPageSubtitle } from '@/gradian-ui/data-display/components/DynamicDetailPageRenderer';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { useLanguageStore } from '@/stores/language.store';
import { getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { useDynamicEntity } from '@/gradian-ui/shared/hooks/use-dynamic-entity';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { QueryClientContext } from '@tanstack/react-query';
import { getValueByRole } from '@/gradian-ui/form-builder/form-elements/utils/field-resolver';
import { cacheSchemaClientSide } from '@/gradian-ui/schema-manager/utils/schema-client-cache';
import { getSchemaWithClientCache, getSchemasWithClientCache, clearClientSchemaCache } from '@/gradian-ui/schema-manager/utils/client-schema-cache';

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
  const queryClient = React.useContext(QueryClientContext);
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
    if (!queryClient || !reconstructedNavigationSchemas.length) {
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

  // Fetch schema on mount, preferring client-side IndexedDB cache first
  useEffect(() => {
    const fetchSchemaFromApi = async () => {
      try {
        const cachedOrFresh = await getSchemaWithClientCache(schemaId);
        if (cachedOrFresh) {
          const updated = reconstructRegExp(cachedOrFresh) as FormSchema;
          setSchemaState(ensureSchemaActions(updated));
          if (queryClient) {
            queryClient.setQueryData(['schemas', schemaId], updated);
          }

          // Preload schemas for quick actions that open form modals
          const quickActions = updated.detailPageMetadata?.quickActions || [];
          const quickActionSchemaIds = quickActions
            .filter((action) =>
              (action.action === 'openFormDialog' || action.action === 'openActionForm') &&
              action.targetSchema
            )
            .map((action) => action.targetSchema!);

          // Preload schemas for table/repeating relation sections (e.g. Tender Items, Tender Invitations, Inquiries)
          // so they are in IndexedDB and React Query before DynamicRepeatingTableViewer mounts
          const tableRendererIds =
            (updated.detailPageMetadata?.tableRenderers || [])
              .map((tr: { targetSchema?: string }) => tr.targetSchema)
              .filter((id): id is string => Boolean(id));
          const repeatingSectionIds = (updated.sections || [])
            .filter((s) => s.isRepeatingSection && s.repeatingConfig?.targetSchema)
            .map((s) => s.repeatingConfig!.targetSchema)
            .filter((id): id is string => Boolean(id));

          const targetSchemas = Array.from(
            new Set([...quickActionSchemaIds, ...tableRendererIds, ...repeatingSectionIds])
          ).filter((id) => id && id !== schemaId);

          if (queryClient && targetSchemas.length > 0) {
            // Preload all target schemas in one call (IndexedDB first, then GET /api/schemas?includedSchemaIds=...)
            getSchemasWithClientCache(targetSchemas)
              .then((schemas) => {
                schemas.forEach((target) => {
                  if (target?.id) {
                    const reconstructed = reconstructRegExp(target) as FormSchema;
                    cacheSchemaClientSide(reconstructed, { queryClient, persist: false });
                    queryClient.setQueryData(['schemas', target.id], reconstructed);
                  }
                });
              })
              .catch((err) => {
                console.warn('[DetailPage] Failed to preload target schemas (batch):', err);
              });
          }
        }
      } catch (err) {
        console.warn('[DetailPage] Error fetching schema from API, keeping server-provided schema:', err);
      }
    };

    fetchSchemaFromApi();
  }, [schemaId, queryClient]); // Only run on mount and when schemaId changes

  const refreshSchema = useCallback(async () => {
    try {
      const fresh = await getSchemaWithClientCache(schemaId);
      if (fresh) {
        const updated = reconstructRegExp(fresh) as FormSchema;
        setSchemaState(ensureSchemaActions(updated));
        if (queryClient) {
          queryClient.setQueryData(['schemas', schemaId], updated);
        }
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
            
            // Clear client-side IndexedDB schema cache as well
            await clearClientSchemaCache();
            
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

  // Helper function to fetch schema client-side
  const fetchSchemaClient = useCallback(async (schemaId: string): Promise<FormSchema | null> => {
    const response = await apiRequest<FormSchema>(`/api/schemas/${schemaId}`);
    if (response.success && response.data) {
      await cacheSchemaClientSide(response.data);
      return response.data;
    }
    return null;
  }, []);

  // Fetch entity data and resolve picker fields
  const loadData = useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoading(true);
      }
      try {
        setError(null);
        const response = await apiRequest<any>(`/api/data/${schemaId}/${dataId}`);

        if (response.success && response.data) {
          let entityData = response.data;

          // Resolve picker fields for role-based display (resolve all picker fields, not just those with roles)
          if (schemaState?.fields) {
            const pickerFields = schemaState.fields.filter(
              (field: any) => field.component === 'picker' && field.targetSchema
            );

            if (pickerFields.length > 0) {
              const resolvedData = { ...entityData };

              await Promise.all(
                pickerFields
                  .filter((field: any) => entityData[field.name])
                  .map(async (field: any) => {
                    const fieldValue = entityData[field.name];
                    // Handle both string IDs and arrays of IDs
                    const valueArray = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
                    
                    for (const value of valueArray) {
                      if (typeof value !== 'string' || value.trim() === '') {
                        continue;
                      }

                      try {
                        const resolvedResponse = await apiRequest<any>(
                          `/api/data/${field.targetSchema}/${value}`
                        );
                        if (resolvedResponse.success && resolvedResponse.data) {
                          const resolvedEntity = resolvedResponse.data;
                          let resolvedLabel = resolvedEntity.name || resolvedEntity.title || value;

                          const targetSchemaForPicker = await fetchSchemaClient(field.targetSchema);
                          if (targetSchemaForPicker) {
                            const titleByRole = getValueByRole(
                              targetSchemaForPicker,
                              resolvedEntity,
                              'title'
                            );
                            if (titleByRole && titleByRole.trim() !== '') {
                              resolvedLabel = titleByRole;
                            }
                          }

                          // Store resolved data - handle both single and array cases
                          // Ensure the resolved entity has the correct ID for matching
                          const resolvedKey = `_${field.name}_resolved`;
                          const resolvedEntityWithId = {
                            ...resolvedEntity,
                            id: value, // Ensure ID matches the entry value for proper lookup
                            _resolvedLabel: resolvedLabel,
                          };
                          
                          if (Array.isArray(fieldValue)) {
                            if (!resolvedData[resolvedKey]) {
                              resolvedData[resolvedKey] = [];
                            }
                            const existingIndex = resolvedData[resolvedKey].findIndex(
                              (item: any) => String(item.id) === String(value)
                            );
                            if (existingIndex >= 0) {
                              resolvedData[resolvedKey][existingIndex] = resolvedEntityWithId;
                            } else {
                              resolvedData[resolvedKey].push(resolvedEntityWithId);
                            }
                          } else {
                            resolvedData[resolvedKey] = resolvedEntityWithId;
                          }
                          
                        }
                      } catch (error) {
                        console.error(`Error resolving picker field ${field.name}:`, error);
                      }
                    }
                  })
              );

              entityData = resolvedData;
            }
          }

          setData(entityData);
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
    [dataId, schemaId, schemaState, fetchSchemaClient]
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


  const language = useLanguageStore((s) => s.language);
  const defaultLang = getDefaultLanguage();
  const pageTitle = getPageTitle(schemaState, data, dataId);
  const pageSubtitle = getPageSubtitle(schemaState, entityName, language ?? undefined, defaultLang);

  useSetLayoutProps({
    title: pageTitle,
    subtitle: pageSubtitle,
    navigationSchemas: reconstructedNavigationSchemas,
  });

  return (
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
  );
}

