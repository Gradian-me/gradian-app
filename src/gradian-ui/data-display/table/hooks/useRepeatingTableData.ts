import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { useSchemaById } from '@/gradian-ui/schema-manager/hooks/use-schema-by-id';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { resolveFieldById, getValueByRole } from '@/gradian-ui/form-builder/form-elements/utils/field-resolver';
import {
  RelationDirection,
  RelationInfo,
  UseRepeatingTableDataParams,
  UseRepeatingTableDataResult,
} from '../types';
import { formatRelationType } from '../utils';
import { cacheSchemaClientSide } from '@/gradian-ui/schema-manager/utils/schema-client-cache';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { replaceDynamicContext } from '@/gradian-ui/form-builder/utils/dynamic-context-replacer';
import { useCompanyStore } from '@/stores/company.store';

async function fetchSchemaClient(schemaId: string): Promise<FormSchema | null> {
  const response = await apiRequest<FormSchema>(`/api/schemas/${schemaId}`);
  if (response.success && response.data) {
    await cacheSchemaClientSide(response.data);
    return response.data;
  }
  return null;
}

export function useRepeatingTableData(
  params: UseRepeatingTableDataParams
): UseRepeatingTableDataResult {
  const { config, schema, data, sourceId, sourceSchemaId, initialTargetSchema } = params;

  const isRelationBased = Boolean(config.targetSchema);
  const targetSchemaId = config.targetSchema || null;
  const relationTypeId = config.relationTypeId;
  
  // Get company ID from store to include in API requests
  const getCompanyId = useCompanyStore((state) => state.getCompanyId);
  
  // Reference-based filtering properties
  const referenceSchema = config.referenceSchema;
  const referenceRelationTypeId = config.referenceRelationTypeId;
  const referenceEntityIdRaw = config.referenceEntityId;
  
  // Resolve referenceEntityId with dynamic context if needed
  const referenceEntityId = useMemo(() => {
    if (!referenceEntityIdRaw) return null;
    // Check if it contains dynamic context syntax
    if (referenceEntityIdRaw.includes('{{')) {
      return replaceDynamicContext(referenceEntityIdRaw, {
        formSchema: schema,
        formData: data,
      });
    }
    return referenceEntityIdRaw;
  }, [referenceEntityIdRaw, schema, data]);

  const effectiveSourceSchemaId = sourceSchemaId || schema.id;
  const effectiveSourceId = sourceId ?? data?.id;
  
  // Helper function to get companyIds param for API requests
  const getCompanyIdsParam = useCallback(() => {
    const companyId = getCompanyId();
    if (companyId) {
      return { companyIds: String(companyId) };
    }
    return {};
  }, [getCompanyId]);

  const [relatedEntities, setRelatedEntities] = useState<any[]>([]);
  const [isLoadingRelations, setIsLoadingRelations] = useState(false);
  const [relationDirections, setRelationDirections] = useState<Set<RelationDirection>>(new Set());

  const isFetchingRelationsRef = useRef(false);
  const lastFetchParamsRef = useRef('');
  const inFlightRequestRef = useRef<string | null>(null);

  // Use React Query to fetch target schema
  const shouldFetchTargetSchema = isRelationBased && !!targetSchemaId && !initialTargetSchema;

  const { schema: targetSchemaData, isLoading: isLoadingTargetSchema } = useSchemaById(
    isRelationBased ? targetSchemaId : null,
    {
      enabled: shouldFetchTargetSchema,
      initialData: initialTargetSchema ?? undefined,
    }
  );

  const fetchRelations = useCallback(async () => {
    if (
      !isRelationBased ||
      !effectiveSourceId ||
      !targetSchemaId ||
      !targetSchemaData ||
      isFetchingRelationsRef.current
    ) {
      return;
    }

    // Create a unique request key to prevent duplicate concurrent requests
    const requestKey = `${effectiveSourceSchemaId}-${effectiveSourceId}-${targetSchemaId}-${relationTypeId || 'all'}-${targetSchemaData.id}-${referenceSchema || ''}-${referenceRelationTypeId || ''}-${referenceEntityId || ''}`;
    
    // If the same request is already in flight, skip
    if (inFlightRequestRef.current === requestKey) {
      return;
    }

    isFetchingRelationsRef.current = true;
    inFlightRequestRef.current = requestKey;
    setIsLoadingRelations(true);

    try {
      // Get companyIds param once for all API requests in this function
      const companyIdsParam = getCompanyIdsParam();
      
      // If reference-based filtering is enabled, first fetch entities related to the reference entity
      let referenceFilteredTargetIds: Set<string> | null = null;
      if (referenceSchema && referenceRelationTypeId && referenceEntityId && targetSchemaId) {
        try {
          // Fetch all entities in targetSchema that are related to the reference entity
          const referenceRelationsResponse = await apiRequest<Array<{
            id: string;
            sourceSchema: string;
            sourceId: string;
            targetSchema: string;
            targetId: string;
            relationTypeId: string;
          }>>(
            `/api/relations?sourceSchema=${referenceSchema}&sourceId=${referenceEntityId}&targetSchema=${targetSchemaId}&relationTypeId=${referenceRelationTypeId}&includeInactive=true`,
            {
              params: companyIdsParam,
            }
          );

          if (referenceRelationsResponse.success && Array.isArray(referenceRelationsResponse.data)) {
            referenceFilteredTargetIds = new Set(
              referenceRelationsResponse.data
                .map((rel) => rel.targetId)
                .filter(Boolean)
                .map(String)
            );
          }
        } catch (error) {
          loggingCustom(LogType.CLIENT_LOG, 'warn', `Error fetching reference relations: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Fetch relation metadata (ids) for delete/edit actions
      const relationsMetaResponse = await apiRequest<Array<{
        id: string;
        sourceSchema: string;
        sourceId: string;
        targetSchema: string;
        targetId: string;
        relationTypeId: string;
      }>>(
        `/api/relations?sourceSchema=${effectiveSourceSchemaId}&sourceId=${effectiveSourceId}&targetSchema=${targetSchemaId}${
          relationTypeId ? `&relationTypeId=${relationTypeId}` : ''
        }&includeInactive=true`,
        {
          params: companyIdsParam,
        }
      );

      const relationIdByTargetId = new Map<string, string>();
      if (relationsMetaResponse.success && Array.isArray(relationsMetaResponse.data)) {
        relationsMetaResponse.data.forEach((rel) => {
          if (rel.targetId) {
            const targetIdStr = String(rel.targetId);
            // Apply reference filtering if enabled
            if (referenceFilteredTargetIds === null || referenceFilteredTargetIds.has(targetIdStr)) {
              relationIdByTargetId.set(targetIdStr, rel.id);
            }
          }
        });
      }

      // Remove cache-busting timestamp to allow browser/API caching
      // Only add timestamp when explicitly refreshing (handled by refresh callback)
      const allRelationsUrl = `/api/data/all-relations?schema=${effectiveSourceSchemaId}&id=${effectiveSourceId}&direction=both&otherSchema=${targetSchemaId}${relationTypeId ? `&relationTypeId=${relationTypeId}` : ''}`;

      const allRelationsResponse = await apiRequest<Array<{
        schema: string;
        direction: RelationDirection;
        relation_type: string;
        data: any[];
      }>>(allRelationsUrl, {
        params: companyIdsParam,
      });

      if (allRelationsResponse.success && Array.isArray(allRelationsResponse.data)) {
        const groupedData = allRelationsResponse.data;
        let entities: any[] = [];
        const directionsSet = new Set<RelationDirection>();

        for (const group of groupedData) {
          if (group.schema !== targetSchemaId) continue;
          if (relationTypeId && group.relation_type !== relationTypeId) continue;

          // Apply reference filtering if enabled
          let filteredData = group.data;
          if (referenceFilteredTargetIds !== null) {
            filteredData = group.data.filter((item) => 
              item?.id && referenceFilteredTargetIds!.has(String(item.id))
            );
          }

          if (filteredData.length === 0) continue;

          directionsSet.add(group.direction);
          const annotatedData = filteredData.map((item) => ({
            ...item,
            __relationType: group.relation_type,
            __relationId: relationIdByTargetId.get(String(item?.id)) || null,
          }));
          entities.push(...annotatedData);
        }

        // Fallback: If all-relations returned empty but we have relations, fetch entities directly
        if (entities.length === 0 && relationIdByTargetId.size > 0) {
          const uniqueTargetIds = Array.from(relationIdByTargetId.keys());
          
          // Special handling for "schemas" schema - use /api/schemas endpoint
          const isSchemasSchema = targetSchemaId === 'schemas';
          const baseEndpoint = isSchemasSchema ? '/api/schemas' : `/api/data/${targetSchemaId}`;
          
          try {
            if (isSchemasSchema) {
              // For schemas, fetch individually (schemas endpoint doesn't support batch)
              const fetchPromises = uniqueTargetIds.map(async (targetId) => {
                try {
                  const entityResponse = await apiRequest<any>(`${baseEndpoint}/${targetId}`);
                  if (entityResponse.success && entityResponse.data) {
                    return {
                      ...entityResponse.data,
                      __relationType: relationTypeId || '',
                      __relationId: relationIdByTargetId.get(targetId) || null,
                    };
                  }
                  return null;
                } catch (error) {
                  loggingCustom(LogType.CLIENT_LOG, 'error', `Error fetching schema ${targetId}: ${error instanceof Error ? error.message : String(error)}`);
                  return null;
                }
              });

              const fetchedEntities = await Promise.all(fetchPromises);
              entities = fetchedEntities.filter((entity): entity is any => entity !== null);
              
              if (entities.length > 0) {
                directionsSet.add('source');
              }
            } else {
              // For regular schemas, try batch fetch first
              const batchResponse = await apiRequest<any[]>(baseEndpoint, {
                params: {
                  includeIds: uniqueTargetIds.join(','),
                },
              });

              if (batchResponse.success && Array.isArray(batchResponse.data)) {
                const entityMap = new Map<string, any>(
                  batchResponse.data.map((entity) => [String(entity.id), entity])
                );

                entities = uniqueTargetIds
                  .map((targetId) => {
                    const entity = entityMap.get(targetId);
                    if (entity) {
                      return {
                        ...entity,
                        __relationType: relationTypeId || '',
                        __relationId: relationIdByTargetId.get(targetId) || null,
                      };
                    }
                    return null;
                  })
                  .filter((entity): entity is any => entity !== null);

                // Add direction if we have entities
                if (entities.length > 0) {
                  directionsSet.add('source');
                }
              } else {
                // Fallback to individual fetches
                const fetchPromises = uniqueTargetIds.map(async (targetId) => {
                  try {
                    const entityResponse = await apiRequest<any>(`${baseEndpoint}/${targetId}`);
                    if (entityResponse.success && entityResponse.data) {
                      return {
                        ...entityResponse.data,
                        __relationType: relationTypeId || '',
                        __relationId: relationIdByTargetId.get(targetId) || null,
                      };
                    }
                    return null;
                  } catch (error) {
                    loggingCustom(LogType.CLIENT_LOG, 'error', `Error fetching entity ${targetId}: ${error instanceof Error ? error.message : String(error)}`);
                    return null;
                  }
                });

                const fetchedEntities = await Promise.all(fetchPromises);
                entities = fetchedEntities.filter((entity): entity is any => entity !== null);
                
                if (entities.length > 0) {
                  directionsSet.add('source');
                }
              }
            }
          } catch (error) {
            loggingCustom(LogType.CLIENT_LOG, 'error', `Error in fallback entity fetch: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        if (targetSchemaData?.fields?.length && entities.length > 0) {
          const pickerFields = targetSchemaData.fields.filter(
            (field: any) => field.component === 'picker' && field.targetSchema
          );

          const resolvedPromises = entities.map(async (entity) => {
            await Promise.all(
              pickerFields
                .filter((field: any) => entity[field.name])
                .map(async (field: any) => {
                  const fieldValue = entity[field.name];
                  if (typeof fieldValue !== 'string' || fieldValue.trim() === '') {
                    return;
                  }

                  try {
                    const resolvedResponse = await apiRequest<any>(
                      `/api/data/${field.targetSchema}/${fieldValue}`
                    );
                    if (resolvedResponse.success && resolvedResponse.data) {
                      const resolvedEntity = resolvedResponse.data;
                      let resolvedLabel = resolvedEntity.name || resolvedEntity.title || fieldValue;

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

                      entity[`_${field.name}_resolved`] = {
                        ...resolvedEntity,
                        _resolvedLabel: resolvedLabel,
                      };
                    }
                  } catch (error) {
                    loggingCustom(LogType.CLIENT_LOG, 'error', `Error resolving picker field ${field.name}: ${error instanceof Error ? error.message : String(error)}`);
                  }
                })
            );
            return entity;
          });

          entities = await Promise.all(resolvedPromises);
        }

        setRelatedEntities(entities);
        setRelationDirections(directionsSet);
      } else {
        // If all-relations failed but we have relations metadata, try fallback fetch
        if (relationIdByTargetId.size > 0) {
          const uniqueTargetIds = Array.from(relationIdByTargetId.keys());
          
          // Special handling for "schemas" schema - use /api/schemas endpoint
          const isSchemasSchema = targetSchemaId === 'schemas';
          const baseEndpoint = isSchemasSchema ? '/api/schemas' : `/api/data/${targetSchemaId}`;
          
          try {
            let fallbackEntities: any[] = [];
            
            if (isSchemasSchema) {
              // For schemas, fetch individually (schemas endpoint doesn't support batch)
              const fetchPromises = uniqueTargetIds.map(async (targetId) => {
                try {
                  const entityResponse = await apiRequest<any>(`${baseEndpoint}/${targetId}`);
                  if (entityResponse.success && entityResponse.data) {
                    return {
                      ...entityResponse.data,
                      __relationType: relationTypeId || '',
                      __relationId: relationIdByTargetId.get(targetId) || null,
                    };
                  }
                  return null;
                } catch (error) {
                  loggingCustom(LogType.CLIENT_LOG, 'error', `Error fetching schema ${targetId}: ${error instanceof Error ? error.message : String(error)}`);
                  return null;
                }
              });

              const fetchedEntities = await Promise.all(fetchPromises);
              fallbackEntities = fetchedEntities.filter((entity): entity is any => entity !== null);
            } else {
              // For regular schemas, try batch fetch first
              const batchResponse = await apiRequest<any[]>(baseEndpoint, {
                params: {
                  includeIds: uniqueTargetIds.join(','),
                },
              });
              
              if (batchResponse.success && Array.isArray(batchResponse.data)) {
                const entityMap = new Map<string, any>(
                  batchResponse.data.map((entity) => [String(entity.id), entity])
                );

                fallbackEntities = uniqueTargetIds
                  .map((targetId) => {
                    const entity = entityMap.get(targetId);
                    if (entity) {
                      return {
                        ...entity,
                        __relationType: relationTypeId || '',
                        __relationId: relationIdByTargetId.get(targetId) || null,
                      };
                    }
                    return null;
                  })
                  .filter((entity): entity is any => entity !== null);
              } else {
                // Fallback to individual fetches
                const fetchPromises = uniqueTargetIds.map(async (targetId) => {
                  try {
                    const entityResponse = await apiRequest<any>(`${baseEndpoint}/${targetId}`);
                    if (entityResponse.success && entityResponse.data) {
                      return {
                        ...entityResponse.data,
                        __relationType: relationTypeId || '',
                        __relationId: relationIdByTargetId.get(targetId) || null,
                      };
                    }
                    return null;
                  } catch (error) {
                    loggingCustom(LogType.CLIENT_LOG, 'error', `Error fetching entity ${targetId}: ${error instanceof Error ? error.message : String(error)}`);
                    return null;
                  }
                });

                const fetchedEntities = await Promise.all(fetchPromises);
                fallbackEntities = fetchedEntities.filter((entity): entity is any => entity !== null);
              }
            }

            if (fallbackEntities.length > 0) {
              // Resolve picker fields if needed
              if (targetSchemaData?.fields?.length) {
                const pickerFields = targetSchemaData.fields.filter(
                  (field: any) => field.component === 'picker' && field.targetSchema
                );

                const resolvedPromises = fallbackEntities.map(async (entity) => {
                  await Promise.all(
                    pickerFields
                      .filter((field: any) => entity[field.name])
                      .map(async (field: any) => {
                        const fieldValue = entity[field.name];
                        if (typeof fieldValue !== 'string' || fieldValue.trim() === '') {
                          return;
                        }

                        try {
                          const resolvedResponse = await apiRequest<any>(
                            `/api/data/${field.targetSchema}/${fieldValue}`
                          );
                          if (resolvedResponse.success && resolvedResponse.data) {
                            const resolvedEntity = resolvedResponse.data;
                            let resolvedLabel = resolvedEntity.name || resolvedEntity.title || fieldValue;

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

                            entity[`_${field.name}_resolved`] = {
                              ...resolvedEntity,
                              _resolvedLabel: resolvedLabel,
                            };
                          }
                        } catch (error) {
                          loggingCustom(LogType.CLIENT_LOG, 'error', `Error resolving picker field ${field.name}: ${error instanceof Error ? error.message : String(error)}`);
                        }
                      })
                  );
                  return entity;
                });

                fallbackEntities = await Promise.all(resolvedPromises);
              }

              setRelatedEntities(fallbackEntities);
              setRelationDirections(new Set(['source']));
            } else {
              setRelatedEntities([]);
              setRelationDirections(new Set());
            }
          } catch (error) {
            loggingCustom(LogType.CLIENT_LOG, 'error', `Error in fallback entity fetch: ${error instanceof Error ? error.message : String(error)}`);
            setRelatedEntities([]);
            setRelationDirections(new Set());
          }
        } else {
          setRelatedEntities([]);
          setRelationDirections(new Set());
        }
      }
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error fetching relations: ${error instanceof Error ? error.message : String(error)}`);
      setRelatedEntities([]);
      setRelationDirections(new Set());
    } finally {
      setIsLoadingRelations(false);
      isFetchingRelationsRef.current = false;
      inFlightRequestRef.current = null;
    }
  }, [
    effectiveSourceId,
    effectiveSourceSchemaId,
    isRelationBased,
    relationTypeId,
    targetSchemaData?.id, // Use targetSchemaData.id instead of whole object to prevent unnecessary re-fetches
    targetSchemaId,
    referenceSchema,
    referenceRelationTypeId,
    referenceEntityId,
  ]);

  useEffect(() => {
    if (!isRelationBased || !effectiveSourceId || !targetSchemaId || !targetSchemaData) {
      return;
    }

    // Include targetSchemaData.id in the key to ensure we refetch if schema changes
    const fetchKey = `${effectiveSourceSchemaId}-${effectiveSourceId}-${targetSchemaId}-${relationTypeId || 'all'}-${targetSchemaData.id}-${referenceSchema || ''}-${referenceRelationTypeId || ''}-${referenceEntityId || ''}`;
    if (lastFetchParamsRef.current === fetchKey) {
      return;
    }

    lastFetchParamsRef.current = fetchKey;
    fetchRelations();
  }, [
    effectiveSourceId,
    effectiveSourceSchemaId,
    fetchRelations,
    isRelationBased,
    relationTypeId,
    targetSchemaId,
    targetSchemaData?.id, // Use targetSchemaData.id instead of whole object
    referenceSchema,
    referenceRelationTypeId,
    referenceEntityId,
  ]);

  const section = useMemo(
    () => schema.sections?.find((s) => s.id === config.sectionId),
    [config.sectionId, schema.sections]
  );

  const sectionData = useMemo(() => {
    if (isRelationBased) {
      return relatedEntities;
    }

    const repeatingData = data?.[config.sectionId];
    return Array.isArray(repeatingData) ? repeatingData : [];
  }, [config.sectionId, data, isRelationBased, relatedEntities]);

  const fieldsToUse = useMemo(() => {
    if (isRelationBased && targetSchemaData) {
      return targetSchemaData.fields || [];
    }

    if (!isRelationBased && section) {
      return (
        schema.fields?.filter((field: any) => field.sectionId === config.sectionId) || []
      );
    }

    return [];
  }, [config.sectionId, isRelationBased, schema.fields, section, targetSchemaData]);

  const schemaForColumns = isRelationBased && targetSchemaData ? targetSchemaData : schema;

  const fieldsToDisplay = useMemo(() => {
    if (config.columns && config.columns.length > 0) {
      return config.columns
        .map((fieldId) => resolveFieldById(schemaForColumns, fieldId))
        .filter(Boolean);
    }

    if (isRelationBased && targetSchemaData) {
      return targetSchemaData.fields || [];
    }

    return fieldsToUse;
  }, [config.columns, fieldsToUse, isRelationBased, schemaForColumns, targetSchemaData]);

  const relationTypeTexts = useMemo(() => {
    if (!isRelationBased) {
      return [];
    }

    if (relationTypeId) {
      const formatted = formatRelationType(relationTypeId);
      return formatted ? [formatted] : [];
    }

    const typesFromData = (sectionData as any[])?.map((item) => item?.__relationType).filter(Boolean);
    if (!typesFromData?.length) {
      return [];
    }

    const unique = Array.from(new Set(typesFromData));
    return unique
      .map((type) => formatRelationType(type) || type)
      .filter(Boolean) as string[];
  }, [isRelationBased, relationTypeId, sectionData]);

  const relationInfo: RelationInfo = useMemo(
    () => ({ directions: relationDirections, relationTypeTexts }),
    [relationDirections, relationTypeTexts]
  );

  const refresh = useCallback(async () => {
    if (isRelationBased) {
      // Reset the fetch params ref to force a fresh fetch
      lastFetchParamsRef.current = '';
      // Reset the fetching flags to allow immediate fetch
      isFetchingRelationsRef.current = false;
      inFlightRequestRef.current = null;
      await fetchRelations();
    }
  }, [fetchRelations, isRelationBased]);

  return {
    isRelationBased,
    section,
    sectionData,
    fieldsToDisplay,
    targetSchemaData,
    isLoadingRelations,
    isLoadingTargetSchema,
    relationInfo,
    refresh,
  };
}


