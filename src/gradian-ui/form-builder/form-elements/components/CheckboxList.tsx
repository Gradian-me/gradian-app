'use client';

// CheckboxList Component - Multiple checkbox selection

import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { FormElementProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { extractIds, normalizeOptionArray, NormalizedOption } from '../utils/option-normalizer';
import { useOptionsFromUrl } from '../hooks/useOptionsFromUrl';
import { sortNormalizedOptions, SortType } from '@/gradian-ui/shared/utils/sort-utils';
import { buildReferenceFilterUrl } from '../../utils/reference-filter-builder';
import { useDynamicFormContextStore } from '@/stores/dynamic-form-context.store';
import { ColumnMapConfig } from '@/gradian-ui/shared/utils/column-mapper';

export interface CheckboxListProps extends FormElementProps {
  options?: Array<{ id?: string; label: string; value?: string; disabled?: boolean; icon?: string; color?: string }>;
  /**
   * URL to fetch options from (overrides options prop if provided)
   */
  sourceUrl?: string;
  /**
   * Query parameters to append to sourceUrl
   */
  queryParams?: Record<string, string | number | boolean | string[]>;
  /**
   * Transform function to convert API response to option format
   */
  transform?: (data: any) => Array<{ id?: string; label?: string; name?: string; title?: string; icon?: string; color?: string; disabled?: boolean; value?: string }>;
  /**
   * Sort order for options: 'ASC' (ascending), 'DESC' (descending), or null (no sorting, default)
   */
  sortType?: SortType;
  /**
   * Show a "Select All" checkbox at the top
   */
  showSelectAll?: boolean;
}

export const CheckboxList = forwardRef<FormElementRef, CheckboxListProps>(
  (
    {
      config,
      value = [],
      onChange,
      onBlur,
      onFocus,
      error,
      disabled = false,
      required = false,
      options = [],
      className,
      touched,
      sourceUrl,
      queryParams,
      transform,
      sortType = null,
      showSelectAll,
      ...props
    },
    ref
  ) => {
    // Get showSelectAll from prop or config, default to false
    const shouldShowSelectAll = showSelectAll ?? config.showSelectAll ?? false;

    // Get dynamic context for reference-based filtering
    const dynamicContext = useDynamicFormContextStore();

    // Check for reference-based filtering fields in config
    const referenceSchema = config?.referenceSchema;
    const referenceRelationTypeId = config?.referenceRelationTypeId;
    const referenceEntityId = config?.referenceEntityId;
    const targetSchemaFromConfig = config?.targetSchema;

    // Build sourceUrl from reference fields if they're present and no explicit sourceUrl is provided
    const referenceBasedSourceUrl = React.useMemo(() => {
      if (!referenceSchema || !referenceRelationTypeId || !referenceEntityId || sourceUrl) {
        return null;
      }
      
      // Build the sourceUrl using reference fields
      return buildReferenceFilterUrl({
        referenceSchema,
        referenceRelationTypeId,
        referenceEntityId,
        targetSchema: targetSchemaFromConfig,
        schema: dynamicContext.formSchema,
        values: dynamicContext.formData,
      });
    }, [referenceSchema, referenceRelationTypeId, referenceEntityId, targetSchemaFromConfig, sourceUrl, dynamicContext.formSchema, dynamicContext.formData]);

    // Use explicit sourceUrl if provided, otherwise use reference-based sourceUrl
    const effectiveSourceUrl = sourceUrl || referenceBasedSourceUrl || undefined;

    // Default columnMap for API responses that nest data under data[0].data
    const defaultColumnMap: ColumnMapConfig = React.useMemo(() => ({
      response: { data: 'data.0.data' },
      item: {
        id: 'id',
        label: 'label',
        icon: 'icon',
        color: 'color',
      },
    }), []);

    // Get columnMap from config if provided
    const configColumnMap = (config as any)?.columnMap as ColumnMapConfig | undefined;

    // Use provided columnMap or fallback to default when using reference-based filtering
    const effectiveColumnMap = React.useMemo(() => {
      if (configColumnMap) {
        // Merge with default to ensure data extraction is handled if not explicitly overridden
        return {
          ...defaultColumnMap,
          ...configColumnMap,
          response: {
            ...defaultColumnMap.response,
            ...configColumnMap.response,
          },
          item: {
            ...defaultColumnMap.item,
            ...configColumnMap.item,
          }
        };
      }
      // Use default columnMap when using reference-based filtering (effectiveSourceUrl from reference)
      return referenceBasedSourceUrl ? defaultColumnMap : undefined;
    }, [configColumnMap, referenceBasedSourceUrl, defaultColumnMap]);

    // Fetch options from URL if sourceUrl is provided
    const {
      options: urlOptions,
      isLoading: isLoadingOptions,
      error: optionsError,
    } = useOptionsFromUrl({
      sourceUrl: effectiveSourceUrl,
      enabled: Boolean(effectiveSourceUrl),
      transform,
      queryParams,
      columnMap: effectiveColumnMap,
    });

    // Handle value - support both array of IDs and array of option objects
    // For backward compatibility, extract IDs if value contains objects
    const currentValueIds = extractIds(value);
    
    const selectAllCheckboxRef = useRef<HTMLButtonElement>(null);

    // Get options from config if not provided directly, or use URL options
    const checkboxOptions: CheckboxListProps['options'] = effectiveSourceUrl
      ? urlOptions.map(opt => ({
          id: opt.id,
          label: opt.label ?? opt.id,
          value: opt.value ?? opt.id,
          disabled: opt.disabled,
          icon: opt.icon,
          color: opt.color,
        }))
      : options.length > 0
        ? options
        : ((config.options as CheckboxListProps['options']) ?? []);

    const normalizedOptions: NormalizedOption[] = sortNormalizedOptions(
      normalizeOptionArray(checkboxOptions),
      sortType
    );

    // Resolve current value to option objects (for backward compatibility with IDs)
    // This converts array of IDs to array of option objects with labels, icons, colors
    // Resolve current value to option objects (for backward compatibility with IDs)
    // This converts array of IDs to array of option objects with labels, icons, colors
    const resolvedValueObjects = React.useMemo(() => {
      if (!value || !Array.isArray(value)) return [];
      // Treat value as immutable for memoization; callers should not mutate in-place.
      return value
        .map((v: any) => {
          if (typeof v === 'object' && v !== null && (v.id || v.label)) {
            return v; // Already an option object
          }
          // If it's an ID, find the option object from normalizedOptions
          const id = typeof v === 'string' ? v : String(v);
          const option = normalizedOptions.find((opt) => opt.id === id);
          if (option) {
            return {
              id: option.id,
              label: option.label ?? option.id,
              icon: option.icon,
              color: option.color,
              disabled: option.disabled,
              value: option.value,
            };
          }
          return { id, label: id };
        })
        .filter(Boolean);
      // eslint-disable-next-line react-hooks/preserve-manual-memoization
    }, [value, normalizedOptions]);

    // Get selectable options (not disabled)
    const selectableOptions = normalizedOptions.filter(opt => !opt.disabled);
    const selectableOptionIds = selectableOptions.map(opt => opt.id);
    
    // Helper to convert IDs to option objects for saving
    const convertIdsToOptionObjects = React.useCallback((ids: string[]): NormalizedOption[] => {
      return ids.map((id: string) => {
        const option = normalizedOptions.find((opt) => opt.id === id);
        if (option) {
          return {
            id: option.id,
            label: option.label ?? option.id,
            icon: option.icon,
            color: option.color,
            disabled: option.disabled,
            value: option.value,
          };
        }
        return { id, label: id };
      });
    }, [normalizedOptions]);
    
    // Calculate select all state using IDs
    const selectedSelectableCount = selectableOptionIds.filter(id => currentValueIds.includes(id)).length;
    const isAllSelected = selectableOptions.length > 0 && selectedSelectableCount === selectableOptions.length;
    const isIndeterminate = selectedSelectableCount > 0 && selectedSelectableCount < selectableOptions.length;

    // Handle select all/deselect all - save as option objects
    const handleSelectAll = (checked: boolean) => {
      if (checked) {
        // Select all selectable options - save as option objects
        const newIds = Array.from(new Set([...currentValueIds, ...selectableOptionIds]));
        const newValue = convertIdsToOptionObjects(newIds);
        onChange?.(newValue);
      } else {
        // Deselect all selectable options - save as option objects
        const remainingIds = currentValueIds.filter((v: string) => !selectableOptionIds.includes(v));
        const newValue = convertIdsToOptionObjects(remainingIds);
        onChange?.(newValue);
      }
    };

    // Set indeterminate state on select all checkbox
    useEffect(() => {
      if (selectAllCheckboxRef.current && shouldShowSelectAll) {
        // Try to find the actual input element (could be nested in button)
        const checkbox = selectAllCheckboxRef.current.querySelector('input[type="checkbox"]') as HTMLInputElement;
        if (checkbox) {
          checkbox.indeterminate = isIndeterminate;
        } else {
          // If no input found, try to set on the element itself (in case it's a native checkbox)
          const element = selectAllCheckboxRef.current as any;
          if (element && typeof element.indeterminate !== 'undefined') {
            element.indeterminate = isIndeterminate;
          }
        }
      }
    }, [isIndeterminate, shouldShowSelectAll]);

    useImperativeHandle(ref, () => ({
      focus: () => {
        // Focus first checkbox
        const firstCheckbox = document.querySelector(`input[name="${config.name}"]`) as HTMLInputElement;
        firstCheckbox?.focus();
      },
      blur: () => {
        onBlur?.();
      },
      validate: () => {
        if (!config.validation) return true;
        const result = validateField(value, config.validation);
        return result.isValid;
      },
      reset: () => onChange?.([]),
      getValue: () => value,
      setValue: (newValue) => onChange?.(newValue),
    }));

    const handleCheckedChange = (
      option: NormalizedOption,
      checked: boolean
    ) => {
      if (checked) {
        // Add option - save as option object
        const newOptionObject = {
          id: option.id,
          label: option.label ?? option.id,
          icon: option.icon,
          color: option.color,
          disabled: option.disabled,
          value: option.value,
        };
        // Check if already exists (by ID) to avoid duplicates
        const existingIds = currentValueIds;
        if (!existingIds.includes(option.id)) {
          const newValue = [...resolvedValueObjects, newOptionObject];
          onChange?.(newValue);
        }
      } else {
        // Remove option - keep other option objects
        const newValue = resolvedValueObjects.filter((v: any) => {
          const vId = typeof v === 'string' ? v : (v?.id || v?.value || String(v));
          return vId !== option.id;
        });
        onChange?.(newValue);
      }
    };

    const fieldName = config.name || 'checkbox-list';
    const fieldLabel = config.label;

    return (
      <div className={cn('w-full space-y-2 border border-gray-300 dark:border-gray-700 rounded-lg p-2', className)}>
        {fieldLabel && (
          <label
            className={cn(
              'block text-xs font-medium',
              error ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-400',
              required && 'after:content-["*"] after:ms-1 after:text-red-500'
            )}
          >
            {fieldLabel}
          </label>
        )}
        {shouldShowSelectAll && !isLoadingOptions && !optionsError && normalizedOptions.length > 0 && (
          <div className="flex items-center space-x-2 pb-2 border-b border-gray-200 dark:border-gray-700">
            <Checkbox
              id={`${fieldName}-select-all`}
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
              disabled={disabled || selectableOptions.length === 0}
              className={cn(
                error && "border-red-500 focus-visible:ring-red-500"
              )}
              ref={selectAllCheckboxRef}
            />
            <Label
              htmlFor={`${fieldName}-select-all`}
              className={cn(
                'text-sm font-medium cursor-pointer',
                error ? 'text-red-700' : 'text-gray-700',
                (disabled || selectableOptions.length === 0) && 'opacity-50 cursor-not-allowed'
              )}
            >
              Select All
            </Label>
          </div>
        )}
        {isLoadingOptions ? (
          <div className="text-sm text-gray-500 py-2">Loading options...</div>
        ) : optionsError ? (
          <div className="text-sm text-red-600 py-2">{optionsError}</div>
        ) : (
          <div className={cn(
            "grid gap-2",
            "grid-cols-1 md:grid-cols-2"
          )}>
            {normalizedOptions.map((option) => {
            const isChecked = currentValueIds.includes(option.id);
            const optionId = `${fieldName}-${option.id}`;

            return (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={optionId}
                  name={fieldName}
                  checked={isChecked}
                  onCheckedChange={(checked) => handleCheckedChange(option, checked as boolean)}
                  onBlur={onBlur}
                  onFocus={onFocus}
                  disabled={disabled || option.disabled}
                  className={cn(
                    error && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                <Label
                  htmlFor={optionId}
                  className={cn(
                    'text-sm font-normal cursor-pointer',
                    error ? 'text-red-700' : 'text-gray-700',
                    (disabled || option.disabled) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {option.label}
                </Label>
              </div>
            );
          })}
          </div>
        )}
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {config.description && (
          <p className="text-xs text-gray-500">{config.description}</p>
        )}
      </div>
    );
  }
);

CheckboxList.displayName = 'CheckboxList';
