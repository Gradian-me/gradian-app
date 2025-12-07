'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [lastValidSelection, setLastValidSelection] = useState<NormalizedOption[] | null>(null);
  const queryClient = useQueryClient();

  // Get targetSchema or sourceUrl from config
  // Memoize these to prevent unnecessary re-renders when config object reference changes
  const targetSchemaId = useMemo(() => (config as any).targetSchema, [(config as any).targetSchema]);
  const sourceUrl = useMemo(() => (config as any).sourceUrl, [(config as any).sourceUrl]);
  const fieldOptions = (config as any).options; // Static options from field config
  const allowMultiselect = Boolean(
    (config as any)?.metadata?.allowMultiselect ??
    (config as any)?.allowMultiselect
  );
  const columnMap = (config as any).columnMap;
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

  const normalizedSelection = useMemo(
    () => normalizeOptionArray(normalizedValue),
    [normalizedValue]
  );
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
    if (targetSchemaId && !targetSchema && !sourceUrl && !staticItems) {
      setIsLoadingSchema(true);
      const fetchSchema = async () => {
        try {
          const response = await apiRequest<FormSchema>(`/api/schemas/${targetSchemaId}`);
          if (response.success && response.data) {
            await cacheSchemaClientSide(response.data, { queryClient, persist: false });
            setTargetSchema(response.data);
          }
        } catch (err) {
          console.error('Error fetching target schema:', err);
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
            // For sourceUrl, use the normalized option which has label/icon/color
            if (typeof primaryValue === 'object' && primaryValue.id) {
              // If it's a normalized option (has id, label, icon, color), use it directly
              setSelectedItem({
                id: primaryValue.id,
                label: primaryValue.label,
                name: primaryValue.label || primaryValue.name || primaryValue.title,
                title: primaryValue.label || primaryValue.title,
                icon: primaryValue.icon,
                color: primaryValue.color,
              });
            } else if (typeof primaryValue === 'object') {
              // Fallback for other object formats
              setSelectedItem(primaryValue);
            } else {
              const resolvedId = extractFirstId(primaryValue);
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
          setSelectedItem(response.data);
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
        console.error('Error fetching selected item:', err);
      }
    };

    if (normalizedValue.length === 0) {
      setSelectedItem(null);
      return;
    }

    const primaryValue = normalizedSelection[0] ?? normalizedValue[0];
    fetchSelectedItem(primaryValue);
    // Note: sourceUrl is intentionally NOT in dependencies - we only want to re-fetch when value changes,
    // not when sourceUrl changes. sourceUrl is just configuration, not a trigger for re-fetching.
  }, [normalizedValue, normalizedSelection, targetSchemaId, targetSchema]);

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
          console.warn('[PickerInput] Ignoring empty selection for single-select, preserving last valid selection');
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

    // Store valid selection before calling onChange to prevent race conditions
    setLastValidSelection(selectedOptions);
    // Call onChange with the valid selection
    onChange?.(selectedOptions);

    // For sourceUrl, use the normalized option which has label/icon/color from columnMap
    // For targetSchema, prefer rawItems which has full schema data
    if (sourceUrl) {
      const primaryOption = selectedOptions[0];
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
        const primaryOption = selectedOptions[0];
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
              
              return (
                <Badge
                  key={optionId}
                  variant="outline"
                  className="flex items-center gap-1.5 px-2 py-1 text-xs bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800"
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
                  
                  // Check if color is a valid badge variant
                  const isValidBadgeVariant = (color?: string): boolean => {
                    if (!color) return false;
                    const validVariants = ['default', 'secondary', 'destructive', 'success', 'warning', 'info', 'outline', 'gradient', 'muted'];
                    return validVariants.includes(color);
                  };
                  
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
                  
                  if (optionColor && isValidBadgeVariant(optionColor)) {
                    badgeContent = (
                      <Badge variant={optionColor as any} className="flex items-center gap-1.5 px-2 py-1">
                        {iconEl}
                        <span className="max-w-[200px] truncate">{optionLabel}</span>
                      </Badge>
                    );
                  } else if (optionColor && isHexColor(optionColor)) {
                    badgeContent = (
                      <div 
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium"
                        style={{ backgroundColor: optionColor, color: '#fff', border: 'none' }}
                      >
                        {iconEl}
                        <span className="max-w-[200px] truncate">{optionLabel}</span>
                      </div>
                    );
                  } else if (optionColor && isTailwindClasses(optionColor)) {
                    const hasTextColor = optionColor.includes('text-');
                    const defaultTextColor = hasTextColor ? '' : 'text-white';
                    badgeContent = (
                      <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium border ${defaultTextColor} ${optionColor}`}>
                        {iconEl}
                        <span className="max-w-[200px] truncate">{optionLabel}</span>
                      </div>
                    );
                  } else {
                    // Default badge with icon if no color
                    badgeContent = (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1.5 px-2 py-1 text-xs bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800"
                      >
                        {iconEl}
                        <span className="max-w-[200px] truncate">{optionLabel}</span>
                      </Badge>
                    );
                  }
                  
                  return (
                    <div key={optionId} className="flex items-center gap-2 flex-1">
                      {badgeContent}
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
                onClick={() => !disabled && setIsPickerOpen(true)}
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
                onClick={() => !disabled && setIsPickerOpen(true)}
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
                onClick={() => !disabled && setIsPickerOpen(true)}
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
      
      {(targetSchemaId || sourceUrl || staticItems) && (
        <PopupPicker
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          schemaId={targetSchemaId}
          sourceUrl={sourceUrl}
          schema={targetSchema || undefined}
          onSelect={handleSelect}
          title={sourceUrl ? (config as any).label || 'Select item' : staticItems ? (config as any).label || 'Select option' : `Select ${targetSchema?.plural_name || targetSchema?.singular_name || targetSchemaId}`}
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
  );
};

PickerInput.displayName = 'PickerInput';
