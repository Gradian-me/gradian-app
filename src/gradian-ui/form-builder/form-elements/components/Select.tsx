// Select Component
'use client';

import React, { useMemo } from 'react';
import {
  Select as RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { SelectProps } from '../types';
import { cn } from '../../../shared/utils';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Badge } from '../../../../components/ui/badge';
import { motion } from 'framer-motion';
import { UI_PARAMS } from '@/gradian-ui/shared/configs/ui-config';
import { extractFirstId, normalizeOptionArray, NormalizedOption } from '../utils/option-normalizer';
import { ChevronDown } from 'lucide-react';
import { useOptionsFromUrl } from '../hooks/useOptionsFromUrl';
import { useOptionsFromSchemaOrUrl } from '../hooks/useOptionsFromSchemaOrUrl';
import { getLabelClasses, errorTextClasses } from '../utils/field-styles';
import { sortNormalizedOptions, SortType } from '@/gradian-ui/shared/utils/sort-utils';

export interface SelectOption {
  id?: string;
  value?: string;
  label: string;
  disabled?: boolean;
  icon?: string;
  color?: string; // Can be a badge variant (success, warning, etc.), custom hex color, or Tailwind classes
}

export interface SelectWithBadgesProps extends Omit<SelectProps, 'children'> {
  config?: any;
  options?: Array<SelectOption | string | number | null | undefined>;
  children?: React.ReactNode;
  placeholder?: string;
  error?: string;
  required?: boolean;
  onNormalizedChange?: (selection: NormalizedOption[]) => void;
  onOpenChange?: (open: boolean) => void;
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
}

export const Select: React.FC<SelectWithBadgesProps> = ({
  variant = 'default',
  size = 'md',
  className,
  children,
  options,
  value,
  onValueChange,
  placeholder,
  config,
  error,
  required,
  onNormalizedChange,
  onOpenChange,
  disabled,
  schemaId,
  sourceUrl,
  queryParams,
  transform,
  sortType = null,
  ...props
}) => {
  // Fetch options from schemaId or sourceUrl if provided
  const {
    options: fetchedOptions,
    isLoading: isLoadingOptions,
    error: optionsError,
  } = useOptionsFromSchemaOrUrl({
    schemaId,
    sourceUrl,
    enabled: Boolean(schemaId || sourceUrl),
    transform,
    queryParams,
    sortType,
  });

  // Use fetched options if schemaId or sourceUrl is provided, otherwise use provided options
  const resolvedOptions = (schemaId || sourceUrl) ? fetchedOptions : options;
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
  };

  // Base classes from SelectTrigger - we'll merge with size and error
  const baseSelectClasses = 'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/50 text-sm text-gray-900 dark:text-gray-100 shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 ring-offset-background dark:ring-offset-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-300 dark:focus:ring-violet-500 focus:ring-offset-1 focus:border-violet-400 dark:focus:border-violet-500 data-[state=open]:outline-none data-[state=open]:ring-1 data-[state=open]:ring-violet-300 dark:data-[state=open]:ring-violet-500 data-[state=open]:ring-offset-1 data-[state=open]:border-violet-400 dark:data-[state=open]:border-violet-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800/30 disabled:text-gray-500 dark:disabled:text-gray-400 transition-colors';
  
  const selectClasses = cn(
    baseSelectClasses,
    sizeClasses[size],
    error && 'border-red-500 dark:border-red-500 focus:border-red-500 dark:focus:border-red-500 focus:ring-red-300 dark:focus:ring-red-400 data-[state=open]:border-red-500 dark:data-[state=open]:border-red-500 data-[state=open]:ring-red-300 dark:data-[state=open]:ring-red-400',
    className
  );

  const fieldName = config?.name || 'unknown';
  const fieldLabel = config?.label;
  const fieldPlaceholder = placeholder || config?.placeholder || 'Select an option...';

  const renderFieldLabel = () =>
    fieldLabel ? (
      <label htmlFor={fieldName} className={getLabelClasses({ error: Boolean(error), required: Boolean(required) })}>
        {fieldLabel}
      </label>
    ) : null;

  const renderErrorMessage = (message?: string) =>
    message ? (
      <p className={errorTextClasses} role="alert">
        {message}
      </p>
    ) : null;


  const normalizedValueArray = useMemo(
    () => normalizeOptionArray(value),
    [value]
  );

  const normalizedOptions = useMemo(() => {
    const isFetching = Boolean(schemaId || sourceUrl);
    
    // If fetching and still loading, return empty array
    if (isFetching && isLoadingOptions) {
      return [] as NormalizedOption[];
    }
    // If fetching and has error, return empty array
    if (isFetching && optionsError) {
      return [] as NormalizedOption[];
    }
    // If fetching and has options, they're already sorted by the hook
    if (isFetching && fetchedOptions.length > 0) {
      return fetchedOptions;
    }
    // If no resolved options, return empty array
    if (!resolvedOptions || resolvedOptions.length === 0) {
      return [] as NormalizedOption[];
    }
    // Otherwise, normalize the provided options
    const normalized = normalizeOptionArray(resolvedOptions).map((opt) => ({
      ...opt,
      label: opt.label ?? opt.id,
    }));
    // Sort options if sortType is specified
    return sortNormalizedOptions(normalized, sortType);
  }, [resolvedOptions, schemaId, sourceUrl, fetchedOptions, isLoadingOptions, optionsError, sortType]);

  const normalizedOptionsLookup = useMemo(() => {
    const map = new Map<string, NormalizedOption>();
    normalizedOptions.forEach((opt) => {
      if (opt.id) {
        map.set(opt.id, opt);
      }
    });
    normalizedValueArray.forEach((opt) => {
      if (opt.id && !map.has(opt.id)) {
        map.set(opt.id, opt);
      }
    });
    return map;
  }, [normalizedOptions, normalizedValueArray]);
  const hasNormalizedOptions = normalizedOptions.length > 0;
  const validOptions = useMemo(
    () => normalizedOptions.filter((opt) => opt.id && opt.id !== ''),
    [normalizedOptions]
  );



  // Check if color is a valid badge variant, custom color, or Tailwind classes
  const isValidBadgeVariant = (color?: string): boolean => {
    if (!color) return false;
    const validVariants = ['default', 'secondary', 'destructive', 'success', 'warning', 'info', 'outline', 'gradient', 'muted'];
    return validVariants.includes(color);
  };

  const isHexColor = (color: string): boolean => {
    return color.startsWith('#');
  };

  const isTailwindClasses = (color: string): boolean => {
    // Check if it contains Tailwind class patterns
    return color.includes('bg-') || 
           color.includes('text-') || 
           color.includes('border-') ||
           color.includes('rounded-') ||
           /^[a-z]+-[a-z0-9-]+/.test(color); // Matches Tailwind class patterns like bg-red-400
  };

  // Render badge or custom colored badge
  const renderBadgeContent = (option: NormalizedOption) => {
    if (!option.color) {
      return (
        <div className="flex items-center gap-2">
          {option.icon && <IconRenderer iconName={option.icon} className="h-4 w-4" />}
          {option.label}
        </div>
      );
    }

    const iconEl = option.icon ? (
      <IconRenderer iconName={option.icon} className="h-3 w-3" />
    ) : null;

    // Check badge variant
    if (isValidBadgeVariant(option.color)) {
      return (
        <Badge variant={option.color as any} className="flex items-center gap-1.5 px-2 py-0.5">
          {iconEl}
          {option.label}
        </Badge>
      );
    }

    // Tailwind classes - render with custom classes
    if (isTailwindClasses(option.color)) {
      // Check if text color is already specified, if not add a default
      const hasTextColor = option.color.includes('text-');
      const defaultTextColor = hasTextColor ? '' : 'text-white';
      
      return (
        <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border ${defaultTextColor} ${option.color}`}>
          {iconEl}
          {option.label}
        </div>
      );
    }

    // Hex color - render with inline styles
    if (isHexColor(option.color)) {
      return (
        <div 
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: option.color, color: '#fff', border: 'none' }}
        >
          {iconEl}
          {option.label}
        </div>
      );
    }

    // Fallback - just render with color as className
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 ${option.color}`}>
        {iconEl}
        {option.label}
      </div>
    );
  };

  // Show loading state if fetching from schemaId or sourceUrl
  if ((schemaId || sourceUrl) && isLoadingOptions) {
    return (
      <div className="w-full">
        {renderFieldLabel()}
        <div className={cn(selectClasses, 'flex items-center justify-center text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700')}>
          Loading options...
        </div>
        {renderErrorMessage(optionsError ?? undefined)}
        {renderErrorMessage(error)}
      </div>
    );
  }

  // Show error state if fetching from schemaId or sourceUrl failed
  if ((schemaId || sourceUrl) && optionsError) {
    return (
      <div className="w-full">
        {renderFieldLabel()}
        <div className={cn(selectClasses, 'flex items-center justify-center text-red-500 dark:text-red-400 border-red-300 dark:border-red-700')}>
          {optionsError}
        </div>
        {renderErrorMessage(error)}
      </div>
    );
  }

  // If options are provided, render them with badges
  const normalizedCurrentValue = extractFirstId(value);
  const normalizedValueEntry = normalizedValueArray[0];

  if (hasNormalizedOptions) {
    const selectedOption = normalizedOptions.find((opt) => opt.id === normalizedCurrentValue);
    // Convert empty string to undefined so placeholder shows
    const selectValue = selectedOption?.id ?? (normalizedCurrentValue === '' ? undefined : normalizedCurrentValue);
    const displayOption = selectedOption ??
      (normalizedValueEntry
        ? {
            ...normalizedValueEntry,
            label: normalizedValueEntry.label ?? normalizedValueEntry.id,
          }
        : undefined);

    const handleRadixChange = (selectedId: string) => {
      if (onValueChange) {
        onValueChange(selectedId);
      }
      if (onNormalizedChange) {
        if (!selectedId) {
          onNormalizedChange([]);
          return;
        }
        const matched = normalizedOptions.find((opt) => opt.id === selectedId);
        onNormalizedChange(matched ? [matched] : []);
      }
    };

    return (
      <div className="w-full">
        {renderFieldLabel()}
        <RadixSelect
          value={selectValue}
          onValueChange={handleRadixChange}
          disabled={disabled}
          onOpenChange={onOpenChange}
          {...props}
        >
          <SelectTrigger className={cn(selectClasses)} id={fieldName}>
            <SelectValue placeholder={fieldPlaceholder}>
              {displayOption && renderBadgeContent(displayOption)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {validOptions.map((option, index) => (
              <motion.div
                key={option.id ?? index}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.2,
                  delay: Math.min(
                    index * UI_PARAMS.CARD_INDEX_DELAY.STEP,
                    UI_PARAMS.CARD_INDEX_DELAY.SKELETON_MAX
                  ),
                  ease: 'easeOut',
                }}
              >
                <SelectItem value={option.id as string} disabled={option.disabled}>
                  {renderBadgeContent(option)}
                </SelectItem>
              </motion.div>
            ))}
          </SelectContent>
        </RadixSelect>
        {error && renderErrorMessage(error)}
      </div>
    );
  }

  // Default behavior for children
  return (
    <div className="w-full">
      {renderFieldLabel()}
      <RadixSelect value={value} onValueChange={onValueChange} {...props}>
        <SelectTrigger className={selectClasses} id={fieldName}>
          <SelectValue placeholder={fieldPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {React.Children.map(children, (child, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.2,
                delay: Math.min(
                  index * UI_PARAMS.CARD_INDEX_DELAY.STEP,
                  UI_PARAMS.CARD_INDEX_DELAY.SKELETON_MAX
                ),
                ease: 'easeOut',
              }}
            >
              {child}
            </motion.div>
          ))}
        </SelectContent>
      </RadixSelect>
      {error && renderErrorMessage(error)}
    </div>
  );
};

// Export sub-components for convenience
export { SelectContent, SelectItem, SelectTrigger, SelectValue };

Select.displayName = 'Select';
