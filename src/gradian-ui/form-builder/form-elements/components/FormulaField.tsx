'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit2, Lock, Calculator, RefreshCw, X } from 'lucide-react';
import { cn } from '@/gradian-ui/shared/utils';
import { FormulaInput } from '@/gradian-ui/formula-engine';
import { useFormulaEvaluation } from '@/gradian-ui/formula-engine/hooks/useFormulaEvaluation';
import { FormField } from '@/gradian-ui/schema-manager/types/form-schema';
import { useDynamicFormContextStore } from '@/stores/dynamic-form-context.store';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { getLabelClasses, errorTextClasses } from '../utils/field-styles';
import { extractVariableValues, substituteVariablesWithFieldNames, formulaWithFieldNamesToKaTeX, createCalculationBreakdownWithFieldNames } from '@/gradian-ui/formula-engine/utils/formula-visualization';
import { resolveUnit } from '@/gradian-ui/formula-engine/utils/unit-resolver';
import { FormulaContext } from '@/gradian-ui/formula-engine/utils/formula-parser';
import { CopyContent } from './CopyContent';
import { IconRenderer, isValidLucideIcon } from '@/gradian-ui/shared/utils/icon-renderer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Component for unit tooltip with touch support
const UnitTooltip: React.FC<{
  icon: string;
  label: string;
  color?: string | null;
}> = ({ icon, label, color }) => {
  const [open, setOpen] = useState(false);
  // Force neutral icon color to avoid theme accent (blue) bleed
  const iconStyle = undefined;
  const labelStyle = color ? { color } : undefined;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <span 
            className="cursor-help inline-flex items-center touch-manipulation text-gray-700 dark:text-gray-300"
            onTouchStart={(e) => {
              e.preventDefault();
              setOpen(true);
            }}
            onClick={(e) => {
              e.preventDefault();
              setOpen(!open);
            }}
          >
            <IconRenderer 
              iconName={icon} 
              className={cn(
                "h-4 w-4",
                "text-gray-700 dark:text-gray-300"
              )}
              style={iconStyle}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          sideOffset={4} 
          className="z-50 text-gray-900 dark:text-gray-100"
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <IconRenderer 
              iconName={icon} 
              className={cn(
                "h-3.5 w-3.5",
                "text-gray-700 dark:text-gray-300"
              )}
              style={iconStyle}
            />
            <span 
              className={cn(
                !labelStyle && "text-gray-700 dark:text-gray-300",
                "!text-gray-700 dark:!text-gray-300"
              )} 
              style={labelStyle}
            >
              {label}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export interface FormulaFieldProps {
  config: FormField;
  value?: any;
  onChange?: (value: any) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

/**
 * Formula Field Component
 * 
 * Displays a calculated value based on a formula expression.
 * Fields with formulas are disabled by default (read-only).
 * Can optionally show formula editor for configuration.
 */
export const FormulaField: React.FC<FormulaFieldProps> = ({
  config,
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  disabled = false,
  required = false,
  className
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [localFormula, setLocalFormula] = React.useState(config.formula || '');
  const [referenceData, setReferenceData] = React.useState<Record<string, any[]>>({});
  const [enrichedFormData, setEnrichedFormData] = React.useState<Record<string, any>>({});
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = React.useState(false);
  const lastEntityIdRef = React.useRef<string | undefined>(undefined);
  const isFetchingRef = React.useRef(false); // Prevent concurrent fetches
  const fetchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null); // For debouncing

  // Get form data from context
  const formData = useDynamicFormContextStore((s) => s.formData);
  const formSchema = useDynamicFormContextStore((s) => s.formSchema);
  
  // Store formData in a ref to avoid stale closures
  const formDataRef = React.useRef(formData);
  React.useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Formula is disabled by default (read-only calculated field)
  const isDisabled = disabled || true; // Always disabled for formula fields (calculated)

  // Extract dependencies to fetch reference data and related entity data
  const dependencies = useMemo(() => {
    if (!localFormula) return [];
    // Match {{reference.fieldName}} or {{reference.fieldName.property.aggregation}}
    const refPattern = /\{\{reference\.([^.]+)(?:\.[^}]+)*\}\}/g;
    const matches: string[] = [];
    let match;
    while ((match = refPattern.exec(localFormula)) !== null) {
      // Extract just the field name (first part after 'reference.')
      const fieldName = match[1];
      if (fieldName && !matches.includes(fieldName)) {
        matches.push(fieldName);
      }
    }
    return matches;
  }, [localFormula]);

  // Extract picker field dependencies (for nested property access like tenderItem.quantity)
  const pickerFieldDependencies = useMemo(() => {
    if (!localFormula) return [];
    const pattern = /\{\{formData\.([^.]+)\.([^}]+)\}\}/g;
    const matches: Array<{ field: string; property: string }> = [];
    let match;
    while ((match = pattern.exec(localFormula)) !== null) {
      matches.push({ field: match[1], property: match[2] });
    }
    return matches;
  }, [localFormula]);

  // Fetch reference data for picker fields and related entity data
  // Only fetch once on mount or when entity ID changes, unless manually refreshed
  const fetchReferenceData = React.useCallback(async (forceRefresh = false) => {
    // Skip if already fetched and not forcing refresh
    if (hasFetchedOnce && !forceRefresh) {
      return;
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setIsRefreshing(true);
    
    try {
      const refData: Record<string, any[]> = {};
      const enriched: Record<string, any> = {};
      
      const currentFormData = formData;
      const currentFormSchema = formSchema;

      // Fetch related entity data for picker fields with nested property access
      for (const { field } of pickerFieldDependencies) {
        const fieldValue = currentFormData?.[field];
        
        // If field is a picker field with an ID, fetch the full entity
        if (fieldValue) {
          let entityId: string | null = null;
          
          // Handle array (multi-select picker) - get first item
          if (Array.isArray(fieldValue) && fieldValue.length > 0) {
            const firstItem = fieldValue[0];
            entityId = typeof firstItem === 'object' && firstItem !== null 
              ? (firstItem.id || firstItem) 
              : firstItem;
          }
          // Handle object (single-select picker)
          else if (typeof fieldValue === 'object' && fieldValue !== null) {
            entityId = fieldValue.id || fieldValue;
          }
          // Handle string ID
          else if (typeof fieldValue === 'string') {
            entityId = fieldValue;
          }

          // If we have an ID and the field exists in schema, fetch the entity
          if (entityId && currentFormSchema) {
            const fieldConfig = currentFormSchema.fields?.find(f => f.name === field);
            if (fieldConfig?.component === 'picker' && fieldConfig.targetSchema) {
              try {
                const response = await apiRequest<any>(
                  `/api/data/${fieldConfig.targetSchema}/${entityId}`
                );
                
                if (response.success && response.data) {
                  // Store the fetched entity data
                  enriched[field] = response.data;
                }
              } catch (err) {
                console.warn(`Failed to fetch entity data for ${field}:`, err);
              }
            }
          }
        }
      }
      
      // Update enriched form data state
      if (Object.keys(enriched).length > 0) {
        setEnrichedFormData(enriched);
      }

      for (const fieldName of dependencies) {
        // First, check if we have the field value directly in formData (for new/edit forms)
        const fieldValue = currentFormData?.[fieldName];
        
        if (fieldValue && Array.isArray(fieldValue) && fieldValue.length > 0) {
          // Use the picker field value directly (already resolved)
          // These are typically objects with id, label, and potentially other fields
          refData[fieldName] = fieldValue;
          continue;
        }

        // If no direct value and we have an entity ID, try to fetch from relations
        if (currentFormData?.id && currentFormSchema) {
          const entityId = currentFormData.id;
          if (!entityId) continue;

          // First, try to find as a picker field
          const field = currentFormSchema.fields?.find(f => f.name === fieldName);
          if (field?.component === 'picker' && field.targetSchema) {
            try {
              // Fetch relations for this picker field
              const queryParams = new URLSearchParams();
              queryParams.append('sourceSchema', currentFormSchema.id || '');
              queryParams.append('sourceId', entityId);
              queryParams.append('relationTypeId', 'HAS_FIELD_VALUE');
              queryParams.append('fieldId', field.id || field.name);
              queryParams.append('resolveTargets', 'true');

              const response = await apiRequest<Array<{
                targetId: string;
                targetData?: any;
              }>>(`/api/relations?${queryParams.toString()}`);

              if (response.success && Array.isArray(response.data)) {
                // Extract values from relations
                const values = response.data
                  .map(rel => {
                    if (rel.targetData) {
                      return rel.targetData;
                    }
                    return { id: rel.targetId };
                  })
                  .filter(Boolean);

                refData[fieldName] = values;
                continue;
              }
            } catch (err) {
              console.warn(`Failed to fetch reference data for ${fieldName}:`, err);
            }
          }

          // If not found as picker field, try to find as repeating section
          // Check if there's a repeating section that targets a schema matching the field name
          // Convert fieldName (camelCase) to kebab-case for schema matching
          const fieldNameKebab = fieldName.replace(/([A-Z])/g, '-$1').toLowerCase();
          const fieldNameNoHyphens = fieldName.replace(/-/g, '');
          const schemaNameNoHyphens = (schemaName: string) => schemaName.replace(/-/g, '');
          
          const repeatingSection = currentFormSchema.sections?.find(s => 
            s.isRepeatingSection && 
            s.repeatingConfig?.targetSchema &&
            // Match field name to schema (e.g., "quotationItems" -> "quotation-items")
            (s.repeatingConfig.targetSchema === fieldName || 
             s.repeatingConfig.targetSchema === fieldNameKebab ||
             schemaNameNoHyphens(s.repeatingConfig.targetSchema) === fieldNameNoHyphens)
          );

          if (repeatingSection?.repeatingConfig) {
            try {
              // Fetch relations for repeating section
              const queryParams = new URLSearchParams();
              queryParams.append('sourceSchema', currentFormSchema.id || '');
              queryParams.append('sourceId', entityId);
              queryParams.append('relationTypeId', repeatingSection.repeatingConfig.relationTypeId || '');
              if (repeatingSection.repeatingConfig.targetSchema) {
                queryParams.append('targetSchema', repeatingSection.repeatingConfig.targetSchema);
              }
              queryParams.append('resolveTargets', 'true');

              const response = await apiRequest<Array<{
                targetId: string;
                targetData?: any;
              }>>(`/api/relations?${queryParams.toString()}`);

              if (response.success && Array.isArray(response.data)) {
                // Extract values from relations
                const values = response.data
                  .map(rel => {
                    if (rel.targetData) {
                      return rel.targetData;
                    }
                    // If no targetData, fetch the entity
                    return { id: rel.targetId };
                  })
                  .filter(Boolean);

                // Fetch full entity data if we only have IDs
                const enrichedValues = await Promise.all(
                  values.map(async (item) => {
                    if (item.id && Object.keys(item).length === 1 && repeatingSection.repeatingConfig?.targetSchema) {
                      try {
                        const entityResponse = await apiRequest<any>(
                          `/api/data/${repeatingSection.repeatingConfig.targetSchema}/${item.id}`
                        );
                        if (entityResponse.success && entityResponse.data) {
                          return entityResponse.data;
                        }
                      } catch (err) {
                        console.warn(`Failed to fetch entity ${item.id}:`, err);
                      }
                    }
                    return item;
                  })
                );

                refData[fieldName] = enrichedValues;
              }
            } catch (err) {
              console.warn(`Failed to fetch repeating section data for ${fieldName}:`, err);
            }
          }
        }
      }

      setReferenceData(refData);
      setHasFetchedOnce(true);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    } catch (error) {
      setIsRefreshing(false);
      isFetchingRef.current = false;
      throw error;
    }
  }, [formSchema, dependencies, pickerFieldDependencies, hasFetchedOnce]);
  
  // Store fetchReferenceData in a ref to avoid dependency issues
  const fetchReferenceDataRef = React.useRef(fetchReferenceData);
  React.useEffect(() => {
    fetchReferenceDataRef.current = fetchReferenceData;
  }, [fetchReferenceData]);

  // Map reference dependencies to repeating section IDs
  const referencedSectionIds = useMemo(() => {
    if (!formSchema || dependencies.length === 0) return [];
    
    const sectionIds: string[] = [];
    
    for (const fieldName of dependencies) {
      // Convert fieldName (camelCase or kebab-case) to match schema
      const fieldNameKebab = fieldName.replace(/([A-Z])/g, '-$1').toLowerCase();
      const fieldNameNoHyphens = fieldName.replace(/-/g, '');
      const schemaNameNoHyphens = (schemaName: string) => schemaName.replace(/-/g, '');
      
      // Find matching repeating section
      const section = formSchema.sections?.find(s => 
        s.isRepeatingSection && 
        s.repeatingConfig?.targetSchema &&
        (s.repeatingConfig.targetSchema === fieldName || 
         s.repeatingConfig.targetSchema === fieldNameKebab ||
         schemaNameNoHyphens(s.repeatingConfig.targetSchema) === fieldNameNoHyphens)
      );
      
      if (section) {
        sectionIds.push(section.id);
      }
    }
    
    return sectionIds;
  }, [formSchema, dependencies]);

  // Watch for changes in referenced repeating sections and refresh calculation
  // Track section data for change detection
  const sectionDataRef = React.useRef<Record<string, { 
    length: number; 
    itemIds: string[]; 
    items?: Array<Record<string, any>>;
  }>>({});
  
  // Track if we're currently processing a refresh to prevent infinite loops
  const isProcessingRefreshRef = React.useRef(false);

  // Refresh when referenced sections change (items added/removed/updated)
  // Use a ref to track the last formData to avoid re-running on every formData change
  const lastFormDataRef = React.useRef<any>(null);
  
  useEffect(() => {
    if (referencedSectionIds.length === 0 || !hasFetchedOnce || isProcessingRefreshRef.current) {
      // Still update tracked data even if we're not refreshing
      if (formDataRef.current && referencedSectionIds.length > 0) {
        for (const sectionId of referencedSectionIds) {
          const sectionData = formDataRef.current?.[sectionId];
          if (sectionData !== undefined) {
            sectionDataRef.current[sectionId] = {
              length: Array.isArray(sectionData) ? sectionData.length : 0,
              itemIds: Array.isArray(sectionData) 
                ? sectionData.map((item: any) => item?.id || JSON.stringify(item)).filter(Boolean)
                : [],
              items: Array.isArray(sectionData) 
                ? sectionData.map((item: any) => {
                    const filtered: Record<string, any> = {};
                    if (item && typeof item === 'object') {
                      Object.keys(item).forEach(key => {
                        if (typeof item[key] === 'number' || typeof item[key] === 'string') {
                          filtered[key] = item[key];
                        }
                      });
                    }
                    return filtered;
                  })
                : []
            };
          }
        }
      }
      lastFormDataRef.current = formData;
      return;
    }

    // Clear any pending timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }

    let shouldRefresh = false;

    for (const sectionId of referencedSectionIds) {
      const sectionData = formDataRef.current?.[sectionId];
      const currentLength = Array.isArray(sectionData) ? sectionData.length : 0;
      const currentItemIds = Array.isArray(sectionData) 
        ? sectionData.map((item: any) => item?.id || JSON.stringify(item)).filter(Boolean)
        : [];

      const prevData = sectionDataRef.current[sectionId];
      
      // Check if length changed (item added/removed)
      if (!prevData || prevData.length !== currentLength) {
        shouldRefresh = true;
        break;
      }

      // Check if any item IDs changed (item updated or replaced)
      if (prevData.itemIds.length !== currentItemIds.length ||
          prevData.itemIds.some((id, idx) => id !== currentItemIds[idx])) {
        shouldRefresh = true;
        break;
      }

      // Check if any item's key fields changed (for items that might affect calculation)
      if (Array.isArray(sectionData)) {
        for (let i = 0; i < sectionData.length; i++) {
          const item = sectionData[i];
          const prevItem = prevData?.items?.[i];
          
          if (prevItem) {
            // Compare numeric and string fields that might be used in formulas
            const itemKeys = Object.keys(item || {}).filter(key => 
              typeof item[key] === 'number' || typeof item[key] === 'string'
            );
            
            const hasChanged = itemKeys.some(key => item[key] !== prevItem[key]);
            if (hasChanged) {
              shouldRefresh = true;
              break;
            }
          }
        }
      }

      if (shouldRefresh) break;
    }

    if (shouldRefresh) {
      // Mark that we're processing a refresh to prevent re-triggering
      isProcessingRefreshRef.current = true;
      
      // Debounce the refresh to prevent rapid successive calls
      fetchTimeoutRef.current = setTimeout(() => {
        // Only proceed if we're still supposed to refresh and not already fetching
        if (!isFetchingRef.current) {
          // Refresh the reference data when sections change
          setHasFetchedOnce(false);
          fetchReferenceDataRef.current(true).finally(() => {
            // Reset the processing flag after fetch completes
            isProcessingRefreshRef.current = false;
            fetchTimeoutRef.current = null;
          });
        } else {
          isProcessingRefreshRef.current = false;
          fetchTimeoutRef.current = null;
        }
      }, 500); // 500ms debounce to prevent rapid calls
    } else {
      // Update tracked data (only if we're not processing a refresh)
      for (const sectionId of referencedSectionIds) {
        const sectionData = formDataRef.current?.[sectionId];
        sectionDataRef.current[sectionId] = {
          length: Array.isArray(sectionData) ? sectionData.length : 0,
          itemIds: Array.isArray(sectionData) 
            ? sectionData.map((item: any) => item?.id || JSON.stringify(item)).filter(Boolean)
            : [],
          items: Array.isArray(sectionData) 
            ? sectionData.map((item: any) => {
                const filtered: Record<string, any> = {};
                if (item && typeof item === 'object') {
                  Object.keys(item).forEach(key => {
                    if (typeof item[key] === 'number' || typeof item[key] === 'string') {
                      filtered[key] = item[key];
                    }
                  });
                }
                return filtered;
              })
            : []
        };
      }
    }

    lastFormDataRef.current = formData;

    // Cleanup timeout on unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
    };
  }, [referencedSectionIds, hasFetchedOnce]); // Removed formData from dependencies

  // Fetch once on mount or when entity ID changes (not on every formData change)
  useEffect(() => {
    const entityId = formData?.id;
    const schemaId = formSchema?.id;
    
    // Reset hasFetchedOnce when entity ID changes (new entity loaded)
    if (entityId && lastEntityIdRef.current !== entityId) {
      setHasFetchedOnce(false);
      lastEntityIdRef.current = entityId;
    }
    
    // Fetch if we have an entity ID, schema, dependencies, and haven't fetched yet
    // Also check if we're not already fetching
    if (entityId && schemaId && !hasFetchedOnce && !isFetchingRef.current && (dependencies.length > 0 || pickerFieldDependencies.length > 0)) {
      fetchReferenceDataRef.current(false);
    }
  }, [formData?.id, formSchema?.id, hasFetchedOnce, dependencies.length, pickerFieldDependencies.length]);

  // Listen for form reset events (e.g., when form is reset in a dialog)
  useEffect(() => {
    const handleFormReset = (event: CustomEvent) => {
      // Only refresh if this formula field belongs to the reset form
      const resetSchemaId = event.detail?.schemaId;
      if (!resetSchemaId || resetSchemaId !== formSchema?.id) {
        return;
      }
      
      // Defer state updates to avoid updating during render
      // Use setTimeout to schedule updates after the current render cycle
      setTimeout(() => {
        // Reset fetch state and refresh formulas
        setHasFetchedOnce(false);
        isFetchingRef.current = false; // Reset fetch flag
        if (formData?.id && (dependencies.length > 0 || pickerFieldDependencies.length > 0)) {
          fetchReferenceDataRef.current(true);
        }
      }, 0);
    };

    window.addEventListener('form-reset', handleFormReset as EventListener);
    return () => {
      window.removeEventListener('form-reset', handleFormReset as EventListener);
    };
  }, [formSchema?.id, formData?.id, dependencies.length, pickerFieldDependencies.length]);

  // Merge enriched form data with original form data
  // IMPORTANT: Exclude the formula field's own value from formData to prevent it from interfering with calculation
  // Formula fields should always be calculated, not use stored values
  const effectiveFormData = useMemo(() => {
    const cleanedFormData = { ...(formData || {}) };
    // Remove the formula field's value from formData to ensure calculation uses dependencies, not stored value
    if (config.name && cleanedFormData[config.name] !== undefined) {
      delete cleanedFormData[config.name];
    }
    return { ...cleanedFormData, ...enrichedFormData };
  }, [formData, enrichedFormData, config.name]);

  // Evaluate formula
  const evaluation = useFormulaEvaluation({
    formula: localFormula,
    fieldName: config.name,
    formData: effectiveFormData,
    referenceData,
    enabled: !!localFormula
  });

  // Update value when evaluation changes
  // Only update if the evaluated value is actually a calculated result (not a string that looks like a formula)
  useEffect(() => {
    if (evaluation.value !== null && 
        evaluation.value !== undefined &&
        evaluation.value !== value &&
        // Ensure we're not updating with a formula string (which shouldn't happen, but be safe)
        (typeof evaluation.value !== 'string' || !evaluation.value.includes('{{')) &&
        onChange) {
      onChange(evaluation.value);
    }
  }, [evaluation.value, value, onChange]);

  // Resolve unit expression (can be string, array, or object)
  const resolvedUnit = useMemo(() => {
    const unitExpression = config.formulaConfig?.unit;
    if (!unitExpression) return null;

    const context: FormulaContext = {
      formData: effectiveFormData,
      formSchema,
      pageData: undefined, // We'll get this from the hook if needed
      userData: useDynamicFormContextStore.getState().userData || undefined,
      referenceData: undefined
    };

    return resolveUnit(unitExpression, context);
  }, [config.formulaConfig?.unit, effectiveFormData, formSchema]);

  // Extract unit display info (for arrays/objects)
  // Use JSON.stringify for deep comparison to prevent infinite loops
  const resolvedUnitKey = useMemo(() => {
    if (!resolvedUnit) return null;
    try {
      return JSON.stringify(resolvedUnit);
    } catch {
      return String(resolvedUnit);
    }
  }, [resolvedUnit]);
  
  const unitDisplayInfo = useMemo(() => {
    if (!resolvedUnit) return null;
    
    // If it's an array, use first item
    if (Array.isArray(resolvedUnit) && resolvedUnit.length > 0) {
      const firstItem = resolvedUnit[0];
      if (typeof firstItem === 'object' && firstItem !== null) {
        return {
          icon: firstItem.icon || null,
          label: firstItem.label || firstItem.id || '',
          color: firstItem.color || null
        };
      }
      // If array item is not an object, treat as text
      if (typeof firstItem === 'string') {
        return {
          text: firstItem
        };
      }
    }
    
    // If it's an object directly
    if (typeof resolvedUnit === 'object' && resolvedUnit !== null && !Array.isArray(resolvedUnit)) {
      return {
        icon: resolvedUnit.icon || null,
        label: resolvedUnit.label || resolvedUnit.id || '',
        color: resolvedUnit.color || null
      };
    }
    
    // If it's a string, return as text
    if (typeof resolvedUnit === 'string') {
      return {
        text: resolvedUnit
      };
    }
    
    return null;
  }, [resolvedUnitKey]);
  
  // Memoize style objects to prevent re-renders
  // Use default text color (gray-700 dark:gray-300) when no color is specified
  const iconStyle = useMemo(() => {
    return unitDisplayInfo?.color ? { color: unitDisplayInfo.color } : undefined;
  }, [unitDisplayInfo?.color]);
  
  const labelStyle = useMemo(() => {
    return unitDisplayInfo?.color ? { color: unitDisplayInfo.color } : undefined;
  }, [unitDisplayInfo?.color]);

  // Format display value (without unit - unit is shown separately)
  // IMPORTANT: Never display the formula string itself - only show calculated results
  const displayValue = useMemo(() => {
    if (evaluation.value === null || evaluation.value === undefined) {
      return '';
    }

    // Safety check: if evaluation.value is a string that looks like a formula, don't display it
    // This should never happen, but protect against it just in case
    if (typeof evaluation.value === 'string' && evaluation.value.includes('{{') && evaluation.value.includes('}}')) {
      console.warn(`FormulaField ${config.name}: evaluation returned formula string instead of calculated value. Formula: ${localFormula}`);
      return '';
    }

    const precision = config.formulaConfig?.precision ?? 2;
    const format = config.formulaConfig?.format || 'number';

    let formattedValue: string;

    if (typeof evaluation.value === 'number') {
      switch (format) {
        case 'currency':
          // For currency, format without currency symbol (we'll show unit separately)
          formattedValue = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision
          }).format(evaluation.value);
          break;
        case 'percentage':
          formattedValue = `${evaluation.value.toFixed(precision)}%`;
          break;
        case 'number':
        default:
          formattedValue = evaluation.value.toFixed(precision);
      }
    } else {
      formattedValue = String(evaluation.value);
    }

    return formattedValue;
  }, [evaluation.value, config.formulaConfig, config.name, localFormula]);

  // Extract variable values for visualization
  const variableValues = useMemo(() => {
    if (!localFormula) return [];
    const userData = useDynamicFormContextStore.getState().userData;
    const context = {
      formData: effectiveFormData,
      formSchema,
      pageData: undefined, // We'll get this from the hook if needed
      userData: userData ? (userData as Record<string, any>) : undefined,
      referenceData
    };
    return extractVariableValues(localFormula, context, referenceData, formSchema);
  }, [localFormula, effectiveFormData, formSchema, referenceData]);

  // Create substituted formula with field names and values in math notation format
  const substitutedFormulaWithFieldNames = useMemo(() => {
    if (!localFormula) return '';
    return substituteVariablesWithFieldNames(localFormula, variableValues, formSchema);
  }, [localFormula, variableValues, formSchema]);

  // Create KaTeX formula with field names
  const katexFormula = useMemo(() => {
    if (!substitutedFormulaWithFieldNames) return '';
    try {
      return formulaWithFieldNamesToKaTeX(substitutedFormulaWithFieldNames);
    } catch {
      return substitutedFormulaWithFieldNames;
    }
  }, [substitutedFormulaWithFieldNames]);

  // Create calculation breakdown with field names
  const breakdown = useMemo(() => {
    if (!localFormula) return '';
    return createCalculationBreakdownWithFieldNames(localFormula, variableValues, evaluation.value, formSchema);
  }, [localFormula, variableValues, evaluation.value, formSchema]);

  // Render KaTeX
  const katexHtml = useMemo(() => {
    if (!katexFormula) return null;
    try {
      return katex.renderToString(katexFormula, {
        throwOnError: false,
        displayMode: false
      });
    } catch {
      return null;
    }
  }, [katexFormula]);

  // Handle formula editing (for configuration)
  const showEditor = config.formulaConfig?.showEditor ?? false;

  if (showEditor && isEditing) {
    return (
      <div className={cn('w-full', className)}>
        <FormulaInput
          value={localFormula}
          onChange={(newFormula) => {
            setLocalFormula(newFormula);
            // Update config if possible (this would need to be handled by parent)
            if (onChange) {
              // Store formula in a special way or trigger config update
            }
          }}
          onBlur={() => {
            setIsEditing(false);
            onBlur?.();
          }}
          onFocus={onFocus}
          error={evaluation.error || error}
          disabled={disabled}
          required={required}
          fieldName={config.name}
          formData={formData || {}}
          referenceData={referenceData}
          showPreview={true}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(false)}
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  // Display mode (read-only)
  const fieldName = config.name;
  const fieldLabel = config.label;

  const renderFieldLabel = () =>
    fieldLabel ? (
      <label htmlFor={fieldName} dir="auto" className={getLabelClasses({ error: Boolean(error || evaluation.error), required, disabled: isDisabled })}>
        {fieldLabel}
      </label>
    ) : null;

  return (
    <div className={cn('w-full', className)}>
      {renderFieldLabel()}
      <div className="relative">
        <Input
          id={fieldName}
          value={displayValue}
          readOnly
          disabled={isDisabled}
          className={cn(
            resolvedUnit ? 'pr-20' : 'pr-10',
            error && 'border-red-500 dark:border-red-500',
            evaluation.error && 'border-orange-500 dark:border-orange-500',
            'whitespace-nowrap' // Prevent wrapping for numbers and decimals
          )}
          placeholder={evaluation.error ? 'Formula error' : 'Calculated value'}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Display unit inside input box, beside refresh button */}
          {unitDisplayInfo && (
            <span className="mr-1 flex items-center text-gray-700 dark:text-gray-300">
              {unitDisplayInfo.text ? (
                // Fixed unit text (e.g., "ml", "kg")
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {unitDisplayInfo.text}
                </span>
              ) : unitDisplayInfo.icon ? (
                // Icon with tooltip (from picker field)
                // Always try to render with IconRenderer - it will fallback to Text icon if invalid
                <UnitTooltip 
                  icon={unitDisplayInfo.icon}
                  label={unitDisplayInfo.label || 'Unit'}
                  color={unitDisplayInfo.color || null}
                />
              ) : unitDisplayInfo.label ? (
                // Fallback to label if no icon
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {unitDisplayInfo.label}
                </span>
              ) : null}
            </span>
          )}
          {showEditor && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsEditing(true)}
              disabled={disabled}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => {
              if (!isFetchingRef.current) {
                setHasFetchedOnce(false);
                isFetchingRef.current = false; // Reset flag before manual refresh
                fetchReferenceDataRef.current(true);
              }
            }}
            disabled={disabled || isRefreshing}
            title="Refresh formula calculation"
          >
            <RefreshCw className={cn("h-4 w-4 text-gray-400 dark:text-gray-500", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Error display */}
      {evaluation.error && (
        <div className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
          <Calculator className="h-3 w-3" />
          <span>{evaluation.error}</span>
        </div>
      )}

      {/* Formula preview (dialog) - Always show when formula exists, regardless of showEditor setting */}
      {localFormula && localFormula.trim() !== '' && (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <Calculator className="h-3 w-3 mr-1" />
              View formula
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[500px] max-w-[90vw] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Formula Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Original Formula */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">Formula:</div>
                  <CopyContent content={localFormula} />
                </div>
                <code className="text-xs bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded-xl block wrap-break-word font-sans border border-gray-200 dark:border-gray-700 overflow-x-auto">
                  {localFormula}
                </code>
              </div>

              {/* KaTeX Rendered Formula with Field Names and Values */}
              {katexHtml && (
                <div>
                  <div className="text-xs font-semibold mb-2 text-gray-900 dark:text-gray-100">Mathematical Notation:</div>
                  <div 
                    className="text-base bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto [&_.katex]:text-base [&_.katex-display]:text-base"
                    dangerouslySetInnerHTML={{ __html: katexHtml }}
                  />
                </div>
              )}

              {/* Result */}
              {evaluation.value !== null && !evaluation.error && (
                <div>
                  <div className="text-xs font-semibold mb-2 text-gray-900 dark:text-gray-100">Result:</div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-200 dark:border-green-800">
                    {typeof evaluation.value === 'number' 
                      ? evaluation.value.toFixed(2) 
                      : String(evaluation.value)}
                  </div>
                </div>
              )}

              {/* Dependencies */}
              {evaluation.dependencies.length > 0 && (
                <div>
                  <div className="text-xs font-semibold mb-2 text-gray-900 dark:text-gray-100">Dependencies:</div>
                  <div className="flex flex-wrap gap-1">
                    {evaluation.dependencies.map((dep) => (
                      <span key={dep} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {evaluation.error && (
                <div>
                  <div className="text-xs font-semibold mb-2 text-red-600 dark:text-red-400">Error:</div>
                  <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-800">
                    {evaluation.error}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {error && (
        <div className={errorTextClasses}>{error}</div>
      )}
    </div>
  );
};

FormulaField.displayName = 'FormulaField';

