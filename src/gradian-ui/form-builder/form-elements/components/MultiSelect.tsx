// MultiSelect Component
'use client';

import React, { useMemo } from 'react';
import { MultiSelect as UIMultiSelect, MultiSelectOption, MultiSelectGroup } from '@/components/ui/multi-select';
import { FormElementProps } from '../types';
import { cn } from '../../../shared/utils';
import { normalizeOptionArray, NormalizedOption } from '../utils/option-normalizer';
import { useOptionsFromSchemaOrUrl } from '../hooks/useOptionsFromSchemaOrUrl';
import { getLabelClasses, errorTextClasses } from '../utils/field-styles';
import { sortNormalizedOptions, SortType } from '@/gradian-ui/shared/utils/sort-utils';
import { getIconComponent } from '@/gradian-ui/shared/utils/icon-renderer';
import { ColumnMapConfig } from '@/gradian-ui/shared/utils/column-mapper';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { useLanguageStore } from '@/stores/language.store';
import { getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';

export interface MultiSelectFormOption {
  id?: string;
  value?: string;
  label: string;
  disabled?: boolean;
  icon?: string;
  color?: string; // Can be a badge variant (success, warning, etc.), custom hex color, or Tailwind classes
}

export interface MultiSelectWithBadgesProps extends Omit<FormElementProps, 'config'> {
  config?: any;
  options?: Array<MultiSelectFormOption | string | number | null | undefined>;
  placeholder?: string;
  error?: string;
  required?: boolean;
  onNormalizedChange?: (selection: NormalizedOption[]) => void;
  /**
   * Schema ID to fetch options from (e.g., 'users', 'companies')
   * If provided, will fetch from /api/data/{schemaId}
   * Takes precedence over options prop if provided
   */
  schemaId?: string;
  /**
   * URL to fetch options from (overrides options prop if provided)
   * If both schemaId and sourceUrl are provided, sourceUrl takes precedence
   */
  sourceUrl?: string;
  /**
   * Query parameters to append to sourceUrl or schemaId request
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
   * Column mapping configuration for API requests
   */
  columnMap?: ColumnMapConfig;
  /**
   * Maximum number of selections allowed
   */
  maxCount?: number;
  /**
   * Variant for the multi-select component
   */
  variant?: 'default' | 'secondary' | 'destructive' | 'inverted';
}

export const MultiSelect: React.FC<MultiSelectWithBadgesProps> = ({
  className,
  options,
  value,
  onChange,
  placeholder,
  config,
  error,
  required,
  onNormalizedChange,
  disabled,
  schemaId,
  sourceUrl,
  queryParams,
  transform,
  sortType = null,
  columnMap,
  maxCount,
  variant = 'default',
  ...props
}) => {
  const language = useLanguageStore((s) => s.getLanguage?.()) ?? getDefaultLanguage();

  // Fetch options from schemaId or sourceUrl if provided
  const {
    options: fetchedOptions,
    isLoading: isLoadingOptions,
    error: optionsError,
  } = useOptionsFromSchemaOrUrl({
    schemaId: schemaId || config?.schemaId,
    sourceUrl: sourceUrl || config?.sourceUrl,
    enabled: Boolean(schemaId || sourceUrl || config?.schemaId || config?.sourceUrl),
    transform: transform || config?.transform,
    queryParams: queryParams || config?.queryParams,
    sortType: sortType || config?.sortType,
    columnMap: columnMap || config?.columnMap,
  });

  // Use fetched options if schemaId or sourceUrl is provided, otherwise use provided options
  const resolvedOptions = (schemaId || sourceUrl || config?.schemaId || config?.sourceUrl) 
    ? fetchedOptions 
    : options;

  // Normalize options to MultiSelectOption format
  const normalizedOptions = useMemo((): MultiSelectOption[] | MultiSelectGroup[] => {
    if (!resolvedOptions || resolvedOptions.length === 0) {
      return [];
    }

    // If it's already normalized options from the hook
    if (schemaId || sourceUrl || config?.schemaId || config?.sourceUrl) {
      // Convert NormalizedOption[] to MultiSelectOption[] format
      const sortedOptions = sortType || config?.sortType
        ? sortNormalizedOptions(fetchedOptions as NormalizedOption[], sortType || config?.sortType)
        : fetchedOptions;

      return (sortedOptions as NormalizedOption[]).map((opt) => {
        const iconComponent = opt.icon ? getIconComponent(opt.icon) : undefined;
        const badgeStyle = opt.color ? (opt.color.startsWith('#') ? { badgeColor: opt.color } : undefined) : undefined;
        
        return {
          value: opt.id || '',
          label: opt.label || opt.id || '',
          icon: iconComponent,
          disabled: opt.disabled,
          ...(badgeStyle && { style: badgeStyle }),
          color: opt.color,
        };
      });
    }

    // Normalize provided options
    const normalized = normalizeOptionArray(resolvedOptions as any[]);
    return normalized.map((opt: any) => {
      const iconComponent = opt.icon ? getIconComponent(opt.icon) : undefined;
      const badgeStyle = opt.color ? (opt.color.startsWith('#') ? { badgeColor: opt.color } : undefined) : undefined;
      
      return {
        value: (opt as any).value || opt.id || '',
        label: opt.label ?? opt.id ?? '',
        icon: iconComponent,
        disabled: opt.disabled,
        ...(badgeStyle && { style: badgeStyle }),
        color: opt.color,
      };
    });
  }, [resolvedOptions, fetchedOptions, schemaId, sourceUrl, config, sortType, language]);

  // Handle value conversion - support both array and single value
  // Also handle normalized option format
  const multiSelectValue = useMemo(() => {
    if (!value) return [];
    
    if (Array.isArray(value)) {
      return value.map((v: any) => {
        if (typeof v === 'object' && v?.id) {
          return String(v.id);
        }
        return String(v);
      });
    } else if (typeof value === 'object' && value?.id) {
      return [String(value.id)];
    } else {
      return [String(value)];
    }
  }, [value]);

  // Handle value change
  const handleValueChange = (values: string[]) => {
    if (onChange) {
      // Convert back to normalized format if needed
      const normalizedValues = values.map((val) => {
        // Find option in normalized options
        let foundOption: any = null;
        
        if (Array.isArray(normalizedOptions) && normalizedOptions.length > 0) {
          if ('heading' in normalizedOptions[0]) {
            // Grouped options
            for (const group of normalizedOptions as MultiSelectGroup[]) {
              foundOption = group.options.find((opt) => opt.value === val);
              if (foundOption) break;
            }
          } else {
            // Flat options
            foundOption = (normalizedOptions as MultiSelectOption[]).find((opt) => opt.value === val);
          }
        }

        if (foundOption) {
          return {
            id: val,
            label: foundOption.label,
            icon: typeof foundOption.icon === 'string' ? foundOption.icon : undefined,
            color: foundOption.color,
            disabled: foundOption.disabled,
          };
        }
        return { id: val, label: val };
      });

      onChange(normalizedValues);
    }

    if (onNormalizedChange) {
      const normalizedValues = values.map((val) => {
        let foundOption: any = null;
        
        if (Array.isArray(normalizedOptions) && normalizedOptions.length > 0) {
          if ('heading' in normalizedOptions[0]) {
            for (const group of normalizedOptions as MultiSelectGroup[]) {
              foundOption = group.options.find((opt) => opt.value === val);
              if (foundOption) break;
            }
          } else {
            foundOption = (normalizedOptions as MultiSelectOption[]).find((opt) => opt.value === val);
          }
        }

        if (foundOption) {
          return {
            id: val,
            label: foundOption.label,
            icon: typeof foundOption.icon === 'string' ? foundOption.icon : undefined,
            color: foundOption.color,
            disabled: foundOption.disabled,
          };
        }
        return { id: val, label: val };
      });

      onNormalizedChange(normalizedValues);
    }
  };

  // Get field name and placeholder from config
  const fieldName = config?.name || config?.id || 'multi-select';
  const fieldPlaceholder = placeholder || config?.placeholder || 'Select options...';
  const fieldLabel = config?.label;
  const fieldError = error || config?.error;
  const fieldRequired = required ?? config?.required ?? config?.validation?.required ?? false;
  const fieldMaxCount = maxCount || config?.maxCount || config?.maxSelections;

  // Render field label
  const renderFieldLabel = () => {
    if (!fieldLabel) return null;
    return (
      <label
        htmlFor={fieldName}
        dir="auto"
        className={cn(getLabelClasses(fieldRequired))}
      >
        {fieldLabel}
      </label>
    );
  };

  // Render error message
  const renderErrorMessage = (errorMessage: string) => {
    if (!errorMessage) return null;
    return (
      <p className={cn(errorTextClasses, 'mt-1')}>
        {errorMessage}
      </p>
    );
  };

  // Debug: Log component rendering
  if (process.env.NODE_ENV === 'development') {
    loggingCustom(LogType.CLIENT_LOG, 'log', `[MultiSelect] Rendering with: ${JSON.stringify({
      normalizedOptionsCount: Array.isArray(normalizedOptions) ? normalizedOptions.length : 0,
      multiSelectValue,
      hasConfig: !!config,
      optionsFromConfig: config?.options?.length || 0,
    })}`);
  }

  return (
    <div className={cn('w-full', className)}>
      {renderFieldLabel()}
      <UIMultiSelect
        options={normalizedOptions}
        value={multiSelectValue}
        onValueChange={handleValueChange}
        placeholder={fieldPlaceholder}
        disabled={disabled}
        maxCount={fieldMaxCount}
        variant={variant}
        className={cn(error && 'border-destructive')}
        schemaId={schemaId || config?.schemaId}
        sourceUrl={sourceUrl || config?.sourceUrl}
        queryParams={queryParams || config?.queryParams}
        transform={transform || config?.transform}
        sortType={sortType || config?.sortType}
        columnMap={columnMap || config?.columnMap}
        searchable={true}
        {...props}
      />
      {renderErrorMessage(fieldError || '')}
      {optionsError && (
        <p className={cn(errorTextClasses, 'mt-1')}>
          {optionsError}
        </p>
      )}
    </div>
  );
};

MultiSelect.displayName = 'MultiSelect';

