// Accordion Form Section Component

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { FormSectionProps } from '@/gradian-ui/schema-manager/types/form-schema';
import { FormElementFactory } from '../form-elements';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { ChevronDown, ChevronRight, Edit, Trash2, RefreshCw, X } from 'lucide-react';
import { cn } from '../../shared/utils';
import { getFieldsForSection, getValueByRole, getSingleValueByRole, getFieldsByRole, getArrayValuesByRole } from '../form-elements/utils/field-resolver';
import { FormAlert } from '../../../components/ui/form-alert';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { DataRelation, FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { cacheSchemaClientSide } from '@/gradian-ui/schema-manager/utils/schema-client-cache';
import { FormModal } from './FormModal';
import { Rating, PopupPicker, ConfirmationMessage, AddButtonFull, CodeBadge, Badge } from '../form-elements';
import { Skeleton } from '../../../components/ui/skeleton';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { getInitials, getBadgeConfig, mapBadgeColorToVariant } from '../../data-display/utils';
import { getPrimaryDisplayString } from '../../data-display/utils/value-display';
import { NormalizedOption } from '../form-elements/utils/option-normalizer';
import { BadgeViewer } from '../form-elements/utils/badge-viewer';
import { UI_PARAMS } from '@/gradian-ui/shared/constants/application-variables';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
const fieldVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      delay: Math.min(index * UI_PARAMS.CARD_INDEX_DELAY.STEP, UI_PARAMS.CARD_INDEX_DELAY.MAX),
    },
  }),
  exit: (index: number) => ({
    opacity: 0,
    y: -12,
    transition: {
      duration: 0.2,
      delay: Math.min(index * UI_PARAMS.CARD_INDEX_DELAY.STEP, UI_PARAMS.CARD_INDEX_DELAY.MAX / 2),
    },
  }),
} as const;


export const AccordionFormSection: React.FC<FormSectionProps> = ({
  section,
  schema,
  values,
  errors,
  touched,
  onChange,
  onBlur,
  fieldTabIndexMap,
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
}) => {
  // Get fields for this section from the schema
  const fields = getFieldsForSection(schema, section.id);
  const { 
    title, 
    description, 
    columns = 2, // Default to 2 columns if not specified
    gap = 4, // Default gap
    styling, 
    isRepeatingSection 
  } = section;
  
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
  const queryClient = useQueryClient();
  
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
          const response = await apiRequest<FormSchema>(`/api/schemas/${targetSchema}`);
          if (response.success && response.data) {
            await cacheSchemaClientSide(response.data, { queryClient, persist: false });
            setTargetSchemaData(response.data);
          }
        } catch (error) {
          console.error('Error fetching target schema:', error);
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
      // Fetch relations
      const relationsResponse = await apiRequest<DataRelation[]>(
        `/api/relations?sourceSchema=${sourceSchemaId}&sourceId=${currentEntityId}&relationTypeId=${relationTypeId}&targetSchema=${targetSchema}`
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
              .map((relation) => relation.targetId)
              .filter((id): id is string => Boolean(id))
          )
        );

        let resolvedEntities: any[] = [];

        if (uniqueTargetIds.length > 0) {
          const batchResponse = await apiRequest<any[]>(`/api/data/${targetSchema}`, {
            params: {
              includeIds: uniqueTargetIds.join(','),
            },
          });

          if (batchResponse.success && Array.isArray(batchResponse.data)) {
            const entityMap = new Map<string, any>(
              batchResponse.data.map((entity) => [String(entity.id), entity])
            );

            resolvedEntities = relationsList
              .map((relation) => entityMap.get(relation.targetId))
              .filter((entity): entity is any => Boolean(entity));
          } else {
            const fallbackEntities = await Promise.all(
              relationsList.map(async (relation: DataRelation) => {
                const entityResponse = await apiRequest<any>(`/api/data/${targetSchema}/${relation.targetId}`);
                return entityResponse.success && entityResponse.data ? entityResponse.data : null;
              })
            );
            resolvedEntities = fallbackEntities.filter((entity): entity is any => Boolean(entity));
          }
        }

        setRelatedEntities(resolvedEntities);
      }
    } catch (error) {
      console.error('Error fetching relations:', error);
    } finally {
      setIsLoadingRelations(false);
    }
  }, [isRelationBased, currentEntityId, targetSchema, relationTypeId, sourceSchemaId]);
  
  // Fetch relations and related entities for relation-based sections
  useEffect(() => {
    fetchRelations();
  }, [fetchRelations, refreshRelationsTrigger]); // Also refresh when trigger changes

  useEffect(() => {
    if (!isRelationBased || !onChange) {
      return;
    }

    const normalized = relatedEntities.map((entity) => {
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
  }, [isRelationBased, relatedEntities, onChange, section.id, targetSchemaData, values]);
  
  
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

  // If relation-based repeating section already has related entities, suppress min-item validation message
  if (section.isRepeatingSection && section.repeatingConfig?.targetSchema && sectionError) {
    if (relatedEntities.length > 0 || relatedValueArray.length > 0) {
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

  const sectionClasses = cn(
    'space-y-3',
    styling?.className
  );

  const gridClasses = cn(
    'grid gap-3',
    columns === 1 && 'grid-cols-1',
    columns === 2 && 'grid-cols-1 md:grid-cols-2',
    columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    columns === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    columns === 6 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-6',
    columns === 12 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-12',
    gap !== undefined && gap !== null && gap !== 0 && `gap-${gap}`
  );

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
      return columns; // Full width spans all columns
    } else if (width === '50%') {
      return Math.ceil(columns / 2); // Half width
    } else if (width === '33.33%' || width === '33.3%') {
      return Math.ceil(columns / 3); // One third width
    } else if (width === '25%') {
      return Math.ceil(columns / 4); // One fourth width
    } else if (width === '66.66%' || width === '66.6%') {
      return Math.ceil((columns / 3) * 2); // Two thirds width
    } else if (width === '75%') {
      return Math.ceil((columns / 4) * 3); // Three fourths width
    }
    
    // Default to 1 column if no width specified
    return 1;
  };

  const renderFields = (fieldsToRender: typeof fields, itemIndex?: number) => {
    return (
      <AnimatePresence>
        {fieldsToRender.map((field, index) => {
          if (!field) return null;

          // Skip hidden and inactive fields
          if (field.hidden || (field as any).layout?.hidden || field.inactive) {
            return null;
          }

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
          if (colSpan === columns) {
            colSpanClass = 'col-span-1 md:col-span-full';
          } else {
            // For responsive layouts at md+
            if (columns === 3) {
              if (colSpan === 2) {
                colSpanClass = 'col-span-1 md:col-span-2';
              }
            } else if (columns === 2) {
              if (colSpan === 2) {
                colSpanClass = 'col-span-1 md:col-span-2';
              }
            } else if (columns === 4) {
              if (colSpan === 2) {
                colSpanClass = 'col-span-1 md:col-span-2';
              } else if (colSpan === 3) {
                colSpanClass = 'col-span-1 md:col-span-3';
              }
            } else if (columns === 6 || columns === 12) {
              colSpanClass = `col-span-1 md:col-span-${colSpan}`;
            } else {
              // Default for other column counts
              colSpanClass = `col-span-1 md:col-span-${colSpan}`;
            }
          }

          return (
            <motion.div
              key={field.id}
              className={cn(
                'space-y-2',
                colSpanClass,
                (field as any).layout?.rowSpan && `row-span-${(field as any).layout.rowSpan}`
              )}
              layout
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              custom={index}
              style={{ order: field.order ?? (field as any).layout?.order }}
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
                tabIndex={fieldTabIndexMap?.[field.name] !== undefined ? fieldTabIndexMap[field.name] : undefined}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
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
      });
      
      if (relationResponse.success) {
        // If deleteType is 'itemAndRelation', also delete the target item
        if (deleteType === 'itemAndRelation' && relation && targetSchema) {
          const itemResponse = await apiRequest(`/api/data/${targetSchema}/${relation.targetId}`, {
            method: 'DELETE',
          });
          
          if (!itemResponse.success) {
            console.error('Failed to delete target item:', itemResponse.error);
            // Relation was deleted but item deletion failed - still refresh to show updated state
          }
        }
        
        // Refresh relations to get updated data
        fetchRelations();
      }
      setDeleteConfirmDialog({ open: false, relationId: null });
    } catch (error) {
      console.error('Error removing relation:', error);
      setDeleteConfirmDialog({ open: false, relationId: null });
    }
  };
  
  // Handler to open delete confirmation
  const handleDeleteClick = (relationId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirmDialog({ open: true, relationId });
  };

  // Handler for editing a related entity
  const handleEditEntity = (entityId: string, relationId: string) => {
    setEditEntityId(entityId);
    setEditRelationId(relationId);
  };

  // Handler for selecting an item from popup picker
  const handleSelectFromPicker = async (selectedItems: NormalizedOption[], rawItems: any[]) => {
    if (!currentEntityId || !relationTypeId || !targetSchema) {
      return;
    }

    try {
      const normalizedSelections = Array.isArray(selectedItems) ? selectedItems : [];
      const operations = normalizedSelections.map(selection => {
        if (!selection?.id) {
          return null;
        }

        return apiRequest('/api/relations', {
        method: 'POST',
        body: {
          sourceSchema: sourceSchemaId,
          sourceId: currentEntityId,
          targetSchema: targetSchema,
            targetId: selection.id,
          relationTypeId: relationTypeId,
        },
      });
      }).filter(Boolean) as Promise<any>[];

      if (operations.length === 0 && rawItems?.length) {
        const fallbackId = rawItems[0]?.id;
        if (fallbackId) {
          operations.push(apiRequest('/api/relations', {
            method: 'POST',
            body: {
              sourceSchema: sourceSchemaId,
              sourceId: currentEntityId,
              targetSchema: targetSchema,
              targetId: fallbackId,
              relationTypeId: relationTypeId,
            },
          }));
        }
      }

      if (operations.length === 0) {
        return;
      }

      const results = await Promise.all(operations);
      const hasFailure = results.some(response => !response?.success);
      if (hasFailure) {
        console.error('Failed to create one or more relations from picker:', results);
      } else {
        fetchRelations();
      }
    } catch (error) {
      console.error('Error creating relation from picker:', error);
    }
  };

  // Get already selected IDs to exclude from picker
  // If isUnique is set in repeatingConfig, exclude all IDs that are already related to the source entity
  // to ensure each item can only be selected once
  const selectedIds = relations.map(r => r.targetId);
  const shouldExcludeIds = section.repeatingConfig?.isUnique === true;

  // Helper function to check if section has any items/values
  const hasSectionItems = (): boolean => {
    // For relation-based sections, check if there are any related entities
    if (isRelationBased) {
      return relatedEntities.length > 0;
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
                console.error('Failed to delete target item:', itemResponse.error);
              }
            }
          }
        } catch (error) {
          console.error('Error removing relation for N.A:', error);
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
    const title = getValueByRole(targetSchemaData, entity, 'title') || entity.name || `Item ${index + 1}`;
    // Get subtitle value(s) - concatenate multiple fields with same role using |
    const subtitle = getValueByRole(targetSchemaData, entity, 'subtitle') || entity.email || '';
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
      if (roleBasedDescription && roleBasedDescription.trim() !== '') {
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
      <div className="flex items-start justify-between gap-3 w-full">
        {/* Left side: Avatar, Title, Subtitle */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {shouldShowAvatar ? (
          <Avatar
              className={cn(
                'h-10 w-10 rounded-full border shadow-sm flex items-center justify-center font-semibold shrink-0',
                avatarColor.bg,
                avatarColor.text,
                avatarColor.border,
              )}
            >
              <AvatarFallback
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center',
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
                'h-10 w-10 rounded-full flex items-center justify-center shadow-sm border shrink-0',
                avatarColor.bg,
                avatarColor.border,
              )}
            >
              <IconRenderer
                iconName={normalizedIconValue}
                className={cn(
                  'h-5 w-5',
                  avatarColor.text,
                )}
              />
            </div>
          ) : (
            <Avatar
              className={cn(
                'h-10 w-10 rounded-full border shadow-sm flex items-center justify-center font-semibold shrink-0',
                avatarColor.bg,
                avatarColor.text,
                avatarColor.border,
              )}
            >
              <AvatarFallback
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center',
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
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex-1 min-w-0">
                {title}
              </h4>
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {subtitle}
              </p>
            )}
            {description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-2">
                {description}
              </p>
            )}
            
            {/* Badges */}
            {combinedBadgeField && badgeValues.length > 0 && (
              <div className="mt-2">
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
        <div className="flex items-start gap-2 shrink-0">
          {actionButtons && (
            <div className="flex gap-1">
              {actionButtons}
            </div>
          )}
          
          {/* Rating and Status */}
          <div className="flex flex-col items-end gap-1.5">
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
      const itemsToDisplay = relatedEntities;
      const itemsCount = itemsToDisplay.length;
      const headerSectionMessage = displaySectionError;
      
      return (
        <>
      <Card className={cn(
        'border border-gray-200 rounded-2xl bg-gray-50/50',
        'dark:border-gray-700 dark:bg-gray-800',
        styling?.variant === 'minimal' && 'border-0 shadow-none bg-transparent dark:bg-transparent',
        styling?.variant === 'card' && 'shadow-sm bg-white dark:bg-gray-800/50 dark:border-gray-700',
        'overflow-visible' // Allow dropdowns to overflow the card
      )}>
            <CardHeader 
              className={cn(
                "pb-4 px-6 pt-4 transition-colors",
                isCollapsible && "cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
              )}
              onClick={isCollapsible ? toggleExpanded : undefined}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className={cn(
                    "text-base font-medium text-gray-900 dark:text-gray-100",
                    isNotApplicable && "opacity-50"
                  )}>{title}</CardTitle>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                    {itemsCount}
                  </span>
                  {headerSectionMessage && (
                    <span className="text-sm text-red-600 dark:text-red-400 mt-0.5" role="alert">
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
                  {/* N.A Switch */}
                  {showNotApplicableSwitch && (
                    <div 
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
                  {(addType === 'canSelectFromData' || addType === 'mustSelectFromData') && targetSchema && (
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
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-1">
              {description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
              )}
                {formattedRelationType && (
                  <Badge
                    variant="outline"
                    size="sm"
                    className="text-xs font-normal bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
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
                    initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <CardContent className="px-6 pb-6 overflow-visible">
                    <div className="space-y-4">
                      {isLoadingRelations ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="rounded-xl bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700 overflow-hidden"
                            >
                              <div className="px-4 sm:px-6 py-4">
                                <div className="flex items-start justify-between gap-3 w-full">
                                  {/* Left side: Avatar, Title, Subtitle */}
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    {/* Avatar Skeleton */}
                                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                                    
                                    {/* Content */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                      <Skeleton className="h-4 w-2/3" />
                                      <Skeleton className="h-3 w-1/2" />
                                    </div>
                                  </div>
                                  
                                  {/* Right side: Buttons, Rating */}
                                  <div className="flex items-start gap-2 shrink-0">
                                    {/* Button Skeletons */}
                                    <div className="flex gap-1">
                                      <Skeleton className="h-8 w-8 rounded" />
                                      <Skeleton className="h-8 w-8 rounded" />
                                    </div>
                                    
                                    {/* Rating Skeleton */}
                                    <Skeleton className="h-4 w-12" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : itemsCount === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                          <p>No items added yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {itemsToDisplay.map((entity, index) => {
                            const relation = relations.find(r => r.targetId === (entity as any).id);
                            const actionButtons = (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (relation) handleEditEntity((entity as any).id, relation.id);
                                  }}
                                  className="h-8 w-8"
                                  title="Edit"
                                  disabled={disabled}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {relation && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => handleDeleteClick(relation.id, e)}
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Delete"
                                    disabled={disabled}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            );
                            return (
                              <div
                                key={(entity as any).id || `entity-${index}`}
                                className="rounded-xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                              >
                                <div className="px-4 sm:px-6 py-4">
                                  {renderEntitySummary(entity, index + 1, actionButtons)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add button - only show if addType is 'addOnly' or 'canSelectFromData' */}
                      {onAddRepeatingItem && addType !== 'mustSelectFromData' && (
                        <div className="space-y-2">
                          <div className="flex justify-center mb-4">
                            <AddButtonFull
                              label={`Add ${title}`}
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
                              message="Please save the form first before adding related items"
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
            <CardContent className="px-6 pb-6 overflow-visible">
              <div className="space-y-4">
                {isLoadingRelations ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="rounded-xl bg-white border border-gray-100 overflow-hidden"
                      >
                        <div className="px-4 sm:px-6 py-4">
                          <div className="flex items-start justify-between gap-3 w-full">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : itemsCount === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-white dark:bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <p>No items added yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {itemsToDisplay.map((entity, index) => {
                      const relation = relations.find(r => r.targetId === (entity as any).id);
                      const actionButtons = (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (relation) handleEditEntity((entity as any).id, relation.id);
                            }}
                            className="h-8 w-8"
                            title="Edit"
                            disabled={disabled}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {relation && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleDeleteClick(relation.id, e)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete"
                              disabled={disabled}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      );
                      return (
                        <div
                          key={(entity as any).id || `entity-${index}`}
                          className="rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                        >
                          <div className="px-4 sm:px-6 py-4">
                            {renderEntitySummary(entity, index + 1, actionButtons)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add button - only show if addType is 'addOnly' or 'canSelectFromData' */}
                {onAddRepeatingItem && addType !== 'mustSelectFromData' && (
                  <div className="space-y-2">
                    <div className="flex justify-center mb-4">
                      <AddButtonFull
                        label={`Add ${title}`}
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
                        message="Please save the form first before adding related items"
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
            title={section.repeatingConfig?.deleteType === 'relationOnly' ? 'Remove Relation' : 'Delete Item'}
            message={
              section.repeatingConfig?.deleteType === 'relationOnly'
                ? 'Are you sure you want to remove this relation? The related item will remain but will no longer be linked to this record.'
                : 'Are you sure you want to delete this item and its relation? This action cannot be undone.'
            }
            variant={section.repeatingConfig?.deleteType === 'relationOnly' ? 'default' : 'destructive'}
            buttons={[
              {
                label: 'Cancel',
                variant: 'outline',
                action: () => setDeleteConfirmDialog({ open: false, relationId: null }),
              },
              {
                label: section.repeatingConfig?.deleteType === 'relationOnly' ? 'Remove' : 'Delete',
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
              description={`Choose an existing ${targetSchemaData?.singular_name || 'item'} to link to this record`}
              excludeIds={shouldExcludeIds ? selectedIds : undefined}
              canViewList={true}
              viewListUrl={`/page/${targetSchema}`}
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
                label: 'Cancel',
                variant: 'outline',
                action: () => setNaConfirmDialog({ open: false, willEnable: false }),
              },
              {
                label: 'Mark as N.A',
                variant: 'destructive',
                action: () => handleNAConfirm(true),
              },
            ]}
          />
        </>
      );
    }
    
    // For traditional inline fields repeating sections
    return (
      <>
      <Card className={cn(
        'border border-gray-200 rounded-2xl bg-gray-50/50',
        styling?.variant === 'minimal' && 'border-0 shadow-none bg-transparent',
        styling?.variant === 'card' && 'shadow-sm bg-white',
        'overflow-visible' // Allow dropdowns to overflow the card
      )}>
        <CardHeader 
          className="pb-4 px-6 pt-4 cursor-pointer hover:bg-gray-100/50 transition-colors"
          onClick={toggleExpanded}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className={cn(
                  "text-base font-medium text-gray-900 dark:text-gray-100",
                  isNotApplicable && "opacity-50"
                )}>{title}</CardTitle>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  {(repeatingItems || []).length}
                </span>
                {displaySectionError && (
                  <span className="text-sm text-red-600 dark:text-red-400" role="alert">
                    • {displaySectionError}
                  </span>
                )}
              </div>
              {description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* N.A Switch */}
              {showNotApplicableSwitch && (
                <div 
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
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <CardContent className="px-6 pb-6 overflow-visible">
                <div className="space-y-4">
                  {(repeatingItems || []).length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-white dark:bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                      <p>No items added yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(repeatingItems || []).map((item, index) => (
                        <div
                          key={item.id || `item-${index}`}
                            className="rounded-xl bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 shadow-sm"
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
                                onClick={() => onRemoveRepeatingItem(index)}
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

                  {onAddRepeatingItem && (
                    <div className="space-y-2">
                      <div className="flex justify-center mb-4">
                        <AddButtonFull
                          label={`Add ${title}`}
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
        <CardContent className="px-6 pb-6 overflow-visible">
          <div className="space-y-4">
            {(repeatingItems || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-white dark:bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                <p>No items added yet</p>
              </div>
            ) : (
              <div className="space-y-4">
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
                          onClick={() => onRemoveRepeatingItem(index)}
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

            {onAddRepeatingItem && (
              <div className="space-y-2">
                <div className="flex justify-center mb-4">
                  <AddButtonFull
                    label={`Add ${title}`}
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
      
      {/* N.A Confirmation Dialog */}
      <ConfirmationMessage
        isOpen={naConfirmDialog.open}
        onOpenChange={(open) => setNaConfirmDialog({ open, willEnable: naConfirmDialog.willEnable })}
        title="Mark Section as Not Applicable"
        message="Are you sure you want to mark this section as Not Applicable? This will clear all field values in this section. This action cannot be undone."
        variant="destructive"
        buttons={[
          {
            label: 'Cancel',
            variant: 'outline',
            action: () => setNaConfirmDialog({ open: false, willEnable: false }),
          },
          {
            label: 'Mark as N.A',
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
      <Card className={cn(
        'border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30',
        'dark:border-gray-700 dark:bg-gray-800',
        styling?.variant === 'minimal' && 'border-0 shadow-none bg-transparent dark:bg-transparent',
        styling?.variant === 'card' && 'shadow-sm bg-white dark:bg-gray-800/50 dark:border-gray-700',
        'overflow-visible' // Allow dropdowns to overflow the card
      )}>
        <CardHeader 
          className={cn(
            "pb-4 px-6 pt-4 transition-colors",
            isCollapsible && "cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-t-2xl"
          )}
          onClick={isCollapsible ? toggleExpanded : undefined}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className={cn(
                  "text-base font-medium text-gray-900 dark:text-gray-100",
                  isNotApplicable && "opacity-50"
                )}>{title}</CardTitle>
                {displaySectionError && (
                  <span className="text-sm text-red-600 dark:text-red-400" role="alert">
                    • {displaySectionError}
                  </span>
                )}
            </div>
            {description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* N.A Switch */}
            {showNotApplicableSwitch && (
              <div 
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
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <CardContent className="px-6 pb-6 overflow-visible">
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
        <CardContent className="px-6 pb-6 overflow-visible">
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
        title="Mark Section as Not Applicable"
        message="Are you sure you want to mark this section as Not Applicable? This will clear all field values in this section. This action cannot be undone."
        variant="destructive"
        buttons={[
          {
            label: 'Cancel',
            variant: 'outline',
            action: () => setNaConfirmDialog({ open: false, willEnable: false }),
          },
          {
            label: 'Mark as N.A',
            variant: 'destructive',
            action: () => handleNAConfirm(true),
          },
        ]}
      />
    </>
  );
};

AccordionFormSection.displayName = 'AccordionFormSection';
