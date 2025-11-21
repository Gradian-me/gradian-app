'use client';

// CheckboxList Component - Multiple checkbox selection

import React, { forwardRef, useImperativeHandle } from 'react';
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
      ...props
    },
    ref
  ) => {
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
              required && 'after:content-["*"] after:ml-1 after:text-red-500'
            )}
          >
            {fieldLabel}
          </label>
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
