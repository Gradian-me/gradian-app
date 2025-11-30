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
  const queryClient = useQueryClient();

  // Get targetSchema or sourceUrl from config
  const targetSchemaId = (config as any).targetSchema;
  const sourceUrl = (config as any).sourceUrl;
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
  const normalizedSelection = useMemo(
    () => normalizeOptionArray(value),
    [value]
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
            // For sourceUrl, just use the value as-is
            if (typeof primaryValue === 'object') {
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

    if (value === null || value === undefined || value === '') {
      setSelectedItem(null);
      return;
    }

    const primaryValue = normalizedSelection[0] ?? value;
    fetchSelectedItem(primaryValue);
  }, [value, normalizedSelection, targetSchemaId, targetSchema, sourceUrl]);

  const handleSelect = (selectedOptions: NormalizedOption[], rawItems: any[]) => {
    if (!selectedOptions || selectedOptions.length === 0) {
      return;
    }

    onChange?.(selectedOptions);

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

    setIsPickerOpen(false);
  };

  const handleClear = () => {
    onChange?.([]);
    setSelectedItem(null);
  };

  const handleRemoveItem = (itemId: string) => {
    if (disabled) return;
    const updatedSelection = normalizedSelection.filter((opt) => String(opt.id) !== String(itemId));
    onChange?.(updatedSelection);
    
    // Update selectedItem if we removed the primary item
    if (updatedSelection.length === 0) {
      setSelectedItem(null);
    } else if (updatedSelection.length > 0 && String(normalizedSelection[0]?.id) === String(itemId)) {
      // If we removed the first item, update selectedItem to the new first item
      const newPrimary = updatedSelection[0];
      if (newPrimary && targetSchema) {
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
        return fallbackOption.label ?? fallbackOption.id ?? '';
      }
      if (selectedItem) {
        return selectedItem.name || selectedItem.title || selectedItem.id || '';
      }
      return '';
    }

    if (!selectedItem || !targetSchema) {
      const fallbackOption = normalizedSelection[0];
      if (fallbackOption) {
        return fallbackOption.label ?? fallbackOption.id ?? '';
      }
      return '';
    }

    // Try to get title field from schema
    const title = getValueByRole(targetSchema, selectedItem, 'title') || selectedItem.name || selectedItem.title || '';
    const subtitle = getSingleValueByRole(targetSchema, selectedItem, 'subtitle') || selectedItem.email || '';
    
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
        <div className="flex flex-wrap items-center gap-2 p-2 min-h-[2.5rem] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
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
                      className="ml-0.5 rounded-full hover:bg-violet-200 dark:hover:bg-violet-800 focus:outline-none p-0.5 transition-colors"
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
      
      {/* Show input for single select or when no items selected in multiselect */}
      {(!allowMultiselect || normalizedSelection.length === 0) && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id={fieldName}
              name={fieldName}
              type="text"
              value={getDisplayValue()}
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
          {selectedItem && !disabled && !allowMultiselect && (
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
