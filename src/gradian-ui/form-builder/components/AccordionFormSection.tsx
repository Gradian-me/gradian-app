// Accordion Form Section Component

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { FormSectionProps } from '@/gradian-ui/schema-manager/types/form-schema';
import { FormElementFactory } from '../form-elements';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { ChevronDown, ChevronRight, ChevronLeft, Edit, Trash2, RefreshCw, X } from 'lucide-react';
import { cn } from '../../shared/utils';
import { getFieldsForSection, getValueByRole, getSingleValueByRole, getFieldsByRole, getArrayValuesByRole } from '../form-elements/utils/field-resolver';
import { FormAlert } from '../../../components/ui/form-alert';
import { DataRelation, FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { cacheSchemaClientSide } from '@/gradian-ui/schema-manager/utils/schema-client-cache';
import { getSchemaWithClientCache } from '@/gradian-ui/schema-manager/utils/client-schema-cache';
import { asFormBuilderSchema } from '@/gradian-ui/schema-manager/utils/schema-utils';
import { FormModal } from './FormModal';
import { Rating, PopupPicker, ConfirmationMessage, AddButtonFull, CodeBadge, Badge } from '../form-elements';
import { Skeleton } from '../../../components/ui/skeleton';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { getInitials, getBadgeConfig, mapBadgeColorToVariant } from '../../data-display/utils';
import { getPrimaryDisplayString } from '../../data-display/utils/value-display';
import { NormalizedOption } from '../form-elements/utils/option-normalizer';
import { BadgeViewer } from '../form-elements/utils/badge-viewer';
import { UI_PARAMS } from '@/gradian-ui/shared/configs/ui-config';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DynamicCardRenderer } from '../../data-display/components/DynamicCardRenderer';
import { ViewSwitcher } from '@/gradian-ui/data-display/components/ViewSwitcher';
import { toast } from 'sonner';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage, getTranslationsArray, isRTL } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { getSectionTranslatedTitle, getSectionTranslatedDescription } from '@/gradian-ui/schema-manager/utils/schema-utils';
import { apiRequest } from '@/gradian-ui/shared/utils/api';


export const AccordionFormSection: React.FC<FormSectionProps> = ({
  section,
  schema,
  values,
  errors,
  touched,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  repeatingItems,
  onAddRepeatingItem,
  onRemoveRepeatingItem,
  initialState = 'expanded', // New prop for initial state
  isExpanded: controlledIsExpanded, // Controlled expanded state
  onToggleExpanded, // Callback to toggle expanded state
  addItemError, // Error message to display under the Add button
  refreshRelationsTrigger, // Trigger to refresh relations
  isAddingItem = false, // Whether the add item modal is currently open (for loading state)
  pendingSelectedIds = [],
  pendingSelectedEntities = {},
  pendingAddedIds = [],
  pendingAddedEntities = {},
  onAddPendingSelected,
  onRemovePending,
  annotationMode,
  onElementClick,
  annotatedFields,
}) => {
  // Get fields for this section from the schema
  const fields = getFieldsForSection(schema, section.id);
  const { 
    title: sectionTitle, 
    description: sectionDescription, 
    columns = 2, // Default to 2 columns if not specified
    gap = 4, // Default gap
    styling, 
    isRepeatingSection 
  } = section;
  const language = useLanguageStore((s) => s.language) || getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const isRtl = isRTL(language);
  const title = getSectionTranslatedTitle(section, language, typeof sectionTitle === 'string' ? sectionTitle : section.id);
  const description = getSectionTranslatedDescription(section, language, typeof sectionDescription === 'string' ? (sectionDescription ?? '') : '');
  
  // Check if this is a relation-based repeating section
  const isRelationBased = isRepeatingSection && section.repeatingConfig?.targetSchema && section.repeatingConfig?.relationTypeId;
  const targetSchema = section.repeatingConfig?.targetSchema;
  const relationTypeId = section.repeatingConfig?.relationTypeId;
  
  // State for relation-based sections
  const [relatedEntities, setRelatedEntities] = useState<any[]>([]);
  const [relations, setRelations] = useState<DataRelation[]>([]);
  const [isLoadingRelations, setIsLoadingRelations] = useState(false);
  const [editEntityId, setEditEntityId] = useState<string | null>(null);
  const [editRelationId, setEditRelationId] = useState<string | null>(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    relationId: string | null;
  }>({ open: false, relationId: null });
  const [targetSchemaData, setTargetSchemaData] = useState<FormSchema | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [naConfirmDialog, setNaConfirmDialog] = useState<{
    open: boolean;
    willEnable: boolean;
  }>({ open: false, willEnable: false });
  const [inlineDeleteDialog, setInlineDeleteDialog] = useState<{
    open: boolean;
    index: number | null;
  }>({ open: false, index: null });
  const [sectionView, setSectionView] = useState<'grid' | 'list'>('grid');
  const queryClient = useQueryClient();
  const editTitle = getT(TRANSLATION_KEYS.BUTTON_EDIT, language, defaultLang);
  const deleteTitle = getT(TRANSLATION_KEYS.BUTTON_DELETE, language, defaultLang);
  const addLabel = getT(TRANSLATION_KEYS.BUTTON_ADD, language, defaultLang);
  const addRelationText = getT(TRANSLATION_KEYS.BUTTON_ADD_RELATION, language, defaultLang);
  const noItemsAddedYet = getT(TRANSLATION_KEYS.EMPTY_NO_ITEMS_ADDED_YET, language, defaultLang);

  // Get current entity ID from form values (for creating relations)
  const currentEntityId = values?.id || (values as any)?.[schema.id]?.id;
  const sourceSchemaId = schema.id;
  
  // Check if section is eligible for N.A switch
  // Eligible if: IS a repeating section, AND NOT a repeating section with minItems > 1, AND showNotApplicable is explicitly true
  const isEligibleForNA = isRepeatingSection && (section.repeatingConfig?.minItems ?? 0) <= 1;
  const showNotApplicableSwitch = section.showNotApplicable === true && isEligibleForNA;
  
  // Read N.A state from form values (sections array)
  const sectionsNAArray = Array.isArray(values?.sections) ? values.sections : [];
  const sectionNAEntry = sectionsNAArray.find((s: any) => s.sectionId === section.id);
  const isNotApplicable = sectionNAEntry?.isNA === true;
  
  // Get addType from config (default: 'addOnly')
  const addType = section.repeatingConfig?.addType || 'addOnly';
  
  // Helper function to format relation type ID (e.g., HAS_APPLICATION -> Has Application)
  const formatRelationTypeId = (relationTypeId: string | undefined): string | null => {
    if (!relationTypeId) return null;
    const cleaned = relationTypeId.replace(/_/g, ' ').toLowerCase();
    return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
  };
  
  const formattedRelationType = formatRelationTypeId(relationTypeId);
  
  // Fetch target schema
  useEffect(() => {
    if (targetSchema) {
      const fetchTargetSchema = async () => {
        try {
          const cachedOrFresh = await getSchemaWithClientCache(targetSchema);
          if (cachedOrFresh && cachedOrFresh.id) {
            const normalized = asFormBuilderSchema(cachedOrFresh as any);
            await cacheSchemaClientSide(normalized, { queryClient, persist: false });
            setTargetSchemaData(normalized);
          } else {
            setTargetSchemaData(null);
          }
        } catch (error) {
          loggingCustom(LogType.CLIENT_LOG, 'error', `Error fetching target schema: ${error instanceof Error ? error.message : String(error)}`);
        }
      };
      fetchTargetSchema();
    }
  }, [targetSchema, queryClient]);

  // Fetch relations and related entities function
  const fetchRelations = React.useCallback(async () => {
    if (!isRelationBased || !currentEntityId || !targetSchema || !relationTypeId) {
      return;
    }
    
    setIsLoadingRelations(true);
    try {
      // Build query params ensuring 'id' is always last
      const queryParams = new URLSearchParams();
      queryParams.append('sourceSchema', sourceSchemaId);
      queryParams.append('sourceId', currentEntityId);
      queryParams.append('targetSchema', targetSchema);
      queryParams.append('relationTypeId', relationTypeId);
      // Do not pass includeInactive so the API excludes inactive relations (same as validation count)
      // If id needs to be added, append it here as the last parameter
      
      // Fetch relations
      const relationsResponse = await apiRequest<DataRelation[]>(
        `/api/relations?${queryParams.toString()}`
      );
      
      if (relationsResponse.success && relationsResponse.data) {
        // API returns { success: true, data: DataRelation[], count: number }
        const relationsList = Array.isArray(relationsResponse.data) 
          ? relationsResponse.data 
          : [];
        setRelations(relationsList);

        if (!targetSchema || relationsList.length === 0) {
          setRelatedEntities([]);
          return;
        }

        const uniqueTargetIds = Array.from(
          new Set(
            relationsList
              .map((relation: DataRelation) => relation.targetId)
              .filter((id): id is string => Boolean(id))
          )
        );

        let resolvedEntities: any[] = [];

        if (uniqueTargetIds.length > 0) {
          const isSchemasSchema = targetSchema === 'schemas';

          if (!isSchemasSchema) {
            // Try batch fetch first for regular schemas
          const batchResponse = await apiRequest<any[]>(`/api/data/${targetSchema}`, {
            params: {
              includeIds: uniqueTargetIds.join(','),
            },
          });

          if (batchResponse.success && Array.isArray(batchResponse.data)) {
            const entityMap = new Map<string, any>(
              batchResponse.data.map((entity: any) => [String(entity.id), entity])
            );

            resolvedEntities = relationsList
              .map((relation: DataRelation) => entityMap.get(relation.targetId))
              .filter((entity): entity is any => Boolean(entity));
            }
          }

          // If schemas schema or batch failed/empty, fall back to individual fetches
          if (resolvedEntities.length === 0) {
            const fallbackEntities = await Promise.all(
              relationsList.map(async (relation: DataRelation) => {
                try {
                  if (isSchemasSchema) {
                    const entityResponse = await apiRequest<any>(`/api/schemas/${relation.targetId}`);
                    return entityResponse.success && entityResponse.data ? entityResponse.data : null;
                  }
                const entityResponse = await apiRequest<any>(`/api/data/${targetSchema}/${relation.targetId}`);
                return entityResponse.success && entityResponse.data ? entityResponse.data : null;
                } catch (error) {
                  loggingCustom(LogType.CLIENT_LOG, 'error', `Error fetching related entity ${relation.targetId}: ${error instanceof Error ? error.message : String(error)}`);
                  return null;
                }
              })
            );
            resolvedEntities = fallbackEntities.filter((entity): entity is any => Boolean(entity));
          }
        }

        setRelatedEntities(resolvedEntities);
      }
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error fetching relations: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingRelations(false);
    }
  }, [isRelationBased, currentEntityId, targetSchema, relationTypeId, sourceSchemaId]);
  
  // Fetch relations and related entities for relation-based sections
  useEffect(() => {
    fetchRelations();
  }, [fetchRelations, refreshRelationsTrigger]); // Also refresh when trigger changes

  const pendingSelectedEntitiesList = React.useMemo(() => {
    return (pendingSelectedIds || []).map(id => (pendingSelectedEntities || {})[id] ?? { id });
  }, [pendingSelectedIds, pendingSelectedEntities]);
  const pendingAddedEntitiesList = React.useMemo(() => {
    return (pendingAddedIds || []).map(id => (pendingAddedEntities || {})[id] ?? { id });
  }, [pendingAddedIds, pendingAddedEntities]);

  useEffect(() => {
    if (!isRelationBased || !onChange) {
      return;
    }

    const allItems = [...relatedEntities, ...pendingSelectedEntitiesList, ...pendingAddedEntitiesList];
    const normalized = allItems.map((entity) => {
      const label = targetSchemaData
        ? (getValueByRole(targetSchemaData, entity, 'title') || entity.name || entity.title || String(entity.id))
        : (entity.name || entity.title || String(entity.id));
      return {
        id: String(entity.id ?? ''),
        label,
      };
    });

    const currentValue = Array.isArray(values?.[section.id]) ? values[section.id] : [];
    const currentSerialized = JSON.stringify(currentValue);
    const normalizedSerialized = JSON.stringify(normalized);

    if (currentSerialized !== normalizedSerialized) {
      onChange(section.id, normalized);
    }
  }, [isRelationBased, relatedEntities, pendingSelectedEntitiesList, pendingAddedEntitiesList, onChange, section.id, targetSchemaData, values]);
  
  
  // Check if sections are collapsible (default to true for backward compatibility)
  const isCollapsible = schema.isCollapsibleSections !== false;
  
  // Use controlled state if provided, otherwise use internal state
  const [internalIsExpanded, setInternalIsExpanded] = useState(initialState === 'expanded');
  // If not collapsible, always keep expanded
  // If N.A is active, force collapse
  const isExpanded = isCollapsible 
    ? (isNotApplicable ? false : (controlledIsExpanded !== undefined ? controlledIsExpanded : internalIsExpanded))
    : (!isNotApplicable);
  
  // Get section-level error
  const sectionError = errors?.[section.id];
  const sectionErrorValue = typeof sectionError === 'string' ? sectionError : undefined;
  let displaySectionError = sectionErrorValue;

  const relatedValueArray = Array.isArray(values?.[section.id]) ? values[section.id] : [];

  // If relation-based repeating section already has related or pending entities, suppress min-item validation message
  if (section.isRepeatingSection && section.repeatingConfig?.targetSchema && sectionError) {
    const totalItems = (relatedEntities?.length ?? 0) + (pendingSelectedIds?.length ?? 0) + (pendingAddedIds?.length ?? 0);
    if (totalItems > 0 || relatedValueArray.length > 0) {
      displaySectionError = undefined;
    }
  }

  const toggleExpanded = () => {
    if (onToggleExpanded) {
      // Use controlled toggle if provided
      onToggleExpanded();
    } else {
      // Use internal state toggle
      setInternalIsExpanded(!internalIsExpanded);
    }
  };

  // List/grid view should control how repeating *items* are laid out, not force fields inside each item to full width.
  // Field layout must always respect section columns/colSpan.
  const effectiveColumns = columns;

  const sectionClasses = cn(
    'space-y-3',
    styling?.className
  );

  const gridClasses = cn(
    'grid gap-3',
    effectiveColumns === 1 && 'grid-cols-1',
    effectiveColumns === 2 && 'grid-cols-1 md:grid-cols-2',
    effectiveColumns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    effectiveColumns === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    effectiveColumns === 6 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-6',
    effectiveColumns === 12 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-12',
    gap !== undefined && gap !== null && gap !== 0 && `gap-${gap}`
  );

  const repeatingItemsContainerClass =
    sectionView === 'list'
      ? 'space-y-3'
      : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4';

  // Helper function to determine column span based on width
  const getColSpan = (field: any): number => {
    // First check for explicit colSpan at field level
    if (field.colSpan != null) {
      return field.colSpan;
    }
    
    // Fallback to layout.colSpan for backward compatibility
    if (field.layout?.colSpan != null) {
      return field.layout.colSpan;
    }

    // Then check for width percentages and convert to colSpan
    const width = field.layout?.width;
    
    if (width === '100%') {
      return effectiveColumns; // Full width spans all columns
    } else if (width === '50%') {
      return Math.ceil(effectiveColumns / 2); // Half width
    } else if (width === '33.33%' || width === '33.3%') {
      return Math.ceil(effectiveColumns / 3); // One third width
    } else if (width === '25%') {
      return Math.ceil(effectiveColumns / 4); // One fourth width
    } else if (width === '66.66%' || width === '66.6%') {
      return Math.ceil((effectiveColumns / 3) * 2); // Two thirds width
    } else if (width === '75%') {
      return Math.ceil((effectiveColumns / 4) * 3); // Three fourths width
    }
    
    // Default to 1 column if no width specified
    return 1;
  };

  const renderFields = (fieldsToRender: typeof fields, itemIndex?: number) => {
    // Filter and sort fields (excluding hidden/inactive) to ensure correct order
    const visibleFields = fieldsToRender
      .filter(field => field && !field.hidden && !(field as any).layout?.hidden && !field.inactive)
      .sort((a, b) => {
        const orderA = a.order ?? 999;
        const orderB = b.order ?? 999;
        return orderA - orderB;
      });

    return (
      <>
        {visibleFields.map((field, index) => {

          // Build name/value/error/touched for normal vs repeating sections
          const isItem = itemIndex !== undefined && isRepeatingSection;

          const fieldName = isItem 
            ? `${section.id}[${itemIndex}].${field.name}`
            : field.name;

          // Safe access helpers for nested structures
          const nestedValues = (values as any) || {};
          const nestedErrors = (errors as any) || {};
          const nestedTouched = (touched as any) || {};

          let fieldValue = isItem 
            ? nestedValues?.[section.id]?.[itemIndex]?.[field.name]
            : nestedValues?.[field.name];
          
          // Use defaultValue if value is undefined, null, or empty string
          if ((fieldValue === undefined || fieldValue === null || fieldValue === '') && field.defaultValue !== undefined) {
            fieldValue = field.defaultValue;
          }

          const fieldError = isItem 
            ? (nestedErrors?.[section.id]?.[itemIndex]?.[field.name] 
                || nestedErrors?.[`${section.id}[${itemIndex}].${field.name}`])
            : nestedErrors?.[field.name];

          const fieldTouched = isItem 
            ? Boolean(
                nestedTouched?.[section.id]?.[itemIndex]?.[field.name] 
                || nestedTouched?.[`${section.id}[${itemIndex}].${field.name}`]
              )
            : Boolean(nestedTouched?.[field.name]);

          // Calculate column span for this field
          const colSpan = getColSpan(field);
          
          // Generate the appropriate column span class
          // Default to single column on mobile to avoid overlap,
          // and apply the actual span at md and up.
          let colSpanClass = 'col-span-1';
          if (colSpan === effectiveColumns) {
            colSpanClass = 'col-span-1 md:col-span-full';
          } else {
            // For responsive layouts at md+
            if (effectiveColumns === 3) {
              if (colSpan === 2) {
                colSpanClass = 'col-span-1 md:col-span-2';
              }
            } else if (effectiveColumns === 2) {
              if (colSpan === 2) {
                colSpanClass = 'col-span-1 md:col-span-2';
              }
            } else if (effectiveColumns === 4) {
              if (colSpan === 2) {
                colSpanClass = 'col-span-1 md:col-span-2';
              } else if (colSpan === 3) {
                colSpanClass = 'col-span-1 md:col-span-3';
              }
            } else if (effectiveColumns === 6 || effectiveColumns === 12) {
              colSpanClass = `col-span-1 md:col-span-${colSpan}`;
            } else {
              // Default for other column counts
              colSpanClass = `col-span-1 md:col-span-${colSpan}`;
            }
          }

          const hasAnnotation =
            Array.isArray(annotatedFields) && annotatedFields.includes(fieldName);

          return (
            <div
              key={field.id}
              className={cn(
                'space-y-2',
                colSpanClass,
                (field as any).layout?.rowSpan && `row-span-${(field as any).layout.rowSpan}`
              )}
              style={{ order: field.order ?? (field as any).layout?.order }}
            >
              <div
                className={annotationMode ? 'cursor-target w-full' : undefined}
                {...(annotationMode && onElementClick
                  ? {
                      'data-field-id': fieldName,
                      onClick: (e: React.MouseEvent) => {
                        const target = e.target as HTMLElement | null;
                        const labelEl = target?.closest('[data-annotation-label="true"]');
                        if (!labelEl) {
                          return;
                        }
                        e.stopPropagation();
                        onElementClick(fieldName, (field as any).label);
                      },
                    }
                  : {})}
              >
                <FormElementFactory
                  field={field as any}
                  value={fieldValue}
                  error={fieldError}
                  touched={fieldTouched}
                  onChange={(value) => onChange(fieldName, value)}
                  onBlur={() => onBlur(fieldName)}
                  onFocus={() => onFocus(fieldName)}
                  disabled={disabled || field.disabled || isNotApplicable}
                  hasAnnotation={hasAnnotation}
                />
              </div>
            </div>
          );
        })}
      </>
    );
  };

  // Handler for removing a relation-based item
  const handleRemoveRelation = async (relationId: string) => {
    try {
      const relation = relations.find(r => r.id === relationId);
      const deleteType = section.repeatingConfig?.deleteType || 'itemAndRelation';
      
      // First, delete the relation
      const relationResponse = await apiRequest(`/api/relations/${relationId}`, {
        method: 'DELETE',
        callerName: 'AccordionFormSection.removeRelation',
      });
      
      if (relationResponse.success) {
        // If deleteType is 'itemAndRelation', also delete the target item
        if (deleteType === 'itemAndRelation' && relation && targetSchema) {
          const itemResponse = await apiRequest(`/api/data/${targetSchema}/${relation.targetId}`, {
            method: 'DELETE',
            callerName: 'AccordionFormSection.removeRelation.deleteTarget',
          });
          
          if (!itemResponse.success) {
            loggingCustom(LogType.CLIENT_LOG, 'error', `Failed to delete target item: ${itemResponse.error}`);
            // Relation was deleted but item deletion failed - still refresh to show updated state
          }
        }
        
        // Refresh relations to get updated data
        fetchRelations();
      }
      setDeleteConfirmDialog({ open: false, relationId: null });
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error removing relation: ${error instanceof Error ? error.message : String(error)}`);
      setDeleteConfirmDialog({ open: false, relationId: null });
    }
  };
  
  // Handler to open delete confirmation
  const handleDeleteClick = (relationId: string, e?: React.MouseEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    setDeleteConfirmDialog({ open: true, relationId });
  };

  // Handler for editing a related entity
  const handleEditEntity = (entityId: string, relationId: string) => {
    setEditEntityId(entityId);
    setEditRelationId(relationId);
  };

  // Handler for selecting an item from popup picker
  const handleSelectFromPicker = async (selectedItems: NormalizedOption[], rawItems: any[]) => {
    if (!currentEntityId) {
      toast.error('Cannot create relation', {
        description: 'Source entity ID is missing. Please save the form first.',
      });
      setIsPickerOpen(false);
      return;
    }
    if (!relationTypeId || !targetSchema) {
      toast.error('Cannot create relation', {
        description: 'Relation type or target schema is not configured for this section.',
      });
      setIsPickerOpen(false);
      return;
    }

    const normalizedSelections = Array.isArray(selectedItems) ? selectedItems : [];
    const selectionIds = normalizedSelections.map((s) => s?.id).filter((id): id is string => Boolean(id));
    const rawItemIds = Array.isArray(rawItems) ? rawItems.map((item) => item?.id).filter((id): id is string => Boolean(id)) : [];
    const allCandidateIds = Array.from(new Set([...selectionIds, ...rawItemIds]));

    const existingRelationKeys = new Set(
      relations.map((r) => `${r.sourceSchema}:${r.sourceId}:${r.targetSchema}:${r.targetId}:${r.relationTypeId}`)
    );
    const inPendingSelected = new Set([...(pendingSelectedIds || [])]);
    const toCreateIds = allCandidateIds.filter((targetId) => {
      const relationKey = `${sourceSchemaId}:${currentEntityId}:${targetSchema}:${targetId}:${relationTypeId}`;
      return !existingRelationKeys.has(relationKey) && !inPendingSelected.has(targetId);
    });

    const skippedCount = allCandidateIds.length - toCreateIds.length;
    if (toCreateIds.length === 0) {
      toast.info('Relations already exist', {
        description: skippedCount === 1
          ? 'This item is already linked or pending.'
          : `All ${skippedCount} selected items are already linked or pending.`,
      });
      setIsPickerOpen(false);
      return;
    }

    if (onAddPendingSelected) {
      const rawById: Record<string, any> = {};
      (Array.isArray(rawItems) ? rawItems : []).forEach((r) => {
        if (r?.id != null) rawById[String(r.id)] = r;
      });
      const entities = toCreateIds.map((id) => rawById[id] ?? { id });
      onAddPendingSelected(section.id, toCreateIds, entities);
      toast.success('Items added', {
        description: `${toCreateIds.length} item(s) will be linked when you save the form.`,
      });
      setIsPickerOpen(false);
      return;
    }

    try {
      const operations = toCreateIds.map((targetId) =>
        apiRequest('/api/relations', {
          method: 'POST',
          body: {
            sourceSchema: sourceSchemaId,
            sourceId: currentEntityId,
            targetSchema: targetSchema,
            targetId,
            relationTypeId,
          },
          callerName: 'AccordionFormSection.createRelationsFromPicker',
        })
      );
      const results = await Promise.all(operations);
      const successCount = results.filter((r) => r?.success).length;
      const failureCount = results.filter((r) => !r?.success).length;
      if (failureCount > 0) {
        toast.warning('Partial success', {
          description: `Created ${successCount}, ${failureCount} failed.`,
        });
      } else {
        toast.success('Relations created', {
          description: `Successfully linked ${successCount} item(s).`,
        });
      }
      await fetchRelations();
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error creating relation from picker: ${error instanceof Error ? error.message : String(error)}`);
      toast.error('Error creating relation', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
      setIsPickerOpen(false);
    }
  };

  // Get already selected IDs to exclude from picker (includes pending)
  const selectedIds = React.useMemo(() => {
    const fromRels = relations.map(r => r.targetId);
    const fromPending = [...(pendingSelectedIds || []), ...(pendingAddedIds || [])];
    return Array.from(new Set([...fromRels, ...fromPending]));
  }, [relations, pendingSelectedIds, pendingAddedIds]);
  const shouldExcludeIds = section.repeatingConfig?.isUnique === true;

  const itemsToDisplayMerged = React.useMemo(() => {
    return [...relatedEntities, ...pendingSelectedEntitiesList, ...pendingAddedEntitiesList];
  }, [relatedEntities, pendingSelectedEntitiesList, pendingAddedEntitiesList]);

  // Helper function to check if section has any items/values
  const hasSectionItems = (): boolean => {
    if (isRelationBased) {
      return itemsToDisplayMerged.length > 0;
    }
    
    // For non-relation-based repeating sections, check if there are any items
    if (isRepeatingSection && !isRelationBased) {
      return (repeatingItems || []).length > 0;
    }
    
    // For regular sections, check if any field has a non-empty value
    const nestedValues = (values as any) || {};
    return fields.some(field => {
      const fieldValue = nestedValues[field.name];
      // Consider value as non-empty if it's not null, undefined, or empty string
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    });
  };

  // Handler for N.A switch toggle
  const handleNAToggle = (checked: boolean) => {
    if (checked) {
      // If section has no items, enable N.A directly without confirmation
      if (!hasSectionItems()) {
        handleNAEnable();
      } else {
        // Show confirmation dialog when enabling N.A (only if section has items)
        setNaConfirmDialog({ open: true, willEnable: true });
      }
    } else {
      // Disable N.A immediately (no confirmation needed)
      handleNADisable();
    }
  };

  // Handler for disabling N.A (no confirmation needed)
  const handleNADisable = () => {
    // Update sections array in form values
    const currentSections = Array.isArray(values?.sections) ? [...values.sections] : [];
    const existingIndex = currentSections.findIndex((s: any) => s.sectionId === section.id);
    
    // Remove N.A entry
    if (existingIndex >= 0) {
      currentSections.splice(existingIndex, 1);
    }
    
    // Update sections array
    onChange('sections', currentSections.length > 0 ? currentSections : undefined);
  };

  // Handler for enabling N.A (called directly when section is empty, or after confirmation)
  const handleNAEnable = async () => {
    // Update sections array in form values
    const currentSections = Array.isArray(values?.sections) ? [...values.sections] : [];
    const existingIndex = currentSections.findIndex((s: any) => s.sectionId === section.id);
    
    // Enable N.A
    if (existingIndex >= 0) {
      currentSections[existingIndex] = { sectionId: section.id, isNA: true };
    } else {
      currentSections.push({ sectionId: section.id, isNA: true });
    }
    
    // Update sections array
    onChange('sections', currentSections);
    
    // Force collapse accordion
    if (onToggleExpanded && isExpanded) {
      onToggleExpanded();
    } else if (!onToggleExpanded) {
      setInternalIsExpanded(false);
    }
    
    // Clear all field values in the section
    fields.forEach(field => {
      const fieldName = field.name;
      onChange(fieldName, null);
    });
    
    // For relation-based sections, handle deletion based on deleteType
    if (isRelationBased && relations.length > 0) {
      const deleteType = section.repeatingConfig?.deleteType || 'itemAndRelation';
      
      // Delete all relations for this section
      for (const relation of relations) {
        try {
          // First, delete the relation
          const relationResponse = await apiRequest(`/api/relations/${relation.id}`, {
            method: 'DELETE',
          });
          
          if (relationResponse.success) {
            // If deleteType is 'itemAndRelation', also delete the target item
            if (deleteType === 'itemAndRelation' && relation && targetSchema) {
              const itemResponse = await apiRequest(`/api/data/${targetSchema}/${relation.targetId}`, {
                method: 'DELETE',
              });
              
              if (!itemResponse.success) {
                loggingCustom(LogType.CLIENT_LOG, 'error', `Failed to delete target item: ${itemResponse.error}`);
              }
            }
          }
        } catch (error) {
          loggingCustom(LogType.CLIENT_LOG, 'error', `Error removing relation for N.A: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      // Refresh relations to get updated data
      fetchRelations();
    }
    
    // Clear repeating section items if it's a non-relation-based repeating section
    if (isRepeatingSection && !isRelationBased && repeatingItems && repeatingItems.length > 0) {
      // Remove all items
      for (let i = repeatingItems.length - 1; i >= 0; i--) {
        onRemoveRepeatingItem?.(i);
      }
    }
  };

  // Handler for N.A confirmation (when enabling with items present)
  const handleNAConfirm = async (confirmed: boolean) => {
    setNaConfirmDialog({ open: false, willEnable: false });
    
    if (!confirmed) {
      return;
    }

    // Enable N.A (same logic as handleNAEnable)
    await handleNAEnable();
  };

  // Render entity summary (for relation-based sections) - Beautiful card UI
  const renderEntitySummary = (entity: any, index: number, actionButtons?: React.ReactNode) => {
    if (!targetSchemaData) {
      // Fallback if schema not loaded yet
      const displayField = entity.name || entity.title || entity.id || `Item ${index + 1}`;
      return (
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-gray-900 dark:text-gray-100">
            {displayField}
          </div>
          {actionButtons && (
            <div className="flex gap-1">
              {actionButtons}
            </div>
          )}
        </div>
      );
    }

    // Extract data similar to DynamicCardRenderer
    const rawTitle = getValueByRole(targetSchemaData, entity, 'title') || entity.name || `Item ${index + 1}`;
    // Get subtitle value(s) - concatenate multiple fields with same role using |
    const rawSubtitle = getValueByRole(targetSchemaData, entity, 'subtitle') || entity.email || '';

    // Ensure title is never just a bare id – prefer meaningful fallback
    const title =
      (typeof rawTitle === 'string' && rawTitle.trim() && rawTitle !== String((entity as any)?.id))
        ? rawTitle
        : (targetSchemaData.singular_name
            ? `${targetSchemaData.singular_name} ${index + 1}`
            : `Item ${index + 1}`);

    // Format numeric subtitles with thousand separators (for number subtitle fields)
    const formatNumericSubtitle = (value: any): string => {
      if (value == null) return '';
      const formatOne = (v: any): string => {
        if (typeof v === 'number' && Number.isFinite(v)) {
          return new Intl.NumberFormat().format(v);
        }
        if (typeof v === 'string') {
          const cleaned = v.replace(/,/g, '').trim();
          if (cleaned && !Number.isNaN(Number(cleaned))) {
            return new Intl.NumberFormat().format(Number(cleaned));
          }
          return v;
        }
        return String(v);
      };

      // If multiple subtitle fields are concatenated with "|", format each part
      if (typeof value === 'string' && value.includes('|')) {
        return value
          .split('|')
          .map(part => formatOne(part.trim()))
          .join(' | ');
      }

      return formatOne(value);
    };

    const subtitle = formatNumericSubtitle(rawSubtitle);
    const avatarField = getSingleValueByRole(targetSchemaData, entity, 'avatar', entity.name) || entity.name || '?';
    const statusField = getSingleValueByRole(targetSchemaData, entity, 'status') || entity.status || '';
    const ratingField = getSingleValueByRole(targetSchemaData, entity, 'rating') || entity.rating || 0;
    
    // Check if avatar and icon fields exist
    const hasAvatarField = targetSchemaData?.fields?.some(field => field.role === 'avatar') || false;
    const hasIconField = targetSchemaData?.fields?.some(field => field.role === 'icon') || false;
    
    // Get icon field value
    const iconFieldValue =
      getSingleValueByRole(targetSchemaData, entity, 'icon') ??
      entity?.icon ??
      '';
    
    const normalizedIconValue =
      getPrimaryDisplayString(iconFieldValue) ??
      (typeof iconFieldValue === 'string' ? iconFieldValue : '');
    
    // Resolve Tailwind color id from schema role or raw data
    const rawColorValue =
      getSingleValueByRole(targetSchemaData, entity, 'color') ??
      entity.color ??
      null;
    
    const resolvedColorId = typeof rawColorValue === 'string'
      ? rawColorValue.toLowerCase()
      : undefined;
    
    // Map Tailwind color id to avatar/background/text/border classes
    const getAvatarColorClasses = (color?: string) => {
      const colorMap: Record<string, { bg: string; text: string; border: string }> = {
        violet: {
          bg: 'bg-violet-50 dark:bg-violet-500/15',
          text: 'text-violet-700 dark:text-violet-100',
          border: 'border-violet-100 dark:border-violet-500/40',
        },
        emerald: {
          bg: 'bg-emerald-50 dark:bg-emerald-500/15',
          text: 'text-emerald-700 dark:text-emerald-100',
          border: 'border-emerald-100 dark:border-emerald-500/40',
        },
        indigo: {
          bg: 'bg-indigo-50 dark:bg-indigo-500/15',
          text: 'text-indigo-700 dark:text-indigo-100',
          border: 'border-indigo-100 dark:border-indigo-500/40',
        },
        blue: {
          bg: 'bg-blue-50 dark:bg-blue-500/15',
          text: 'text-blue-700 dark:text-blue-100',
          border: 'border-blue-100 dark:border-blue-500/40',
        },
        green: {
          bg: 'bg-green-50 dark:bg-green-500/15',
          text: 'text-green-700 dark:text-green-100',
          border: 'border-green-100 dark:border-green-500/40',
        },
        red: {
          bg: 'bg-red-50 dark:bg-red-500/15',
          text: 'text-red-700 dark:text-red-100',
          border: 'border-red-100 dark:border-red-500/40',
        },
        orange: {
          bg: 'bg-orange-50 dark:bg-orange-500/15',
          text: 'text-orange-700 dark:text-orange-100',
          border: 'border-orange-100 dark:border-orange-500/40',
        },
        amber: {
          bg: 'bg-amber-50 dark:bg-amber-500/15',
          text: 'text-amber-700 dark:text-amber-100',
          border: 'border-amber-100 dark:border-amber-500/40',
        },
        yellow: {
          bg: 'bg-yellow-50 dark:bg-yellow-500/15',
          text: 'text-yellow-700 dark:text-yellow-100',
          border: 'border-yellow-100 dark:border-yellow-500/40',
        },
        pink: {
          bg: 'bg-pink-50 dark:bg-pink-500/15',
          text: 'text-pink-700 dark:text-pink-100',
          border: 'border-pink-100 dark:border-pink-500/40',
        },
        purple: {
          bg: 'bg-purple-50 dark:bg-purple-500/15',
          text: 'text-purple-700 dark:text-purple-100',
          border: 'border-purple-100 dark:border-purple-500/40',
        },
        teal: {
          bg: 'bg-teal-50 dark:bg-teal-500/15',
          text: 'text-teal-700 dark:text-teal-100',
          border: 'border-teal-100 dark:border-teal-500/40',
        },
        cyan: {
          bg: 'bg-cyan-50 dark:bg-cyan-500/15',
          text: 'text-cyan-700 dark:text-cyan-100',
          border: 'border-cyan-100 dark:border-cyan-500/40',
        },
        stone: {
          bg: 'bg-stone-50 dark:bg-stone-500/15',
          text: 'text-stone-700 dark:text-stone-100',
          border: 'border-stone-100 dark:border-stone-500/40',
        },
        neutral: {
          bg: 'bg-neutral-50 dark:bg-neutral-500/15',
          text: 'text-neutral-700 dark:text-neutral-100',
          border: 'border-neutral-100 dark:border-neutral-500/40',
        },
        gray: {
          bg: 'bg-gray-50 dark:bg-gray-500/15',
          text: 'text-gray-700 dark:text-gray-100',
          border: 'border-gray-100 dark:border-gray-500/40',
        },
        slate: {
          bg: 'bg-slate-50 dark:bg-slate-500/15',
          text: 'text-slate-700 dark:text-slate-100',
          border: 'border-slate-100 dark:border-slate-500/40',
        },
        rose: {
          bg: 'bg-rose-50 dark:bg-rose-500/15',
          text: 'text-rose-700 dark:text-rose-100',
          border: 'border-rose-100 dark:border-rose-500/40',
        },
        fuchsia: {
          bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/15',
          text: 'text-fuchsia-700 dark:text-fuchsia-100',
          border: 'border-fuchsia-100 dark:border-fuchsia-500/40',
        },
        lime: {
          bg: 'bg-lime-50 dark:bg-lime-500/15',
          text: 'text-lime-700 dark:text-lime-100',
          border: 'border-lime-100 dark:border-lime-500/40',
        },
        sky: {
          bg: 'bg-sky-50 dark:bg-sky-500/15',
          text: 'text-sky-700 dark:text-sky-100',
          border: 'border-sky-100 dark:border-sky-500/40',
        },
        zinc: {
          bg: 'bg-zinc-50 dark:bg-zinc-500/15',
          text: 'text-zinc-700 dark:text-zinc-100',
          border: 'border-zinc-100 dark:border-zinc-500/40',
        },
      };
      
      const key = color && colorMap[color] ? color : 'violet';
      return colorMap[key];
    };
    
    const avatarColor = getAvatarColorClasses(resolvedColorId);
    
    const shouldShowAvatar = hasAvatarField && Boolean(avatarField);
    const shouldShowIconAvatar = !shouldShowAvatar && hasIconField && Boolean(normalizedIconValue);
    
    // Check if description role exists in schema OR if any field label contains "description"
    const hasDescriptionRole = targetSchemaData?.fields?.some(field => 
      field.role === 'description' || 
      (field.label && typeof field.label === 'string' && field.label.toLowerCase().includes('description'))
    ) || false;
    
    // Get description value(s) - concatenate multiple fields with same role using |
    let descriptionValue: any = null;
    if (hasDescriptionRole) {
      // First try to get by role (concatenates multiple fields with |)
      const roleBasedDescription = getValueByRole(targetSchemaData, entity, 'description');
      if (roleBasedDescription != null && typeof roleBasedDescription === 'string' && roleBasedDescription.trim() !== '') {
        descriptionValue = roleBasedDescription;
      } else {
        // If not found by role, find by field label containing "description"
        if (targetSchemaData?.fields) {
          const descriptionFields = targetSchemaData.fields.filter(field => 
            field.label && 
            typeof field.label === 'string' && 
            field.label.toLowerCase().includes('description') &&
            !field.role // Only if it doesn't already have a role
          );
          if (descriptionFields.length > 0) {
            const values = descriptionFields
              .map(field => entity[field.name])
              .filter(val => val !== undefined && val !== null && val !== '');
            if (values.length > 0) {
              descriptionValue = values.join(' | ');
            }
          }
        }
      }
    }
    
    const description = descriptionValue && (typeof descriptionValue === 'string' ? descriptionValue.trim() !== '' : descriptionValue != null) 
      ? (typeof descriptionValue === 'string' ? descriptionValue : String(descriptionValue))
      : null;
    
    // Get badge fields
    const badgeFields = getFieldsByRole(targetSchemaData, 'badge');
    const allBadgeValues: any[] = [];
    const allOptions = new Map<string, any>();
    let combinedBadgeField: any = null;

    badgeFields.forEach(field => {
      const value = entity[field.name];
      if (value && Array.isArray(value)) {
        allBadgeValues.push(...value);
      }
      if (field.options && Array.isArray(field.options)) {
        field.options.forEach((opt: any) => {
          if (!allOptions.has(opt.value)) {
            allOptions.set(opt.value, opt);
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

    const badgeValues = allBadgeValues.length > 0
      ? allBadgeValues
      : (getArrayValuesByRole(targetSchemaData, entity, 'badge') || []);

    // Find status field options
    const statusFieldDef = targetSchemaData.fields?.find(f => f.role === 'status');
    const statusOptions = statusFieldDef?.options;
    const hasRatingField = targetSchemaData.fields?.some(f => f.role === 'rating') || false;
    const hasStatusField = targetSchemaData.fields?.some(f => f.role === 'status') || false;
    const hasCodeField = targetSchemaData.fields?.some(f => f.role === 'code') || false;
    const codeField = getSingleValueByRole(targetSchemaData, entity, 'code');

    return (
      <div className="flex items-start justify-between gap-2 w-full">
        {/* Left side: Avatar, Title, Subtitle */}
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {shouldShowAvatar ? (
          <Avatar
              className={cn(
                'h-8 w-8 rounded-full border shadow-sm flex items-center justify-center font-semibold shrink-0',
                avatarColor.bg,
                avatarColor.text,
                avatarColor.border,
              )}
            >
              <AvatarFallback
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-xs',
                  avatarColor.bg,
                  avatarColor.text,
                )}
          >
            {getInitials(avatarField)}
              </AvatarFallback>
          </Avatar>
          ) : shouldShowIconAvatar ? (
            <div
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center shadow-sm border shrink-0',
                avatarColor.bg,
                avatarColor.border,
              )}
            >
              <IconRenderer
                iconName={normalizedIconValue}
                className={cn(
                  'h-4 w-4',
                  avatarColor.text,
                )}
              />
            </div>
          ) : (
            <Avatar
              className={cn(
                'h-8 w-8 rounded-full border shadow-sm flex items-center justify-center font-semibold shrink-0',
                avatarColor.bg,
                avatarColor.text,
                avatarColor.border,
              )}
            >
              <AvatarFallback
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-xs',
                  avatarColor.bg,
                  avatarColor.text,
                )}
              >
                {getInitials(avatarField)}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Code Badge */}
              {hasCodeField && codeField && (
                <CodeBadge code={codeField} />
              )}
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex-1 min-w-0 leading-relaxed">
                {title}
              </h4>
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
            {description && (
              <p dir="auto" className="w-full text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                {description}
              </p>
            )}
            
            {/* Badges */}
            {combinedBadgeField && badgeValues.length > 0 && (
              <div className="mt-1.5">
                <BadgeViewer
                  field={combinedBadgeField}
                  value={badgeValues}
                  maxBadges={2}
                  badgeVariant="outline"
                  animate={false}
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Right side: Buttons, Rating and Status */}
        <div className="flex items-start gap-1.5 shrink-0">
          {actionButtons && (
            <div className="flex gap-1">
              {actionButtons}
            </div>
          )}
          
          {/* Rating and Status */}
          <div className="flex flex-col items-end gap-1">
            {hasRatingField && (
              <Rating
                value={Number(ratingField) || 0}
                size="sm"
                showValue={true}
              />
            )}
            {hasStatusField && statusField && (() => {
              const badgeConfig = getBadgeConfig(statusField, statusOptions);
              return (
                <Badge variant={mapBadgeColorToVariant(badgeConfig.color)} className="flex items-center gap-1 px-1.5 py-0.5 text-xs">
                  {badgeConfig.icon && <IconRenderer iconName={badgeConfig.icon} className="h-3 w-3" />}
                  <span>{badgeConfig.label}</span>
                </Badge>
              );
            })()}
          </div>
        </div>
      </div>
    );
  };

  if (isRepeatingSection) {
    // For relation-based sections
    if (isRelationBased) {
      const itemsToDisplay = itemsToDisplayMerged;
      const itemsCount = itemsToDisplay.length;
      const headerSectionMessage = displaySectionError;
      const maxItems = section.repeatingConfig?.maxItems;
      const canAddMore = maxItems === undefined || maxItems === 0 || itemsCount < maxItems;
      
      return (
        <>
      <Card
        dir={isRtl ? 'rtl' : undefined}
        className={cn(
        // Match System Section background & border by default
        'border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800/30',
        styling?.variant === 'minimal' && 'border-0 shadow-none bg-transparent dark:bg-transparent',
        // Keep card variant shadows/borders but do not override background color
        styling?.variant === 'card' && 'shadow-sm dark:border-gray-700',
        'overflow-visible' // Allow dropdowns to overflow the card
      )}>
            <CardHeader 
              className={cn(
                "pb-4 px-6 pt-4 transition-colors rounded-2xl",
                isCollapsible && "cursor-pointer bg-gray-100 dark:bg-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
              )}
              onClick={isCollapsible ? toggleExpanded : undefined}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle dir="auto" className={cn(
                    "w-full text-base font-medium text-gray-900 dark:text-gray-100 leading-relaxed",
                    isNotApplicable && "opacity-50"
                  )}>{title}</CardTitle>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                    {itemsCount}
                  </span>
                  {headerSectionMessage && (
                    <span className="text-xs text-red-600 dark:text-red-400 mt-0.5" role="alert">
                      • {headerSectionMessage}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      fetchRelations();
                    }}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                    title="Refresh relations"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingRelations ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <div onClick={(e) => e.stopPropagation()}>
                    <ViewSwitcher
                      currentView={sectionView}
                      onViewChange={(view) => setSectionView((view === 'grid' || view === 'list') ? view : 'grid')}
                      showOnly={['grid', 'list']}
                      className="shrink-0"
                    />
                  </div>
                  {/* N.A Switch */}
                  {showNotApplicableSwitch && (
                    <div 
                      dir="auto"
                      className="flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Switch
                        checked={isNotApplicable}
                        onCheckedChange={handleNAToggle}
                        disabled={disabled}
                        id={`na-switch-${section.id}`}
                      />
                      <Label 
                        htmlFor={`na-switch-${section.id}`}
                        className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer"
                      >
                        N.A
                      </Label>
                    </div>
                  )}
                  {/* Select button for canSelectFromData or mustSelectFromData */}
                  {(addType === 'canSelectFromData' || addType === 'mustSelectFromData') && targetSchema && canAddMore && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsPickerOpen(true);
                      }}
                      disabled={disabled || !currentEntityId || isNotApplicable}
                      className="text-xs"
                    >
                      Select {targetSchemaData?.plural_name || targetSchemaData?.singular_name || targetSchema}
                    </Button>
                  )}
                  {isCollapsible && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="p-1 h-6 w-6 hover:bg-gray-200"
                      onClick={(e) => { e.stopPropagation(); toggleExpanded(); }}
                    >
                  {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : isRtl ? (
                        <ChevronLeft className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-1">
              {description && (
                  <p dir="auto" className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
              )}
                {formattedRelationType && (
                  <Badge
                    variant="outline"
                    size="sm"
                    className="text-xs font-normal bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                  >
                    {formattedRelationType}
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            {isCollapsible ? (
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    layout
                    key="relation-section-content"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                  <CardContent className="px-2 md:px-6 pb-6 overflow-visible">
                    <div className="space-y-4">
                      <AnimatePresence mode="wait">
                        {isLoadingRelations ? (
                          <motion.div 
                            key="skeletons"
                            className="space-y-3"
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={{
                              visible: {
                                transition: {
                                  staggerChildren: 0.05,
                                },
                              },
                            }}
                          >
                            {[1, 2, 3].map((i) => (
                              <motion.div
                                key={i}
                                className="rounded-xl bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700 overflow-hidden"
                                variants={{
                                  hidden: { opacity: 0, y: 10 },
                                  visible: { 
                                    opacity: 1, 
                                    y: 0,
                                    transition: {
                                      duration: 0.3,
                                      ease: 'easeOut',
                                    },
                                  },
                                }}
                              >
                                <div className="px-3 sm:px-4 py-3">
                                  <div className="flex items-start justify-between gap-2 w-full">
                                    {/* Left side: Avatar, Title, Subtitle */}
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                      {/* Avatar Skeleton */}
                                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                                      
                                      {/* Content */}
                                      <div className="flex-1 min-w-0 space-y-1.5">
                                        <Skeleton className="h-4 w-2/3" />
                                        <Skeleton className="h-3 w-1/2" />
                                      </div>
                                    </div>
                                    
                                    {/* Right side: Buttons, Rating */}
                                    <div className="flex items-start gap-1.5 shrink-0">
                                      {/* Button Skeletons */}
                                      <div className="flex gap-1">
                                        <Skeleton className="h-7 w-7 rounded" />
                                        <Skeleton className="h-7 w-7 rounded" />
                                      </div>
                                      
                                      {/* Rating Skeleton */}
                                      <Skeleton className="h-4 w-12" />
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </motion.div>
                        ) : itemsCount === 0 ? (
                          <motion.div
                            key="empty"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="text-center py-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700"
                          >
                            <p className="text-sm">{noItemsAddedYet}</p>
                          </motion.div>
                        ) : (
                        <motion.div 
                          className={repeatingItemsContainerClass}
                          initial="hidden"
                          animate="visible"
                          variants={{
                            visible: {
                              transition: {
                                staggerChildren: 0.05,
                              },
                            },
                          }}
                        >
                          {itemsToDisplay.map((entity, index) => {
                            const entityId = (entity as any).id;
                            const relation = relations.find(r => r.targetId === entityId);
                            const isPending = !relation;
                            const isPendingAdded = isPending && (pendingAddedIds || []).includes(String(entityId));
                            
                            // Ensure entity has a title - if no title role value exists, use singular name + index
                            let entityWithTitle = entity;
                            if (targetSchemaData) {
                              const singularName = targetSchemaData.singular_name || targetSchemaData.name || 'Item';
                              const fallbackTitle = `${singularName} ${index + 1}`;
                              
                              const titleField = targetSchemaData.fields?.find(f => f.role === 'title');
                              const hasTitleRole = !!titleField;
                              
                              if (hasTitleRole) {
                                // Check if title field has a value
                                const titleValue = getValueByRole(targetSchemaData, entity, 'title');
                                
                                // If no title value or empty/Unknown, set fallback title
                                if (!titleValue || titleValue === '' || titleValue === 'Unknown') {
                                  entityWithTitle = {
                                    ...entity,
                                    [titleField.name]: fallbackTitle,
                                  };
                                }
                              } else {
                                // No title field - ensure name has fallback if name is also missing/empty
                                if (!entity.name || entity.name === '' || entity.name === 'Unknown') {
                                  entityWithTitle = {
                                    ...entity,
                                    name: fallbackTitle,
                                  };
                                }
                              }
                            }
                            
                            return (
                              <motion.div
                                key={(entity as any).id || `entity-${index}`}
                                className="rounded-xl overflow-hidden"
                                variants={{
                                  hidden: { opacity: 0, y: 10 },
                                  visible: { 
                                    opacity: 1, 
                                    y: 0,
                                    transition: {
                                      duration: 0.3,
                                      ease: 'easeOut',
                                    },
                                  },
                                }}
                              >
                                {targetSchemaData ? (
                                  <DynamicCardRenderer
                                    schema={targetSchemaData}
                                    data={entityWithTitle}
                                    index={0}
                                    viewMode={sectionView}
                                    onView={(data) => {
                                      const id = (data as any).id;
                                      if (relation) handleEditEntity(id, relation.id);
                                      else if (onRemovePending && id) { /* pending: no view */ }
                                    }}
                                    onEdit={(data) => {
                                      const id = (data as any).id;
                                      if (relation) handleEditEntity(id, relation.id);
                                      else if (id) handleEditEntity(id, '');
                                    }}
                                    onDelete={(data) => {
                                      const id = (data as any).id;
                                      if (relation) handleDeleteClick(relation.id, {} as React.MouseEvent);
                                      else if (onRemovePending && id) onRemovePending(section.id, String(id), isPendingAdded);
                                    }}
                                    disableAnimation={true}
                                    isInDialog={false}
                                    showUserDetails={false}
                                    className="border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200"
                                  />
                                ) : (
                                  <div className="px-3 sm:px-4 py-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="text-sm text-gray-900 dark:text-gray-100">
                                        {entity.name || entity.title || entity.id || (targetSchema ? `${targetSchema} ${index + 1}` : `Item ${index + 1}`)}
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (relation) handleEditEntity(entityId, relation.id);
                                            else if (entityId) handleEditEntity(entityId, '');
                                          }}
                                          className="h-7 w-7"
                                          title={editTitle}
                                          disabled={disabled}
                                        >
                                          <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                        {(relation || (onRemovePending && isPending)) && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              if (relation) handleDeleteClick(relation.id, e);
                                              else if (onRemovePending && entityId) onRemovePending(section.id, String(entityId), isPendingAdded);
                                            }}
                                            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            title={deleteTitle}
                                            disabled={disabled}
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Add button - only show if addType is 'addOnly' or 'canSelectFromData' */}
                      {onAddRepeatingItem && addType !== 'mustSelectFromData' && canAddMore && (
                        <div className="space-y-2">
                          <div className="flex justify-center mb-4">
                            <AddButtonFull
                              label={`${addLabel} ${title}`}
                              onClick={onAddRepeatingItem}
                              disabled={disabled || !currentEntityId || isNotApplicable}
                              loading={isAddingItem}
                            />
                          </div>
                          {addItemError && (
                            <FormAlert 
                              type="warning" 
                              message={addItemError}
                              dismissible={false}
                            />
                          )}
                          {!currentEntityId && (
                            <FormAlert 
                              type="info" 
                              message={getTranslationsArray(TRANSLATION_KEYS.MESSAGE_SAVE_FIRST_BEFORE_ADDING_RELATED)}
                              dismissible={false}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <CardContent className="px-2 md:px-6 pb-6 overflow-visible">
              <div className="space-y-4">
                <AnimatePresence mode="wait">
                  {isLoadingRelations ? (
                    <motion.div 
                      key="skeletons"
                      className="space-y-3"
                      initial="hidden"  
                      animate="visible"
                      exit="hidden"
                      variants={{
                        visible: {
                          transition: {
                            staggerChildren: 0.05,
                          },
                        },
                      }}
                    >
                      {[1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          className="rounded-xl bg-white border border-gray-100 overflow-hidden"
                          variants={{
                            hidden: { opacity: 0, y: 10 },
                            visible: { 
                              opacity: 1, 
                              y: 0,
                              transition: {
                                duration: 0.3,
                                ease: 'easeOut',
                              },
                            },
                          }}
                        >
                          <div className="px-3 sm:px-4 py-3">
                            <div className="flex items-start justify-between gap-2 w-full">
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="flex-1 space-y-1.5">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-24" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : itemsCount === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="text-center py-8 text-gray-500 bg-white dark:bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700"
                    >
                      <p className="text-xs">{noItemsAddedYet}</p>
                    </motion.div>
                  ) : (
                  <motion.div 
                    className="space-y-3"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                        },
                      },
                    }}
                  >
                    {itemsToDisplay.map((entity, index) => {
                      const entityId = (entity as any).id;
                      const relation = relations.find(r => r.targetId === entityId);
                      const isPending = !relation;
                      const isPendingAdded = isPending && (pendingAddedIds || []).includes(String(entityId));
                      
                      // Ensure entity has a title - if no title role value exists, use singular name + index
                      let entityWithTitle = entity;
                      if (targetSchemaData) {
                        const singularName = targetSchemaData.singular_name || targetSchemaData.name || 'Item';
                        const fallbackTitle = `${singularName} ${index + 1}`;
                        
                        const titleField = targetSchemaData.fields?.find(f => f.role === 'title');
                        const hasTitleRole = !!titleField;
                        
                        if (hasTitleRole) {
                          // Check if title field has a value
                          const titleValue = getValueByRole(targetSchemaData, entity, 'title');
                          
                          // If no title value or empty/Unknown, set fallback title
                          if (!titleValue || titleValue === '' || titleValue === 'Unknown') {
                            entityWithTitle = {
                              ...entity,
                              [titleField.name]: fallbackTitle,
                            };
                          }
                        } else {
                          // No title field - ensure name has fallback if name is also missing/empty
                          if (!entity.name || entity.name === '' || entity.name === 'Unknown') {
                            entityWithTitle = {
                              ...entity,
                              name: fallbackTitle,
                            };
                          }
                        }
                      }
                      
                      return (
                        <motion.div
                          key={(entity as any).id || `entity-${index}`}
                          className="rounded-xl overflow-hidden"
                          variants={{
                            hidden: { opacity: 0, y: 10 },
                            visible: { 
                              opacity: 1, 
                              y: 0,
                              transition: {
                                duration: 0.3,
                                ease: 'easeOut',
                              },
                            },
                          }}
                        >
                          {targetSchemaData ? (
                            <DynamicCardRenderer
                              schema={targetSchemaData}
                              data={entityWithTitle}
                              index={0}
                              viewMode={sectionView}
                              onView={(data) => {
                                const id = (data as any).id;
                                if (relation) handleEditEntity(id, relation.id);
                              }}
                              onEdit={(data) => {
                                const id = (data as any).id;
                                if (relation) handleEditEntity(id, relation.id);
                                else if (id) handleEditEntity(id, '');
                              }}
                              onDelete={(data) => {
                                const id = (data as any).id;
                                if (relation) handleDeleteClick(relation.id, {} as React.MouseEvent);
                                else if (onRemovePending && id) onRemovePending(section.id, String(id), isPendingAdded);
                              }}
                              disableAnimation={true}
                              isInDialog={false}
                              showUserDetails={false}
                              className="border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200"
                            />
                          ) : (
                            <div className="px-3 sm:px-4 py-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-sm text-gray-900 dark:text-gray-100">
                                  {entity.name || entity.title || entity.id || (targetSchema ? `${targetSchema} ${index + 1}` : `Item ${index + 1}`)}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (relation) handleEditEntity(entityId, relation.id);
                                      else if (entityId) handleEditEntity(entityId, '');
                                    }}
                                    className="h-7 w-7"
                                    title={editTitle}
                                    disabled={disabled}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  {(relation || (onRemovePending && isPending)) && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (relation) handleDeleteClick(relation.id, e);
                                        else if (onRemovePending && entityId) onRemovePending(section.id, String(entityId), isPendingAdded);
                                      }}
                                      className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      title={deleteTitle}
                                      disabled={disabled}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                  )}
                </AnimatePresence>

                {/* Add button - only show if addType is 'addOnly' or 'canSelectFromData' */}
                {onAddRepeatingItem && addType !== 'mustSelectFromData' && canAddMore && (
                  <div className="space-y-2">
                    <div className="flex justify-center mb-4">
                      <AddButtonFull
                        label={`${addLabel} ${title}`}
                        onClick={onAddRepeatingItem}
                        disabled={disabled || !currentEntityId || isNotApplicable}
                        loading={isAddingItem}
                      />
                    </div>
                    {addItemError && (
                      <FormAlert 
                        type="warning" 
                        message={addItemError}
                        dismissible={false}
                      />
                    )}
                    {!currentEntityId && (
                      <FormAlert 
                        type="info" 
                        message={getTranslationsArray(TRANSLATION_KEYS.MESSAGE_SAVE_FIRST_BEFORE_ADDING_RELATED)}
                        dismissible={false}
                      />
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          )}
          </Card>
          
          {/* Edit Modal for related entities */}
          {editEntityId && targetSchema && (
            <FormModal
              schemaId={targetSchema}
              mode="edit"
              entityId={editEntityId}
              onSuccess={() => {
                setEditEntityId(null);
                setEditRelationId(null);
                // Refresh relations using the shared fetch function
                fetchRelations();
              }}
              onClose={() => {
                setEditEntityId(null);
                setEditRelationId(null);
              }}
            />
          )}
          
          {/* Delete Confirmation Dialog */}
          <ConfirmationMessage
            isOpen={deleteConfirmDialog.open}
            onOpenChange={(open) => setDeleteConfirmDialog({ open, relationId: deleteConfirmDialog.relationId })}
            title={section.repeatingConfig?.deleteType === 'relationOnly' ? [{ en: 'Remove Relation' }, { fa: 'حذف ارتباط' }, { ar: 'إزالة العلاقة' }, { es: 'Quitar relación' }, { fr: 'Supprimer la relation' }, { de: 'Beziehung entfernen' }, { it: 'Rimuovi relazione' }, { ru: 'Удалить связь' }] : [{ en: 'Delete Item' }, { fa: 'حذف آیتم' }, { ar: 'حذف العنصر' }, { es: 'Eliminar elemento' }, { fr: 'Supprimer l\'élément' }, { de: 'Element löschen' }, { it: 'Elimina elemento' }, { ru: 'Удалить элемент' }]}
            message={section.repeatingConfig?.deleteType === 'relationOnly' ? [{ en: 'Are you sure you want to remove this relation? The related item will remain but will no longer be linked to this record.' }, { fa: 'آیا مطمئن هستید که می‌خواهید این ارتباط را حذف کنید؟ آیتم مرتبط باقی می‌ماند اما دیگر به این رکورد متصل نخواهد بود.' }, { ar: 'هل أنت متأكد أنك تريد إزالة هذه العلاقة؟ سيبقى العنصر المرتبط لكنه لن يكون مرتبطًا بهذا السجل.' }, { es: '¿Está seguro de que desea quitar esta relación? El elemento relacionado permanecerá pero ya no estará vinculado a este registro.' }, { fr: 'Voulez-vous vraiment supprimer cette relation ? L\'élément associé restera mais ne sera plus lié à cet enregistrement.' }, { de: 'Möchten Sie diese Beziehung wirklich entfernen? Das zugehörige Element bleibt erhalten, ist aber nicht mehr mit diesem Datensatz verknüpft.' }, { it: 'Sei sicuro di voler rimuovere questa relazione? L\'elemento correlato rimarrà ma non sarà più collegato a questo record.' }, { ru: 'Вы уверены, что хотите удалить эту связь? Связанный элемент останется, но больше не будет связан с этой записью.' }] : [{ en: 'Are you sure you want to delete this item and its relation? This action cannot be undone.' }, { fa: 'آیا مطمئن هستید که می‌خواهید این آیتم و ارتباط آن را حذف کنید؟ این عمل قابل بازگشت نیست.' }, { ar: 'هل أنت متأكد أنك تريد حذف هذا العنصر وعلاقته؟ لا يمكن التراجع عن هذا الإجراء.' }, { es: '¿Está seguro de que desea eliminar este elemento y su relación? Esta acción no se puede deshacer.' }, { fr: 'Voulez-vous vraiment supprimer cet élément et sa relation ? Cette action est irréversible.' }, { de: 'Möchten Sie dieses Element und seine Beziehung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.' }, { it: 'Sei sicuro di voler eliminare questo elemento e la sua relazione? Questa azione non può essere annullata.' }, { ru: 'Вы уверены, что хотите удалить этот элемент и его связь? Это действие нельзя отменить.' }]}
            variant={section.repeatingConfig?.deleteType === 'relationOnly' ? 'default' : 'destructive'}
            buttons={[
              {
                label: getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang),
                variant: 'outline',
                action: () => setDeleteConfirmDialog({ open: false, relationId: null }),
              },
              {
                label: section.repeatingConfig?.deleteType === 'relationOnly' ? getT(TRANSLATION_KEYS.BUTTON_REMOVE, language, defaultLang) : getT(TRANSLATION_KEYS.BUTTON_DELETE, language, defaultLang),
                variant: section.repeatingConfig?.deleteType === 'relationOnly' ? 'default' : 'destructive',
                icon: 'Trash2',
                action: () => {
                  if (deleteConfirmDialog.relationId) {
                    handleRemoveRelation(deleteConfirmDialog.relationId);
                  }
                },
              },
            ]}
          />
          
          {/* Popup Picker for selecting existing items */}
          {targetSchema && (addType === 'canSelectFromData' || addType === 'mustSelectFromData') && (
            <PopupPicker
              isOpen={isPickerOpen}
              onClose={() => setIsPickerOpen(false)}
              schemaId={targetSchema}
              schema={targetSchemaData || undefined}
              onSelect={handleSelectFromPicker}
              title={`Select ${targetSchemaData?.plural_name || targetSchemaData?.singular_name || targetSchema}`}
              description={`Choose existing ${targetSchemaData?.plural_name || targetSchemaData?.singular_name || 'items'} to link to this record`}
              excludeIds={shouldExcludeIds ? selectedIds : undefined}
              canViewList={true}
              viewListUrl={`/page/${targetSchema}`}
              allowMultiselect={true}
              confirmButtonText={addRelationText}
            />
          )}
          
          {/* N.A Confirmation Dialog */}
          <ConfirmationMessage
            isOpen={naConfirmDialog.open}
            onOpenChange={(open) => setNaConfirmDialog({ open, willEnable: naConfirmDialog.willEnable })}
            title="Mark Section as Not Applicable"
            message={
              isRelationBased
                ? `Are you sure you want to mark this section as Not Applicable? This will clear all field values and ${section.repeatingConfig?.deleteType === 'relationOnly' ? 'remove all relations' : 'delete all related items and their relations'}. This action cannot be undone.`
                : `Are you sure you want to mark this section as Not Applicable? This will clear all field values in this section. This action cannot be undone.`
            }
            variant="destructive"
            buttons={[
              {
                label: getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang),
                variant: 'outline',
                action: () => setNaConfirmDialog({ open: false, willEnable: false }),
              },
              {
                label: getT(TRANSLATION_KEYS.BUTTON_MARK_NA, language, defaultLang),
                variant: 'destructive',
                action: () => handleNAConfirm(true),
              },
            ]}
          />
        </>
      );
    }
    
    // For traditional inline fields repeating sections
    const maxItems = section.repeatingConfig?.maxItems;
    const currentItemsCount = (repeatingItems || []).length;
    const canAddMore = maxItems === undefined || maxItems === 0 || currentItemsCount < maxItems;
    
    return (
      <>
      <Card
        dir={isRtl ? 'rtl' : undefined}
        className={cn(
        // Match System Section background & border by default
        'border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800/30',
        styling?.variant === 'minimal' && 'border-0 shadow-none bg-transparent dark:bg-transparent',
        // Keep card variant shadows/borders but do not override background color
        styling?.variant === 'card' && 'shadow-sm dark:border-gray-700',
        'overflow-visible' // Allow dropdowns to overflow the card
      )}>
        <CardHeader 
          className="pb-4 px-6 pt-4 rounded-2xl cursor-pointer bg-gray-100 dark:bg-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors"
          onClick={toggleExpanded}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 me-2">
              <div className="flex items-center gap-2">
                <CardTitle dir="auto" className={cn(
                  "w-full text-base font-medium text-gray-900 dark:text-gray-100",
                  isNotApplicable && "opacity-50"
                )}>{title}</CardTitle>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  {(repeatingItems || []).length}
                </span>
                {displaySectionError && (
                  <span className="text-xs text-red-600 dark:text-red-400" role="alert">
                    • {displaySectionError}
                  </span>
                )}
              </div>
              {description && (
                <p dir="auto" className="w-full text-xs text-gray-600 dark:text-gray-400 mt-1">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div onClick={(e) => e.stopPropagation()}>
                <ViewSwitcher
                  currentView={sectionView}
                  onViewChange={(view) => setSectionView((view === 'grid' || view === 'list') ? view : 'grid')}
                  showOnly={['grid', 'list']}
                  className="shrink-0"
                />
              </div>
              {/* N.A Switch */}
              {showNotApplicableSwitch && (
                <div 
                  dir="auto"
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Switch
                    checked={isNotApplicable}
                    onCheckedChange={handleNAToggle}
                    disabled={disabled}
                    id={`na-switch-${section.id}`}
                  />
                  <Label 
                    htmlFor={`na-switch-${section.id}`}
                    className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer"
                  >
                    N.A
                  </Label>
                </div>
              )}
              {isCollapsible && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="p-1 h-6 w-6 hover:bg-gray-200"
                  onClick={(e) => { e.stopPropagation(); toggleExpanded(); }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : isRtl ? (
                    <ChevronLeft className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        {isCollapsible ? (
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              layout
              key="inline-repeating-section-content"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="overflow-hidden"
            >
                <CardContent className="px-2 md:px-6 pb-6 overflow-visible">
                <div className="space-y-4">
                  {(repeatingItems || []).length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-white dark:bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                      <p className="text-sm">{noItemsAddedYet}</p>
                    </div>
                  ) : (
                    <div className={repeatingItemsContainerClass}>
                      {(repeatingItems || []).map((item, index) => (
                        <div
                          key={item.id || `item-${index}`}
                            className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm"
                        >
                          <div className="flex items-center justify-between px-4 sm:px-6 pt-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {section.repeatingConfig?.itemTitle 
                                ? section.repeatingConfig.itemTitle(index + 1)
                                : `${title} ${index + 1}`
                              }
                            </div>
                            {onRemoveRepeatingItem && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setInlineDeleteDialog({ open: true, index })}
                                className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-200 p-2"
                                disabled={disabled}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <div className="px-4 sm:px-6 pb-4">
                            <div className={gridClasses}>
                              {renderFields(fields, index)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {onAddRepeatingItem && canAddMore && (
                    <div className="space-y-2">
                      <div className="flex justify-center mb-4">
                        <AddButtonFull
                          label={`${addLabel} ${title}`}
                          onClick={onAddRepeatingItem}
                          disabled={disabled || isNotApplicable}
                          loading={isAddingItem}
                        />
                      </div>
                      {addItemError && (
                        <FormAlert 
                          type="warning" 
                          message={addItemError}
                          dismissible={false}
                        />
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <CardContent className="px-2 md:px-6 pb-6 overflow-visible">
          <div className="space-y-4">
            {(repeatingItems || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-white dark:bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-sm">{noItemsAddedYet}</p>
              </div>
            ) : (
              <div className={repeatingItemsContainerClass}>
                {(repeatingItems || []).map((item, index) => (
                  <div
                    key={item.id || `item-${index}`}
                            className="rounded-xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow-sm"
                  >
                    <div className="flex items-center justify-between px-4 sm:px-6 pt-4">
                      <div className="text-sm font-medium text-gray-900">
                        {section.repeatingConfig?.itemTitle 
                          ? section.repeatingConfig.itemTitle(index + 1)
                          : `${title} ${index + 1}`
                        }
                      </div>
                      {onRemoveRepeatingItem && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setInlineDeleteDialog({ open: true, index })}
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-200 p-2"
                          disabled={disabled}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="px-4 sm:px-6 pb-4">
                      <div className={gridClasses}>
                        {renderFields(fields, index)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {onAddRepeatingItem && canAddMore && (
              <div className="space-y-2">
                <div className="flex justify-center mb-4">
                  <AddButtonFull
                    label={`${addLabel} ${title}`}
                    onClick={onAddRepeatingItem}
                    disabled={disabled}
                    loading={isAddingItem}
                  />
                </div>
                {addItemError && (
                  <FormAlert 
                    type="warning" 
                    message={addItemError}
                    dismissible={false}
                  />
                )}
              </div>
            )}
          </div>
        </CardContent>
      )}
      </Card>
      
      {/* Inline repeating item delete confirmation */}
      <ConfirmationMessage
        isOpen={inlineDeleteDialog.open}
        onOpenChange={(open) => setInlineDeleteDialog({ open, index: open ? inlineDeleteDialog.index : null })}
        title={[
          { en: 'Delete Item' },
          { fa: 'حذف آیتم' },
          { ar: 'حذف العنصر' },
          { es: 'Eliminar elemento' },
          { fr: 'Supprimer l\'élément' },
          { de: 'Element löschen' },
          { it: 'Elimina elemento' },
          { ru: 'Удалить элемент' },
        ]}
        message={[
          { en: 'Are you sure you want to delete this item? This action cannot be undone.' },
          { fa: 'آیا مطمئن هستید که می‌خواهید این آیتم را حذف کنید؟ این عمل قابل بازگشت نیست.' },
          { ar: 'هل أنت متأكد أنك تريد حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.' },
          { es: '¿Está seguro de que desea eliminar este elemento? Esta acción no se puede deshacer.' },
          { fr: 'Voulez-vous vraiment supprimer cet élément ? Cette action est irréversible.' },
          { de: 'Möchten Sie dieses Element wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.' },
          { it: 'Sei sicuro di voler eliminare questo elemento? Questa azione non può essere annullata.' },
          { ru: 'Вы уверены, что хотите удалить этот элемент? Это действие нельзя отменить.' },
        ]}
        variant="destructive"
        buttons={[
          {
            label: getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang),
            variant: 'outline',
            action: () => setInlineDeleteDialog({ open: false, index: null }),
          },
          {
            label: getT(TRANSLATION_KEYS.BUTTON_DELETE, language, defaultLang),
            variant: 'destructive',
            icon: 'Trash2',
            action: () => {
              if (inlineDeleteDialog.index != null && onRemoveRepeatingItem) {
                onRemoveRepeatingItem(inlineDeleteDialog.index);
              }
              setInlineDeleteDialog({ open: false, index: null });
            },
          },
        ]}
      />
      
      {/* N.A Confirmation Dialog */}
      <ConfirmationMessage
        isOpen={naConfirmDialog.open}
        onOpenChange={(open) => setNaConfirmDialog({ open, willEnable: naConfirmDialog.willEnable })}
        title={[{ en: 'Mark Section as Not Applicable' }, { fa: 'علامت‌گذاری بخش به عنوان نامربوط' }, { ar: 'تعليم القسم كغير قابل للتطبيق' }, { es: 'Marcar sección como no aplicable' }, { fr: 'Marquer la section comme non applicable' }, { de: 'Bereich als nicht zutreffend markieren' }, { it: 'Segna sezione come non applicabile' }, { ru: 'Отметить раздел как неприменимый' }]}
        message={[{ en: 'Are you sure you want to mark this section as Not Applicable? This will clear all field values in this section. This action cannot be undone.' }, { fa: 'آیا مطمئن هستید که می‌خواهید این بخش را نامربوط علامت بزنید؟ تمام مقادیر فیلدهای این بخش پاک خواهند شد. این عمل قابل بازگشت نیست.' }, { ar: 'هل أنت متأكد أنك تريد تعليم هذا القسم كغير قابل للتطبيق؟ سيؤدي ذلك إلى مسح جميع قيم الحقول في هذا القسم. لا يمكن التراجع عن هذا الإجراء.' }, { es: '¿Está seguro de que desea marcar esta sección como no aplicable? Se borrarán todos los valores de los campos de esta sección. Esta acción no se puede deshacer.' }, { fr: 'Voulez-vous vraiment marquer cette section comme non applicable ? Toutes les valeurs des champs de cette section seront effacées. Cette action est irréversible.' }, { de: 'Möchten Sie diesen Bereich wirklich als nicht zutreffend markieren? Alle Feldwerte in diesem Bereich werden gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.' }, { it: 'Sei sicuro di voler segnare questa sezione come non applicabile? Verranno cancellati tutti i valori dei campi in questa sezione. Questa azione non può essere annullata.' }, { ru: 'Вы уверены, что хотите отметить этот раздел как неприменимый? Все значения полей в этом разделе будут очищены. Это действие нельзя отменить.' }]}
        variant="destructive"
        buttons={[
          {
            label: getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang),
            variant: 'outline',
            action: () => setNaConfirmDialog({ open: false, willEnable: false }),
          },
          {
            label: getT(TRANSLATION_KEYS.BUTTON_MARK_NA, language, defaultLang),
            variant: 'destructive',
            action: () => handleNAConfirm(true),
          },
        ]}
      />
      </>
    );
  }

  return (
    <>
      <Card
        dir={isRtl ? 'rtl' : undefined}
        className={cn(
        // Match System Section background & border by default
        'border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800/30',
        styling?.variant === 'minimal' && 'border-0 shadow-none bg-transparent dark:bg-transparent',
        // Keep card variant shadows/borders but do not override background color
        styling?.variant === 'card' && 'shadow-sm dark:border-gray-700',
        'overflow-visible' // Allow dropdowns to overflow the card
      )}>
        <CardHeader 
          className={cn(
            "pb-4 px-6 pt-4 transition-colors rounded-2xl",
            isCollapsible && "cursor-pointer bg-gray-100 dark:bg-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
          )}
          onClick={isCollapsible ? toggleExpanded : undefined}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 me-2">
              <div className="flex items-center gap-2">
                <CardTitle dir="auto" className={cn(
                  "w-full text-base font-medium text-gray-900 dark:text-gray-100 leading-relaxed",
                  isNotApplicable && "opacity-50"
                )}>{title}</CardTitle>
                {displaySectionError && (
                  <span className="text-xs text-red-600 dark:text-red-400" role="alert">
                    • {displaySectionError}
                  </span>
                )}
            </div>
            {description && (
              <p dir="auto" className="w-full text-xs text-gray-600 dark:text-gray-400 mt-1">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* N.A Switch */}
            {showNotApplicableSwitch && (
              <div 
                dir="auto"
                className="flex items-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <Switch
                  checked={isNotApplicable}
                  onCheckedChange={handleNAToggle}
                  disabled={disabled}
                  id={`na-switch-${section.id}`}
                />
                <Label 
                  htmlFor={`na-switch-${section.id}`}
                  className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer"
                >
                  N.A
                </Label>
              </div>
            )}
            {isCollapsible && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="p-1 h-6 w-6 hover:bg-gray-200"
                onClick={(e) => { e.stopPropagation(); toggleExpanded(); }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : isRtl ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      {isCollapsible ? (
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              layout
              key="standard-section-content"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <CardContent className="px-2 md:px-6 pb-6 overflow-visible">
                <div className={sectionClasses}>
                  <div className={gridClasses}>
                    {renderFields(fields)}
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <CardContent className="px-2 md:px-6 pb-6 overflow-visible">
          <div className={sectionClasses}>
            <div className={gridClasses}>
              {renderFields(fields)}
            </div>
          </div>
        </CardContent>
      )}
      </Card>
      
      {/* N.A Confirmation Dialog */}
      <ConfirmationMessage
        isOpen={naConfirmDialog.open}
        onOpenChange={(open) => setNaConfirmDialog({ open, willEnable: naConfirmDialog.willEnable })}
        title={[{ en: 'Mark Section as Not Applicable' }, { fa: 'علامت‌گذاری بخش به عنوان نامربوط' }, { ar: 'تعليم القسم كغير قابل للتطبيق' }, { es: 'Marcar sección como no aplicable' }, { fr: 'Marquer la section comme non applicable' }, { de: 'Bereich als nicht zutreffend markieren' }, { it: 'Segna sezione come non applicabile' }, { ru: 'Отметить раздел как неприменимый' }]}
        message={[{ en: 'Are you sure you want to mark this section as Not Applicable? This will clear all field values in this section. This action cannot be undone.' }, { fa: 'آیا مطمئن هستید که می‌خواهید این بخش را نامربوط علامت بزنید؟ تمام مقادیر فیلدهای این بخش پاک خواهند شد. این عمل قابل بازگشت نیست.' }, { ar: 'هل أنت متأكد أنك تريد تعليم هذا القسم كغير قابل للتطبيق؟ سيؤدي ذلك إلى مسح جميع قيم الحقول في هذا القسم. لا يمكن التراجع عن هذا الإجراء.' }, { es: '¿Está seguro de que desea marcar esta sección como no aplicable? Se borrarán todos los valores de los campos de esta sección. Esta acción no se puede deshacer.' }, { fr: 'Voulez-vous vraiment marquer cette section comme non applicable ? Toutes les valeurs des champs de cette section seront effacées. Cette action est irréversible.' }, { de: 'Möchten Sie diesen Bereich wirklich als nicht zutreffend markieren? Alle Feldwerte in diesem Bereich werden gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.' }, { it: 'Sei sicuro di voler segnare questa sezione come non applicabile? Verranno cancellati tutti i valori dei campi in questa sezione. Questa azione non può essere annullata.' }, { ru: 'Вы уверены, что хотите отметить этот раздел как неприменимый? Все значения полей в этом разделе будут очищены. Это действие нельзя отменить.' }]}
        variant="destructive"
        buttons={[
          {
            label: getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang),
            variant: 'outline',
            action: () => setNaConfirmDialog({ open: false, willEnable: false }),
          },
          {
            label: getT(TRANSLATION_KEYS.BUTTON_MARK_NA, language, defaultLang),
            variant: 'destructive',
            action: () => handleNAConfirm(true),
          },
        ]}
      />
    </>
  );
};

AccordionFormSection.displayName = 'AccordionFormSection';

export { ViewSwitcher };
