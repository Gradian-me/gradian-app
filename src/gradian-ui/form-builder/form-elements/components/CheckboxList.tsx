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

    // Fetch options from URL if sourceUrl is provided
    const {
      options: urlOptions,
      isLoading: isLoadingOptions,
      error: optionsError,
    } = useOptionsFromUrl({
      sourceUrl,
      enabled: Boolean(sourceUrl),
      transform,
      queryParams,
    });

    // Ensure value is an array
    const currentValue = extractIds(value);
    const selectAllCheckboxRef = useRef<HTMLButtonElement>(null);

    // Get options from config if not provided directly, or use URL options
    const checkboxOptions: CheckboxListProps['options'] = sourceUrl
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

    // Get selectable options (not disabled)
    const selectableOptions = normalizedOptions.filter(opt => !opt.disabled);
    const selectableOptionIds = selectableOptions.map(opt => opt.id);
    
    // Calculate select all state
    const selectedSelectableCount = selectableOptionIds.filter(id => currentValue.includes(id)).length;
    const isAllSelected = selectableOptions.length > 0 && selectedSelectableCount === selectableOptions.length;
    const isIndeterminate = selectedSelectableCount > 0 && selectedSelectableCount < selectableOptions.length;

    // Handle select all/deselect all
    const handleSelectAll = (checked: boolean) => {
      if (checked) {
        // Select all selectable options
        const newValue = Array.from(new Set([...currentValue, ...selectableOptionIds]));
        onChange?.(newValue);
      } else {
        // Deselect all selectable options
        const newValue = currentValue.filter((v: string) => !selectableOptionIds.includes(v));
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
      const newValue = checked
        ? Array.from(new Set([...currentValue, option.id]))
        : currentValue.filter((v: string) => v !== option.id);
      onChange?.(newValue);
    };

    const fieldName = config.name || 'checkbox-list';
    const fieldLabel = config.label;

    return (
      <div className={cn('w-full space-y-2', className)}>
        {fieldLabel && (
          <label
            className={cn(
              'block text-xs font-medium',
              error ? 'text-red-700' : 'text-gray-700',
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
            const isChecked = currentValue.includes(option.id);
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
