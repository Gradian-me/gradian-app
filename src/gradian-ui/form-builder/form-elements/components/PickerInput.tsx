'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PopupPicker } from './PopupPicker';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { getValueByRole, getSingleValueByRole } from '../utils/field-resolver';
import { NormalizedOption, normalizeOptionArray, extractFirstId } from '../utils/option-normalizer';
import { Search, X } from 'lucide-react';
import { cn } from '@/gradian-ui/shared/utils';
import { cacheSchemaClientSide } from '@/gradian-ui/schema-manager/utils/schema-client-cache';
import { getLabelClasses, errorTextClasses } from '../utils/field-styles';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { getValidBadgeVariant } from '@/gradian-ui/data-display/utils/badge-variant-mapper';
import { buildReferenceFilterUrl } from '../../utils/reference-filter-builder';
import { useDynamicFormContextStore } from '@/stores/dynamic-form-context.store';
import { replaceDynamicContext } from '../../utils/dynamic-context-replacer';

export interface PickerInputProps {
  config: any;
  value?: any;
  onChange?: (value: any) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  error?: string;
  touched?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const PickerInput: React.FC<PickerInputProps> = ({
  config,
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  touched,
  disabled = false,
  required = false,
  className,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [targetSchema, setTargetSchema] = useState<FormSchema | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [fetchedItems, setFetchedItems] = useState<Map<string, any>>(new Map());
  const fetchingItemsRef = useRef<Set<string>>(new Set());
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [lastValidSelection, setLastValidSelection] = useState<NormalizedOption[] | null>(null);
  const queryClient = useQueryClient();

  // Get dynamic context for reference-based filtering
  // Use selector to ensure reactivity when formSchema or formData changes
  const formSchema = useDynamicFormContextStore((state) => state.formSchema);
  const formData = useDynamicFormContextStore((state) => state.formData);
  const dynamicContext = { formSchema, formData };

  // Get targetSchema or sourceUrl from config
  // Memoize these to prevent unnecessary re-renders when config object reference changes
  // Ensure we handle empty strings and other falsy values correctly
  // Also check for alternative property names that might be used in production
  // Process through dynamic context replacer to support templates like {{formData.resourceType}}
  const targetSchemaId = useMemo(() => {
    // Try multiple possible property names
    const ts = (config as any).targetSchema || (config as any).target_schema || (config as any)['target-schema'];
    
    if (!ts || String(ts).trim() === '') {
      return null;
    }
    
    const rawTargetSchema = String(ts).trim();
    
    // Process through dynamic context replacer to resolve templates like {{formData.resourceType}}
    const resolvedTargetSchema = replaceDynamicContext(rawTargetSchema, dynamicContext);
    
    // Check if the result still contains unresolved templates (still has {{ and }})
    // If so, return null to prevent invalid schema fetches
    if (resolvedTargetSchema.includes('{{') && resolvedTargetSchema.includes('}}')) {
      return null;
    }
    
    // Return null for empty string, otherwise return the resolved value
    const result = resolvedTargetSchema.trim() !== '' ? resolvedTargetSchema.trim() : null;
    
    // Log in production to help debug issues
    if (process.env.NODE_ENV === 'production' && !result && (config as any).component === 'picker') {
      loggingCustom(LogType.CLIENT_LOG, 'warn', `[PickerInput] targetSchemaId is null/empty for field: ${(config as any).name || (config as any).id}, targetSchema value: ${JSON.stringify(ts)}, resolved: ${JSON.stringify(resolvedTargetSchema)}, config keys: ${Object.keys(config || {}).join(', ')}`);
    }
    
    return result;
  }, [(config as any).targetSchema, (config as any).target_schema, (config as any)['target-schema'], (config as any).name, (config as any).id, dynamicContext.formSchema, dynamicContext.formData]);
  
  // Check for reference-based filtering fields
  const referenceSchema = (config as any).referenceSchema;
  const referenceRelationTypeId = (config as any).referenceRelationTypeId;
  const referenceEntityId = (config as any).referenceEntityId;
  
  // Check if referenceEntityId is static (no dynamic context syntax)
  const isStaticReferenceId = useMemo(() => {
    return referenceEntityId && !referenceEntityId.includes('{{') && !referenceEntityId.includes('}}');
  }, [referenceEntityId]);
  
  // Build sourceUrl from reference fields if they're present and no explicit sourceUrl is provided
  const referenceBasedSourceUrl = useMemo(() => {
    if (!referenceSchema || !referenceRelationTypeId || !referenceEntityId) {
      return null;
    }
    
    // For static IDs, we can build the URL immediately without waiting for dynamic context
    // For dynamic IDs, we need the context to be ready
    const shouldUseContext = !isStaticReferenceId;
    const contextSchema = shouldUseContext ? dynamicContext.formSchema : undefined;
    const contextValues = shouldUseContext ? dynamicContext.formData : undefined;
    
    // Build the sourceUrl using reference fields
    const url = buildReferenceFilterUrl({
      referenceSchema,
      referenceRelationTypeId,
      referenceEntityId,
      targetSchema: targetSchemaId || undefined,
      schema: contextSchema,
      values: contextValues,
    });
    
    // If URL is empty (e.g., dynamic context not ready for dynamic IDs), return null to allow fallback to targetSchema
    return url && url.trim() !== '' ? url : null;
  }, [referenceSchema, referenceRelationTypeId, referenceEntityId, targetSchemaId, isStaticReferenceId, dynamicContext.formSchema, dynamicContext.formData]);
  
  // Use explicit sourceUrl if provided, otherwise use reference-based sourceUrl
  const sourceUrl = useMemo(() => {
    const explicitSourceUrl = (config as any).sourceUrl;
    if (explicitSourceUrl) {
      return explicitSourceUrl;
    }
    return referenceBasedSourceUrl || undefined;
  }, [(config as any).sourceUrl, referenceBasedSourceUrl]);
  const fieldOptions = (config as any).options; // Static options from field config
  const allowMultiselect = Boolean(
    (config as any)?.metadata?.allowMultiselect ??
    (config as any)?.allowMultiselect
  );
  
  // Use explicit columnMap if provided, otherwise provide default for reference-based filtering
  // Reference-based filtering returns data in format: { data: [{ data: [...] }] }
  // So we need to extract from data[0].data
  const columnMap = useMemo(() => {
    const explicitColumnMap = (config as any).columnMap;
    if (explicitColumnMap) {
      return explicitColumnMap;
    }
    // If using reference-based filtering, provide default columnMap to extract from nested structure
    if (referenceBasedSourceUrl && !explicitColumnMap) {
      return {
        response: { data: 'data.0.data' }, // Extract items from data[0].data array
        item: {
          id: 'id',
          label: 'label',
          icon: 'icon',
          color: 'color',
        },
      };
    }
    return explicitColumnMap;
  }, [(config as any).columnMap, referenceBasedSourceUrl]);
  const pageSize = (config as any).pageSize;
  const sortType = (config as any).sortType;
  const sourceColumnRoles = (config as any).sourceColumnRoles;
  
  // Use static options if available and no schemaId/sourceUrl is provided
  const staticItems = useMemo(() => {
    if (fieldOptions && Array.isArray(fieldOptions) && fieldOptions.length > 0 && !targetSchemaId && !sourceUrl) {
      return fieldOptions;
    }
    return undefined;
  }, [fieldOptions, targetSchemaId, sourceUrl]);
  // Ensure value is always an array to maintain controlled component state
  const normalizedValue = useMemo(() => {
    if (value === null || value === undefined) {
      return [];
    }
    if (Array.isArray(value)) {
      return value;
    }
    // If single value, wrap in array
    return [value];
  }, [value]);

  // Base normalized selection (without enrichment to avoid circular dependencies)
  const baseNormalizedSelection = useMemo(() => {
    return normalizeOptionArray(normalizedValue);
  }, [normalizedValue]);

  // Enrich normalized selection with icon/color/label from selectedItem/fetchedItems (only for display, not as dependency)
  const normalizedSelection = useMemo(() => {
    const normalized = baseNormalizedSelection;
    
    // Enrich all items that need enrichment (label equals ID, or missing icon/color)
    return normalized.map((opt) => {
      const optId = String(opt.id);
      const labelNeedsEnrichment = !opt.label || String(opt.label) === optId;
      const needsEnrichment = labelNeedsEnrichment || !opt.icon || !opt.color;
      
      if (!needsEnrichment) {
        return opt;
      }
      
      // Try to get enriched data from fetchedItems map first, then selectedItem
      let fetchedItem = fetchedItems.get(optId);
      if (!fetchedItem && selectedItem && String(selectedItem.id) === optId) {
        fetchedItem = selectedItem;
      }
      
      if (!fetchedItem) {
        // If no fetched item available, return as-is (will be fetched by useEffect)
        return opt;
      }
      
      // Get label from fetchedItem (prefer role-based lookup for targetSchema, then name/title/label)
      let enrichedLabel = opt.label;
      if (labelNeedsEnrichment) {
        if (targetSchema && fetchedItem) {
          // For targetSchema, use role-based lookup to get title (proper display value)
          enrichedLabel = getValueByRole(targetSchema, fetchedItem, 'title') || fetchedItem.name || fetchedItem.title || fetchedItem.label || optId;
        } else {
          // For sourceUrl or other cases, use name/title/label from fetchedItem
          enrichedLabel = fetchedItem.label || fetchedItem.name || fetchedItem.title || optId;
        }
      }
      
      return {
        ...opt,
        label: enrichedLabel,
        icon: opt.icon || fetchedItem.icon,
        color: opt.color || fetchedItem.color,
      };
    });
  }, [baseNormalizedSelection, selectedItem, fetchedItems, targetSchema]);
  const selectedIdsForPicker = useMemo(
    () =>
      normalizedSelection
        .map((opt) => opt.id)
        .filter((id): id is string => Boolean(id))
        .map((id) => String(id)),
    [normalizedSelection]
  );

  // Fetch target schema when component mounts or targetSchemaId changes (skip if using sourceUrl or staticItems)
  useEffect(() => {
    // Clear targetSchema and selectedItem if targetSchemaId changes or becomes null
    if (!targetSchemaId) {
      setTargetSchema(null);
      setSelectedItem(null);
      return;
    }

    // Check if we need to fetch a new schema (either no schema or schema id doesn't match)
    const needsFetch = !targetSchema || targetSchema.id !== targetSchemaId;
    
    if (targetSchemaId && needsFetch && !sourceUrl && !staticItems) {
      // Clear old schema and selected item before fetching new one
      setTargetSchema(null);
      setSelectedItem(null);
      
      setIsLoadingSchema(true);
      const fetchSchema = async () => {
        try {
          const response = await apiRequest<FormSchema>(`/api/schemas/${targetSchemaId}`);
          if (response.success && response.data) {
            await cacheSchemaClientSide(response.data, { queryClient, persist: false });
            setTargetSchema(response.data);
          }
        } catch (err) {
          loggingCustom(LogType.CLIENT_LOG, 'error', `Error fetching target schema: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
          setIsLoadingSchema(false);
        }
      };
      fetchSchema();
    }
  }, [targetSchemaId, targetSchema, sourceUrl, staticItems, queryClient]);

  // Fetch selected item when value changes (only for targetSchema, not sourceUrl)
  useEffect(() => {
    const fetchSelectedItem = async (primaryValue: any) => {
      try {
        // Skip fetching if using sourceUrl instead of targetSchema
        if (sourceUrl || !targetSchemaId || !targetSchema) {
          if (sourceUrl && primaryValue) {
            const resolvedId = extractFirstId(primaryValue);
            
            // For sourceUrl, use the normalized option which has label/icon/color
            if (typeof primaryValue === 'object' && primaryValue.id) {
              // If it's a normalized option (has id, label, icon, color), use it directly
              const hasIconOrColor = primaryValue.icon || primaryValue.color;
              
              if (hasIconOrColor) {
                setSelectedItem({
                  id: primaryValue.id,
                  label: primaryValue.label,
                  name: primaryValue.label || primaryValue.name || primaryValue.title,
                  title: primaryValue.label || primaryValue.title,
                  icon: primaryValue.icon,
                  color: primaryValue.color,
                });
              } else if (resolvedId) {
                // If no icon/color but we have an ID, fetch from sourceUrl to get icon/color
                try {
                  const response = await apiRequest<any>(`${sourceUrl}&includeIds=${encodeURIComponent(resolvedId)}`);
                  if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
                    const items = response.data[0]?.data || [];
                    const matchedItem = items.find((item: any) => String(item.id) === String(resolvedId));
                    if (matchedItem) {
                      setSelectedItem({
                        id: resolvedId,
                        label: matchedItem.label || primaryValue.label,
                        name: matchedItem.label || primaryValue.label || primaryValue.name || primaryValue.title,
                        title: matchedItem.label || primaryValue.label || primaryValue.title,
                        icon: matchedItem.icon || primaryValue.icon,
                        color: matchedItem.color || primaryValue.color,
                      });
                      return;
                    }
                  }
                } catch (err) {
                  loggingCustom(LogType.CLIENT_LOG, 'warn', `Error fetching item from sourceUrl for icon/color: ${err instanceof Error ? err.message : String(err)}`);
                }
                
                // Fallback: use what we have
                setSelectedItem({
                  id: primaryValue.id,
                  label: primaryValue.label,
                  name: primaryValue.label || primaryValue.name || primaryValue.title,
                  title: primaryValue.label || primaryValue.title,
                  icon: primaryValue.icon,
                  color: primaryValue.color,
                });
              } else {
                setSelectedItem(primaryValue);
              }
            } else if (typeof primaryValue === 'object') {
              // Fallback for other object formats
              setSelectedItem(primaryValue);
            } else if (resolvedId) {
              // If we only have an ID, fetch from sourceUrl to get icon/color
              try {
                const response = await apiRequest<any>(`${sourceUrl}&includeIds=${encodeURIComponent(resolvedId)}`);
                if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
                  const items = response.data[0]?.data || [];
                  const matchedItem = items.find((item: any) => String(item.id) === String(resolvedId));
                  if (matchedItem) {
                    setSelectedItem({
                      id: resolvedId,
                      label: matchedItem.label,
                      name: matchedItem.label,
                      title: matchedItem.label,
                      icon: matchedItem.icon,
                      color: matchedItem.color,
                    });
                    return;
                  }
                }
              } catch (err) {
                loggingCustom(LogType.CLIENT_LOG, 'warn', `Error fetching item from sourceUrl: ${err instanceof Error ? err.message : String(err)}`);
              }
              setSelectedItem({ id: resolvedId });
            } else {
              setSelectedItem({ id: resolvedId });
            }
          } else {
            setSelectedItem(null);
          }
          return;
        }

        if (primaryValue === null || primaryValue === undefined) {
          setSelectedItem(null);
          return;
        }

        const resolvedId = extractFirstId(primaryValue);
        if (!resolvedId) {
          setSelectedItem(null);
          return;
        }

        const response = await apiRequest<any>(`/api/data/${targetSchemaId}/${resolvedId}`);
        if (response.success && response.data) {
          const itemData = response.data;
          // Add default icon/color for users schema if missing
          const enrichedItem = targetSchemaId === 'users' ? {
            ...itemData,
            icon: itemData.icon || 'User',
            color: itemData.color || 'blue',
          } : itemData;
          
          // Store in fetchedItems map for all items, and in selectedItem for primary item
          setFetchedItems(prev => {
            const newMap = new Map(prev);
            newMap.set(resolvedId, enrichedItem);
            return newMap;
          });
          setSelectedItem(enrichedItem);
          return;
        }

        if (typeof primaryValue === 'object') {
          if (primaryValue.label) {
            setSelectedItem({
              id: resolvedId,
              name: primaryValue.label,
              title: primaryValue.label,
            });
          } else {
            setSelectedItem(primaryValue);
          }
          return;
        }

        setSelectedItem({ id: resolvedId });
      } catch (err) {
        loggingCustom(LogType.CLIENT_LOG, 'error', `Error fetching selected item: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    if (normalizedValue.length === 0) {
      setSelectedItem(null);
      setFetchedItems(new Map());
      fetchingItemsRef.current.clear();
      return;
    }

    // Fetch primary item first (for selectedItem state)
    const primaryValue = baseNormalizedSelection[0] ?? normalizedValue[0];
    fetchSelectedItem(primaryValue);

    // Fetch remaining items that need enrichment (for multiselect)
    // Only fetch items where label equals ID (they need enrichment)
    if (baseNormalizedSelection.length > 1 && targetSchemaId && targetSchema) {
      baseNormalizedSelection.forEach(opt => {
        const optId = String(opt.id);
        // Skip primary item (already being fetched)
        if (optId === String(primaryValue?.id || '')) {
          return;
        }
        
        // Only fetch if label equals ID (needs enrichment)
        const labelNeedsEnrichment = !opt.label || String(opt.label) === optId;
        if (!labelNeedsEnrichment) {
          return;
        }
        
        // Skip if already fetching (using ref to track in-flight requests)
        if (fetchingItemsRef.current.has(optId)) {
          return;
        }
        
        // Mark as fetching
        fetchingItemsRef.current.add(optId);
        
        // Fetch individual item
        const fetchItem = async () => {
          try {
            const response = await apiRequest<any>(`/api/data/${targetSchemaId}/${optId}`);
            if (response.success && response.data) {
              const itemData = response.data;
              const enrichedItem = targetSchemaId === 'users' ? {
                ...itemData,
                icon: itemData.icon || 'User',
                color: itemData.color || 'blue',
              } : itemData;
              
              setFetchedItems(prev => {
                const newMap = new Map(prev);
                newMap.set(optId, enrichedItem);
                return newMap;
              });
            }
          } catch (err) {
            loggingCustom(LogType.CLIENT_LOG, 'error', `Error fetching item ${optId}: ${err instanceof Error ? err.message : String(err)}`);
          } finally {
            // Remove from fetching set
            fetchingItemsRef.current.delete(optId);
          }
        };
        fetchItem();
      });
    }
    
    // Note: sourceUrl is intentionally NOT in dependencies - we only want to re-fetch when value changes,
    // not when sourceUrl changes. sourceUrl is just configuration, not a trigger for re-fetching.
    // Use baseNormalizedSelection instead of normalizedSelection to avoid circular dependency with selectedItem
    // fetchedItems is intentionally NOT in dependencies to avoid infinite loop (we update it inside this effect)
  }, [normalizedValue, baseNormalizedSelection, targetSchemaId, targetSchema]);

  const handleSelect = async (selectedOptions: NormalizedOption[], rawItems: any[]) => {
    // Guard against empty selections - only process if we have valid options
    // For single select, empty array should only come from explicit clear action
    if (!selectedOptions || selectedOptions.length === 0) {
      // For single select, don't clear on empty - this prevents accidental clearing
      // Only clear if explicitly requested (via handleClear)
      if (!allowMultiselect) {
        // Single select: ignore empty selections, preserve current value
        // If we have a last valid selection, restore it
        if (lastValidSelection && lastValidSelection.length > 0) {
          loggingCustom(LogType.CLIENT_LOG, 'warn', '[PickerInput] Ignoring empty selection for single-select, preserving last valid selection');
        }
        setIsPickerOpen(false);
        return;
      }
      // Multiselect: allow clearing
      onChange?.([]);
      setSelectedItem(null);
      setLastValidSelection(null);
      setIsPickerOpen(false);
      return;
    }

    // Enrich selectedOptions with proper labels/icon/color from rawItems for targetSchema
    // This ensures the saved data has proper labels, not just IDs
    let enrichedOptions = selectedOptions;
    if (!sourceUrl && targetSchema && rawItems && rawItems.length > 0) {
      enrichedOptions = selectedOptions.map((option, idx) => {
        const rawItem = rawItems[idx];
        if (rawItem && String(option.id) === String(rawItem.id)) {
          // Get proper label from rawItem using role-based lookup
          const properLabel = getValueByRole(targetSchema, rawItem, 'title') || rawItem.name || rawItem.title || rawItem.label || option.label;
          return {
            ...option,
            label: properLabel,
            icon: option.icon || rawItem.icon,
            color: option.color || rawItem.color,
          };
        }
        return option;
      });
    }

    // Store valid selection before calling onChange to prevent race conditions
    setLastValidSelection(enrichedOptions);
    // Call onChange with the enriched selection
    onChange?.(enrichedOptions);

    // For sourceUrl, use the normalized option which has label/icon/color from columnMap
    // For targetSchema, prefer rawItems which has full schema data
    if (sourceUrl) {
      const primaryOption = enrichedOptions[0];
      if (primaryOption) {
        setSelectedItem({
          id: primaryOption.id,
          label: primaryOption.label,
          name: primaryOption.label,
          title: primaryOption.label,
          icon: primaryOption.icon,
          color: primaryOption.color,
        });
      }
    } else {
      const primaryRawItem = rawItems?.[0];
      if (primaryRawItem) {
        setSelectedItem(primaryRawItem);
      } else {
        const primaryOption = enrichedOptions[0];
        setSelectedItem({
          id: primaryOption.id,
          name: primaryOption.label,
          title: primaryOption.label,
        });
      }
    }

    setIsPickerOpen(false);
  };

  const handleClear = () => {
    // Clear the selection
    onChange?.([]);
    setSelectedItem(null);
    setLastValidSelection(null);
    // Ensure picker can be reopened after clearing
    setIsPickerOpen(false);
  };

  const handleRemoveItem = (itemId: string) => {
    if (disabled) return;
    const updatedSelection = normalizedSelection.filter((opt) => String(opt.id) !== String(itemId));
    onChange?.(updatedSelection);
    
    // Update selectedItem if we removed the primary item
    if (updatedSelection.length === 0) {
      setSelectedItem(null);
      setLastValidSelection(null);
    } else if (updatedSelection.length > 0 && String(normalizedSelection[0]?.id) === String(itemId)) {
      // If we removed the first item, update selectedItem to the new first item
      const newPrimary = updatedSelection[0];
      
      // For sourceUrl, use the normalized option directly
      if (sourceUrl && newPrimary) {
        setSelectedItem({
          id: newPrimary.id,
          label: newPrimary.label,
          name: newPrimary.label,
          title: newPrimary.label,
          icon: newPrimary.icon,
          color: newPrimary.color,
        });
      } else if (newPrimary && targetSchema) {
        // Try to fetch the new primary item if we have a schema
        const fetchNewPrimary = async () => {
          try {
            const response = await apiRequest<any>(`/api/data/${targetSchemaId}/${newPrimary.id}`);
            if (response.success && response.data) {
              setSelectedItem(response.data);
            }
          } catch (err) {
            // If fetch fails, just use the normalized option
            setSelectedItem({
              id: newPrimary.id,
              name: newPrimary.label,
              title: newPrimary.label,
            });
          }
        };
        fetchNewPrimary();
      } else {
        setSelectedItem({
          id: newPrimary.id,
          name: newPrimary.label,
          title: newPrimary.label,
        });
      }
    }
  };

  const getDisplayValue = () => {
    // Always return a string, never undefined or the string "undefined"
    const safeReturn = (value: string | undefined | null): string => {
      if (!value || value === 'undefined' || value === 'null') return '';
      return String(value);
    };

    if (allowMultiselect) {
      if (normalizedSelection.length === 0) {
        return '';
      }
      if (normalizedSelection.length > 1) {
        return `${normalizedSelection.length} items selected`;
      }
    }

    // For sourceUrl, use normalized selection directly
    if (sourceUrl) {
      const fallbackOption = normalizedSelection[0];
      if (fallbackOption) {
        const label = fallbackOption.label;
        const id = fallbackOption.id;
        // Ensure we never return undefined - convert to empty string
        if (label && label !== 'undefined') return label;
        if (id && id !== 'undefined') return id;
        return '';
      }
      if (selectedItem) {
        const name = selectedItem.name;
        const title = selectedItem.title;
        const itemId = selectedItem.id;
        // Ensure we never return undefined - convert to empty string
        if (name && name !== 'undefined') return name;
        if (title && title !== 'undefined') return title;
        if (itemId && itemId !== 'undefined') return String(itemId);
        return '';
      }
      return '';
    }

    if (!selectedItem || !targetSchema) {
      const fallbackOption = normalizedSelection[0];
      if (fallbackOption) {
        const label = fallbackOption.label;
        const id = fallbackOption.id;
        // Ensure we never return undefined - convert to empty string
        if (label && label !== 'undefined') return label;
        if (id && id !== 'undefined') return id;
        return '';
      }
      return '';
    }

    // Try to get title field from schema (uses role-based concatenation)
    const title = getValueByRole(targetSchema, selectedItem, 'title') || selectedItem.name || selectedItem.title || '';
    const subtitle = getSingleValueByRole(targetSchema, selectedItem, 'subtitle') || selectedItem.email || '';
    
    // Ensure we always return a string, never undefined
    if (!title) return '';
    return subtitle ? `${title} (${subtitle})` : title;
  };

  const fieldName = (config as any).name || 'unknown';
  const fieldLabel = (config as any).label;
  const fieldPlaceholder = (config as any).placeholder || 'Click to select...';

  return (
    <TooltipProvider delayDuration={300}>
    <div className={cn('w-full space-y-2', className)}>
      {fieldLabel && (
        <label
          htmlFor={fieldName}
          className={getLabelClasses({ error: Boolean(error), required })}
        >
          {fieldLabel}
        </label>
      )}
      
      {/* Show badges for multiselect mode */}
      {allowMultiselect && normalizedSelection.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-2 min-h-10 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
          <div className="flex flex-wrap gap-2 flex-1">
            {normalizedSelection.map((option) => {
              const optionId = String(option.id || '');
              const optionLabel = option.label || optionId;
              const optionIcon = option.icon;
              const optionColor = option.color;
              
              const isHexColor = (color: string): boolean => {
                return color.startsWith('#');
              };
              
              const isTailwindClasses = (color: string): boolean => {
                return color.includes('bg-') || 
                       color.includes('text-') || 
                       color.includes('border-') ||
                       color.includes('rounded-') ||
                       /^[a-z]+-[a-z0-9-]+/.test(color);
              };
              
              // Determine badge variant or style based on color
              let badgeVariant: any = 'outline';
              let badgeClassName = 'flex items-center gap-1.5 px-2 py-1 text-sm';
              let badgeStyle: React.CSSProperties | undefined = undefined;
              
              if (optionColor) {
                if (isHexColor(optionColor)) {
                  // Hex color - use inline style
                  badgeStyle = { backgroundColor: optionColor, color: '#fff', border: 'none' };
                  badgeClassName += ' rounded-full font-medium';
                } else if (isTailwindClasses(optionColor)) {
                  // Tailwind classes - use as-is
                  const hasTextColor = optionColor.includes('text-');
                  const defaultTextColor = hasTextColor ? '' : 'text-white';
                  badgeClassName += ` rounded-full font-medium border ${defaultTextColor} ${optionColor}`;
                } else {
                  // Color name (purple, violet, etc.) - convert to valid badge variant
                  badgeVariant = getValidBadgeVariant(optionColor);
                }
              } else {
                // Default violet styling if no color
                badgeClassName += ' bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800';
              }
              
              return (
                <Tooltip key={optionId}>
                  <TooltipTrigger asChild>
                    <Badge
                        variant={badgeVariant}
                        className={badgeClassName}
                        style={badgeStyle}
                      >
                        {optionIcon && (
                          <IconRenderer iconName={optionIcon} className="h-3 w-3" />
                        )}
                        <span className="max-w-[200px] truncate">{optionLabel}</span>
                        {!disabled && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItem(optionId);
                            }}
                            className="ms-0.5 rounded-full hover:bg-violet-200 dark:hover:bg-violet-800 focus:outline-none p-0.5 transition-colors"
                            aria-label={`Remove ${optionLabel}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm">
                    <span>{optionLabel}</span>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => !disabled && setIsPickerOpen(true)}
              disabled={disabled}
              className="h-7 w-7 p-0"
              aria-label="Add more items"
            >
              <Search className="h-4 w-4" />
            </Button>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-7 w-7 p-0"
                aria-label="Clear all"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Show badges or input for single select or when no items selected in multiselect */}
      {(!allowMultiselect || normalizedSelection.length === 0) && (
        <div className="flex gap-2">
          {/* Show badge if selected item has icon or color */}
          {normalizedSelection.length > 0 && (normalizedSelection[0]?.icon || normalizedSelection[0]?.color) ? (
            <div className="flex-1 flex items-center gap-2 p-2 min-h-10 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
              <div className="flex-1">
                {normalizedSelection.map((option) => {
                  const optionId = String(option.id || '');
                  const optionLabel = option.label || optionId;
                  const optionIcon = option.icon;
                  const optionColor = option.color;
                  
                  const isHexColor = (color: string): boolean => {
                    return color.startsWith('#');
                  };
                  
                  const isTailwindClasses = (color: string): boolean => {
                    return color.includes('bg-') || 
                           color.includes('text-') || 
                           color.includes('border-') ||
                           color.includes('rounded-') ||
                           /^[a-z]+-[a-z0-9-]+/.test(color);
                  };
                  
                  const iconEl = optionIcon ? (
                    <IconRenderer iconName={optionIcon} className="h-3 w-3" />
                  ) : null;
                  
                  let badgeContent: React.ReactNode;
                  
                  // Use getValidBadgeVariant to convert color to valid badge variant
                  if (optionColor) {
                    if (isHexColor(optionColor)) {
                      // Hex color - use inline style
                      badgeContent = (
                        <div 
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium"
                          style={{ backgroundColor: optionColor, color: '#fff', border: 'none' }}
                        >
                          {iconEl}
                          <span className="max-w-[200px] truncate">{optionLabel}</span>
                        </div>
                      );
                    } else if (isTailwindClasses(optionColor)) {
                      // Tailwind classes - use as-is
                      const hasTextColor = optionColor.includes('text-');
                      const defaultTextColor = hasTextColor ? '' : 'text-white';
                      badgeContent = (
                        <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium border ${defaultTextColor} ${optionColor}`}>
                          {iconEl}
                          <span className="max-w-[200px] truncate">{optionLabel}</span>
                        </div>
                      );
                    } else {
                      // Color name (purple, violet, etc.) - convert to valid badge variant
                      const badgeVariant = getValidBadgeVariant(optionColor);
                      badgeContent = (
                        <Badge variant={badgeVariant} className="flex items-center gap-1.5 px-2 py-1">
                          {iconEl}
                          <span className="max-w-[200px] truncate">{optionLabel}</span>
                        </Badge>
                      );
                    }
                  } else {
                    // Default badge with icon if no color
                    badgeContent = (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1.5 px-2 py-1 text-sm bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800"
                      >
                        {iconEl}
                        <span className="max-w-[200px] truncate">{optionLabel}</span>
                      </Badge>
                    );
                  }
                  
                  return (
                    <div key={optionId} className="flex items-center gap-2 flex-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex min-w-0 max-w-full">{badgeContent}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm">
                          <span>{optionLabel}</span>
                        </TooltipContent>
                      </Tooltip>
                      {!disabled && !allowMultiselect && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleClear}
                          className="h-7 w-7 p-0 shrink-0"
                          aria-label={`Clear ${optionLabel}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (disabled) return;
                  // Ensure we have a valid picker configuration before opening
                  if (!targetSchemaId && !sourceUrl && !staticItems) {
                    loggingCustom(LogType.CLIENT_LOG, 'warn', `[PickerInput] Cannot open picker - no targetSchemaId, sourceUrl, or staticItems. Field: ${fieldName}, targetSchema: ${(config as any).targetSchema}`);
                    return;
                  }
                  setIsPickerOpen(true);
                }}
                disabled={disabled}
                className="h-7 w-7 p-0 shrink-0"
                aria-label="Change selection"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            /* Show regular input if no icon/color */
            <div className="relative flex-1">
              <Input
                id={fieldName}
                name={fieldName}
                type="text"
                value={getDisplayValue() || ''}
                placeholder={fieldPlaceholder}
                readOnly
                onClick={() => {
                  if (disabled) return;
                  // Ensure we have a valid picker configuration before opening
                  if (!targetSchemaId && !sourceUrl && !staticItems) {
                    loggingCustom(LogType.CLIENT_LOG, 'warn', `[PickerInput] Cannot open picker - no targetSchemaId, sourceUrl, or staticItems. Field: ${fieldName}, targetSchema: ${(config as any).targetSchema}`);
                    return;
                  }
                  setIsPickerOpen(true);
                }}
                onFocus={onFocus}
                onBlur={onBlur}
                disabled={disabled}
                className={cn(
                  'cursor-pointer',
                  error
                    ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500'
                    : ''
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (disabled) return;
                  // Ensure we have a valid picker configuration before opening
                  if (!targetSchemaId && !sourceUrl && !staticItems) {
                    loggingCustom(LogType.CLIENT_LOG, 'warn', `[PickerInput] Cannot open picker - no targetSchemaId, sourceUrl, or staticItems. Field: ${fieldName}, targetSchema: ${(config as any).targetSchema}`);
                    return;
                  }
                  setIsPickerOpen(true);
                }}
                disabled={disabled}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          )}
          {selectedItem && !disabled && !allowMultiselect && normalizedSelection.length > 0 && !(normalizedSelection[0]?.icon || normalizedSelection[0]?.color) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-10 w-10 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      {error && (
        <p className={errorTextClasses} role="alert">
          {error}
        </p>
      )}
      
      {/* Always render PopupPicker if we have targetSchemaId, sourceUrl, or staticItems */}
      {/* This ensures the picker is available even if schema fetch fails or is still loading */}
      {(targetSchemaId || sourceUrl || staticItems) && (
        <PopupPicker
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          schemaId={targetSchemaId || undefined}
          sourceUrl={sourceUrl}
          schema={targetSchema || undefined}
          onSelect={handleSelect}
          title={sourceUrl ? (config as any).label || 'Select item' : staticItems ? (config as any).label || 'Select option' : `Select ${targetSchema?.plural_name || targetSchema?.singular_name || targetSchemaId || 'item'}`}
          description={(config as any).description || (sourceUrl ? 'Choose an item' : staticItems ? 'Choose an option' : `Choose a ${targetSchema?.singular_name || 'item'}`)}
          canViewList={Boolean(targetSchemaId)}
          viewListUrl={targetSchemaId ? `/page/${targetSchemaId}` : undefined}
          allowMultiselect={allowMultiselect}
          selectedIds={selectedIdsForPicker}
          columnMap={columnMap}
          pageSize={pageSize}
          sortType={sortType}
          sourceColumnRoles={sourceColumnRoles}
          staticItems={staticItems}
        />
      )}
    </div>
    </TooltipProvider>
  );
};

PickerInput.displayName = 'PickerInput';
