// Select Component

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { UI_PARAMS } from '@/gradian-ui/shared/constants/application-variables';
import { extractFirstId, normalizeOptionArray, NormalizedOption } from '../utils/option-normalizer';
import { BadgeViewer } from '../utils/badge-viewer';
import { Check, ChevronDown } from 'lucide-react';
import { useOptionsFromUrl } from '../hooks/useOptionsFromUrl';
import { getLabelClasses, errorTextClasses } from '../utils/field-styles';

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
  sourceUrl,
  queryParams,
  transform,
  ...props
}) => {
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

  // Use URL options if sourceUrl is provided, otherwise use provided options
  const resolvedOptions = sourceUrl ? urlOptions : options;
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
  };

  const selectClasses = cn(
    sizeClasses[size],
    error && 'border-red-500 dark:border-red-600 focus:border-red-500 dark:focus:border-red-600 focus:ring-1 focus:ring-red-400 dark:focus:ring-red-500 data-[state=open]:border-red-500 dark:data-[state=open]:border-red-600 data-[state=open]:ring-red-400 dark:data-[state=open]:ring-red-500',
    className
  );

  const fieldName = config?.name || 'unknown';
  const fieldLabel = config?.label;
  const fieldPlaceholder = placeholder || config?.placeholder || 'Select an option...';
  const allowMultiselect = Boolean(
    config?.metadata?.allowMultiselect ??
    (config as any)?.allowMultiselect
  );

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

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const normalizedValueArray = useMemo(
    () => normalizeOptionArray(value),
    [value]
  );

  const normalizedOptions = useMemo(() => {
    // If fetching from URL and still loading, return empty array
    if (sourceUrl && isLoadingOptions) {
      return [] as NormalizedOption[];
    }
    // If fetching from URL and has error, return empty array
    if (sourceUrl && optionsError) {
      return [] as NormalizedOption[];
    }
    // If fetching from URL and has options, use them directly
    if (sourceUrl && urlOptions.length > 0) {
      return urlOptions;
    }
    // If no resolved options, return empty array
    if (!resolvedOptions || resolvedOptions.length === 0) {
      return [] as NormalizedOption[];
    }
    // Otherwise, normalize the provided options
    return normalizeOptionArray(resolvedOptions).map((opt) => ({
      ...opt,
      label: opt.label ?? opt.id,
    }));
  }, [resolvedOptions, sourceUrl, urlOptions, isLoadingOptions, optionsError]);

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

  useEffect(() => {
    if (!allowMultiselect || !isDropdownOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        onOpenChange?.(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        onOpenChange?.(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [allowMultiselect, isDropdownOpen, onOpenChange]);

  useEffect(() => {
    if (!allowMultiselect) {
      setIsDropdownOpen(false);
      onOpenChange?.(false);
    }
  }, [allowMultiselect, onOpenChange]);

  useEffect(() => {
    if (disabled) {
      setIsDropdownOpen(false);
      onOpenChange?.(false);
    }
  }, [disabled, onOpenChange]);

  const normalizedValueIds = useMemo(
    () =>
      normalizedValueArray
        .map((opt) => opt.id)
        .filter((id): id is string => Boolean(id)),
    [normalizedValueArray]
  );

  const normalizedValueIdsKey = useMemo(
    () => JSON.stringify(normalizedValueIds),
    [normalizedValueIds]
  );

  const [multiSelectionIds, setMultiSelectionIds] = useState<string[]>(normalizedValueIds);

  const [panelPlacement, setPanelPlacement] = useState<'bottom' | 'top'>('bottom');
  const [panelMaxHeight, setPanelMaxHeight] = useState<number>(256);
  const [panelOffset, setPanelOffset] = useState<number>(8);

  const updatePanelPosition = useCallback(() => {
    if (!allowMultiselect || !isDropdownOpen || disabled) {
      return;
    }

    const triggerEl = containerRef.current;
    if (!triggerEl) {
      return;
    }

    const triggerRect = triggerEl.getBoundingClientRect();
    const panelEl = panelRef.current;
    const panelHeight = panelEl?.offsetHeight ?? 0;
    const viewportHeight = window.innerHeight;
    const spacing = 12;

    const dialogEl = triggerEl.closest('[role="dialog"]');
    const dialogRect = dialogEl?.getBoundingClientRect();

    const boundaryTop = dialogRect ? dialogRect.top + spacing : spacing;
    const boundaryBottom = dialogRect ? dialogRect.bottom - spacing : viewportHeight - spacing;

    const spaceAbove = triggerRect.top - boundaryTop;
    const spaceBelow = boundaryBottom - triggerRect.bottom;

    let placement: 'bottom' | 'top' = 'bottom';
    let availableSpace = spaceBelow;

    if ((spaceBelow < panelHeight && spaceAbove > spaceBelow) || (spaceBelow < 160 && spaceAbove > spaceBelow)) {
      placement = 'top';
      availableSpace = spaceAbove;
    }

    const safeSpace = Math.max(80, availableSpace);
    const maxHeight = Math.max(120, Math.min(Math.floor(safeSpace), 360));
    const offset = Math.max(6, Math.min(12, Math.floor(Math.min(safeSpace / 6, 12))));

    setPanelPlacement(placement);
    setPanelMaxHeight(maxHeight);
    setPanelOffset(offset);
  }, [allowMultiselect, disabled, isDropdownOpen]);

  useLayoutEffect(() => {
    updatePanelPosition();
  }, [updatePanelPosition, multiSelectionIds, normalizedOptionsLookup]);

  useEffect(() => {
    if (!allowMultiselect || !isDropdownOpen) {
      return;
    }

    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);

    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [allowMultiselect, isDropdownOpen, updatePanelPosition]);

  useEffect(() => {
    if (!allowMultiselect) {
      setMultiSelectionIds([]);
      return;
    }

    const idsFromValue: string[] = normalizedValueIdsKey
      ? JSON.parse(normalizedValueIdsKey)
      : [];

    setMultiSelectionIds((prev) => {
      if (prev.length === idsFromValue.length) {
        let isEqual = true;
        for (let i = 0; i < prev.length; i += 1) {
          if (prev[i] !== idsFromValue[i]) {
            isEqual = false;
            break;
          }
        }
        if (isEqual) {
          return prev;
        }
      }
      return idsFromValue;
    });
  }, [allowMultiselect, normalizedValueIdsKey]);

  const arraysMatch = useCallback(
    (a: string[], b: string[]) => {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    },
    []
  );

  const sortedNormalizedValueIds = useMemo(
    () => [...normalizedValueIds].sort(),
    [normalizedValueIds]
  );

  const multiSelectionSet = useMemo(() => new Set(multiSelectionIds), [multiSelectionIds]);

  const selectionKey = useMemo(() => [...multiSelectionIds].sort().join('|'), [multiSelectionIds]);
  const normalizedValueKey = useMemo(
    () => sortedNormalizedValueIds.join('|'),
    [sortedNormalizedValueIds]
  );
  const lastEmittedKeyRef = useRef<string>('');

  useEffect(() => {
    if (!allowMultiselect || !onNormalizedChange) {
      return;
    }

    // If selection matches incoming value, treat as synchronized and skip emission
    if (selectionKey === normalizedValueKey) {
      lastEmittedKeyRef.current = selectionKey;
      return;
    }

    // Avoid emitting the same selection repeatedly
    if (selectionKey === lastEmittedKeyRef.current) {
      return;
    }

    const normalizedSelection = multiSelectionIds
      .map((id) => normalizedOptionsLookup.get(id))
      .filter((opt): opt is NormalizedOption => Boolean(opt));

    lastEmittedKeyRef.current = selectionKey;
    onNormalizedChange(normalizedSelection);
  }, [
    allowMultiselect,
    multiSelectionIds,
    normalizedOptionsLookup,
    normalizedValueKey,
    onNormalizedChange,
    selectionKey,
  ]);

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

  // Show loading state if fetching from URL
  if (sourceUrl && isLoadingOptions) {
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

  // Show error state if fetching from URL failed
  if (sourceUrl && optionsError) {
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
    // Filter out empty string values as Radix doesn't allow them
    const validOptions = normalizedOptions.filter((opt) => opt.id && opt.id !== '');
    // Convert empty string to undefined so placeholder shows
    const selectValue = allowMultiselect
      ? undefined
      : selectedOption?.id ?? (normalizedCurrentValue === '' ? undefined : normalizedCurrentValue);
    const displayOption =
      !allowMultiselect
        ? selectedOption ??
          (normalizedValueEntry
            ? {
                ...normalizedValueEntry,
                label: normalizedValueEntry.label ?? normalizedValueEntry.id,
              }
            : undefined)
        : undefined;

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

    if (allowMultiselect) {
      const multiSelectedOptions = multiSelectionIds
        .map((id) => normalizedOptionsLookup.get(id))
        .filter((opt): opt is NormalizedOption => Boolean(opt));

      const triggerSizeClasses = {
        sm: 'min-h-8',
        md: 'min-h-10',
        lg: 'min-h-12',
      } as const;

      const triggerClasses = cn(
        'flex w-full items-center justify-between rounded-md border bg-white dark:bg-slate-800 px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400',
        triggerSizeClasses[size],
        disabled ? 'pointer-events-none opacity-60 cursor-not-allowed' : 'cursor-pointer',
        error
          ? 'border-red-500 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-600'
          : 'border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-500',
        'items-start gap-2',
        className
      );

      const panelClasses = cn(
        'absolute left-0 right-0 z-50 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden',
        panelPlacement === 'bottom' ? 'top-full' : 'bottom-full'
      );

      const optionButtonClasses = (isSelected: boolean) =>
        cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors text-left',
          isSelected
            ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 shadow-inner'
            : 'hover:bg-gray-50 dark:hover:bg-slate-700'
        );

      const renderMultiTriggerContent = () => {
        if (multiSelectionIds.length === 0) {
          return (
            <span className="text-sm text-gray-400 dark:text-gray-500">
              {fieldPlaceholder}
            </span>
          );
        }

        const selectedOptions = multiSelectionIds
          .map((id) => normalizedOptionsLookup.get(id))
          .filter((opt): opt is NormalizedOption => Boolean(opt));

        if (selectedOptions.length === 0) {
          return (
            <span className="text-sm text-gray-400 dark:text-gray-500">
              {fieldPlaceholder}
            </span>
          );
        }

        return (
          <BadgeViewer
            field={{
              name: fieldName,
              label: fieldLabel ?? fieldName,
              type: 'select',
              component: 'select',
              sectionId: '',
              options: normalizedOptions,
            } as any}
            value={selectedOptions}
            maxBadges={0}
            className="flex flex-wrap gap-1"
            enforceVariant={false}
          />
        );
      };

      const toggleOption = (option: NormalizedOption) => {
        if (disabled) return;
        const optionId = option.id;
        if (!optionId) {
          return;
        }

        setMultiSelectionIds((prev) => {
          const alreadySelected = prev.includes(optionId);
          const next = alreadySelected
            ? prev.filter((id) => id !== optionId)
            : [...prev, optionId];
          return next;
        });
      };

      return (
        <div className="w-full" ref={containerRef}>
          {renderFieldLabel()}
          <div className="relative">
            <button
              type="button"
              className={triggerClasses}
              onClick={() =>
                setIsDropdownOpen((prev) => {
                  const next = !prev;
                  onOpenChange?.(next);
                  return next;
                })
              }
            >
              <div className="flex flex-1 flex-wrap gap-1">
                {renderMultiTriggerContent()}
              </div>
              <ChevronDown
                className={cn(
                  'ml-2 h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform',
                  isDropdownOpen && 'rotate-180'
                )}
              />
            </button>
            {isDropdownOpen && (
              <div
                className={panelClasses}
                ref={panelRef}
                style={{
                  maxHeight: panelMaxHeight,
                  marginTop: panelPlacement === 'bottom' ? panelOffset : undefined,
                  marginBottom: panelPlacement === 'top' ? panelOffset : undefined,
                }}
              >
              <div className="max-h-full overflow-y-auto py-1">
                  {validOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      No options available
                    </div>
                  ) : (
                  validOptions.map((option, index) => {
                    const optionId = option.id ?? '';
                    const isSelected = multiSelectionSet.has(optionId);
                    return (
                      <motion.div
                        key={optionId}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.17, delay: Math.min(index * 0.04, 0.25) }}
                      >
                        <button
                          type="button"
                          className={optionButtonClasses(isSelected)}
                          onClick={(event) => {
                            event.preventDefault();
                            toggleOption(option);
                          }}
                        >
                          <span
                            className={cn(
                              'flex h-4 w-4 items-center justify-center rounded border text-white transition-colors',
                              isSelected
                                ? 'border-violet-500 dark:border-violet-400 bg-violet-500 dark:bg-violet-400 shadow-sm'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-transparent'
                            )}
                          >
                            <Check className="h-3 w-3" />
                          </span>
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            {renderBadgeContent(option)}
                          </span>
                        </button>
                      </motion.div>
                    );
                  })
                  )}
                </div>
              </div>
            )}
          </div>
          {error && renderErrorMessage(error)}
        </div>
      );
    }

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
