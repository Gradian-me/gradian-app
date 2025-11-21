'use client';

import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { FormElementRef, ToggleGroupProps } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { ToggleGroup as ToggleGroupRoot, ToggleGroupItem } from '@/components/ui/toggle-group';
import { NormalizedOption, normalizeOptionArray } from '../utils/option-normalizer';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { useOptionsFromUrl } from '../hooks/useOptionsFromUrl';
import { sortNormalizedOptions, SortType } from '@/gradian-ui/shared/utils/sort-utils';

const isBadgeVariant = (color?: string): color is keyof typeof BADGE_SELECTED_VARIANT_CLASSES => {
  if (!color) return false;
  return Object.prototype.hasOwnProperty.call(BADGE_SELECTED_VARIANT_CLASSES, color);
};

const isHexColor = (color?: string): boolean => {
  if (!color) return false;
  return color.startsWith('#');
};

const isTailwindClasses = (color?: string): boolean => {
  if (!color) return false;
  return color.includes('bg-') || color.includes('text-') || color.includes('border-') || /^[a-z]+-[a-z0-9-]+/.test(color);
};

const BADGE_SELECTED_VARIANT_CLASSES: Record<string, string> = {
  default: 'data-[state=on]:border-violet-300 data-[state=on]:bg-violet-200 data-[state=on]:text-violet-800',
  secondary: 'data-[state=on]:border-gray-300 data-[state=on]:bg-gray-200 data-[state=on]:text-gray-800',
  destructive: 'data-[state=on]:border-red-300 data-[state=on]:bg-red-200 data-[state=on]:text-red-800',
  success: 'data-[state=on]:border-emerald-300 data-[state=on]:bg-emerald-200 data-[state=on]:text-emerald-800',
  warning: 'data-[state=on]:border-amber-300 data-[state=on]:bg-amber-200 data-[state=on]:text-amber-800',
  info: 'data-[state=on]:border-sky-300 data-[state=on]:bg-sky-200 data-[state=on]:text-sky-800',
  outline: 'data-[state=on]:border-violet-300 data-[state=on]:bg-violet-200 data-[state=on]:text-violet-800',
  gradient: 'data-[state=on]:border-violet-300 data-[state=on]:bg-violet-200 data-[state=on]:text-violet-800',
  muted: 'data-[state=on]:border-gray-300 data-[state=on]:bg-gray-200 data-[state=on]:text-gray-800',
};

const ToggleGroupComponent = forwardRef<FormElementRef, ToggleGroupProps>(
  (
    {
      config,
      value,
      defaultValue,
      onChange,
      onBlur,
      onFocus,
      error,
      disabled = false,
      required = false,
      options,
      type,
      orientation,
      size = 'md',
      selectionBehavior,
      onNormalizedChange,
      className,
      sourceUrl,
      queryParams,
      transform,
      sortType = null,
      ...props
    },
    ref
  ) => {
    const groupRef = useRef<React.ElementRef<typeof ToggleGroupRoot>>(null);
    const allowMultiselectSetting =
      config?.metadata?.allowMultiselect ??
      (config as any)?.allowMultiselect;
    const allowMultiselect =
      allowMultiselectSetting === undefined
        ? undefined
        : Boolean(allowMultiselectSetting);

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

    const resolvedType: 'single' | 'multiple' = useMemo(() => {
      const explicitType =
        type === 'multiple' || type === 'multi'
          ? 'multiple'
          : type === 'single'
            ? 'single'
            : undefined;

      if (allowMultiselect === true) {
        return 'multiple';
      }

      if (allowMultiselect === false) {
        return explicitType ?? 'single';
      }

      if (explicitType) {
        return explicitType;
      }

      const configMode =
        config?.selectionType ||
        config?.selectionMode ||
        config?.mode ||
        (config?.multiple ? 'multiple' : undefined) ||
        config?.typeMode;

      return configMode === 'multiple' || configMode === 'multi'
        ? 'multiple'
        : 'single';
    }, [allowMultiselect, config, type]);

    const resolvedOrientation: 'horizontal' | 'vertical' =
      orientation || config?.orientation || 'horizontal';

    // Use URL options if sourceUrl is provided, otherwise use provided options or config options
    const rawOptions = sourceUrl
      ? urlOptions
      : options && options.length > 0
        ? options
        : config?.options || [];
    const normalizedOptions: NormalizedOption[] = useMemo(
      () => {
        const normalized = normalizeOptionArray(rawOptions).map((opt) => ({
          ...opt,
          label: opt.label ?? opt.id,
        }));
        return sortNormalizedOptions(normalized, sortType);
      },
      [rawOptions, sortType]
    );

    const normalizedValue = useMemo(() => normalizeOptionArray(value), [value]);
    const selectedIds = normalizedValue.map((opt) => opt.id);

    const defaultIds = useMemo(() => {
      if (defaultValue === undefined || defaultValue === null) return undefined;
      const normalizedDefault = normalizeOptionArray(defaultValue);
      return resolvedType === 'single'
        ? normalizedDefault[0]?.id
        : normalizedDefault.map((opt) => opt.id);
    }, [defaultValue, resolvedType]);

    const sizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    } as const;

    useImperativeHandle(ref, () => ({
      focus: () => {
        const firstItem = groupRef.current?.querySelector('button[data-state]');
        (firstItem as HTMLButtonElement | null)?.focus();
      },
      blur: () => {
        const active = document.activeElement as HTMLElement | null;
        if (groupRef.current && active && groupRef.current.contains(active)) {
          active.blur();
        }
        onBlur?.();
      },
      validate: () => {
        if (!config?.validation) return true;
        const payload = resolvedType === 'single' ? selectedIds[0] ?? '' : selectedIds;
        const result = validateField(payload, config.validation);
        return result.isValid;
      },
      reset: () => {
        if (resolvedType === 'single') {
          onChange?.(null);
          onNormalizedChange?.([]);
        } else {
          onChange?.([]);
          onNormalizedChange?.([]);
        }
      },
      getValue: () => (resolvedType === 'single' ? selectedIds[0] ?? null : selectedIds),
      setValue: (newValue) => onChange?.(newValue),
    }));

    const emitChange = (ids: string[]) => {
      const normalizedSelection = ids
        .map((id) => normalizedOptions.find((opt) => opt.id === id))
        .filter((opt): opt is NormalizedOption => Boolean(opt));

      if (resolvedType === 'single') {
        onChange?.(ids[0] ?? null);
      } else {
        onChange?.(ids);
      }

      onNormalizedChange?.(normalizedSelection);
    };

    const handleSingleChange = (nextValue: string) => {
      emitChange(nextValue ? [nextValue] : []);
    };

    const handleMultipleChange = (nextValues: string[]) => {
      emitChange(nextValues);
    };

    const rootClasses = cn(
      'flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white/60 p-2',
      resolvedOrientation === 'vertical' && 'flex-col',
      disabled && 'opacity-60 pointer-events-none cursor-not-allowed',
      error && 'border-red-500',
      className
    );

    const renderOption = (option: NormalizedOption) => {
      const isSelected = selectedIds.includes(option.id);

      let style: React.CSSProperties | undefined;
      let customClasses: string | undefined;

      if (isBadgeVariant(option.color)) {
        const variantClasses = BADGE_SELECTED_VARIANT_CLASSES[option.color] ?? BADGE_SELECTED_VARIANT_CLASSES.default;
        customClasses = cn(variantClasses);
      } else if (isTailwindClasses(option.color)) {
        customClasses = cn(option.color, 'data-[state=on]:text-gray-800');
      } else if (isHexColor(option.color)) {
        style = isSelected
          ? { backgroundColor: option.color, color: '#1f2937', borderColor: option.color }
          : undefined;
        customClasses = cn('data-[state=on]:text-gray-800');
      } else if (option.color) {
        customClasses = option.color;
      }

      return (
        <ToggleGroupItem
          key={option.id}
          value={option.id}
          disabled={disabled || option.disabled}
          className={cn(
            'gap-2 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-all duration-200 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 data-[state=on]:bg-violet-200 data-[state=on]:border-violet-300 data-[state=on]:text-violet-800 data-[state=on]:font-semibold',
            sizeClasses[size],
            customClasses,
            error && 'ring-1 ring-red-200'
          )}
          style={style}
          onFocus={onFocus}
          onBlur={onBlur}
        >
          {option.icon && <IconRenderer iconName={option.icon} className="h-4 w-4" />}
          <span>{option.label ?? option.id}</span>
        </ToggleGroupItem>
      );
    };

    const hasLabel = Boolean(config?.label);

    const toggleGroupTypeProps =
      resolvedType === 'single'
        ? {
            type: 'single' as const,
            value: selectedIds[0] ?? undefined,
            defaultValue: typeof defaultIds === 'string' ? defaultIds : undefined,
            onValueChange: handleSingleChange,
          }
        : {
            type: 'multiple' as const,
            value: selectedIds,
            defaultValue: Array.isArray(defaultIds) ? defaultIds : undefined,
            onValueChange: handleMultipleChange,
          };

    return (
      <div className="w-full space-y-2">
        {hasLabel && (
          <div
            className={cn(
              'flex items-center justify-between gap-2 text-xs font-medium',
              error ? 'text-red-700' : 'text-gray-700',
              required && 'after:content-["*"] after:ml-1 after:text-red-500'
            )}
          >
            <span>{config?.label}</span>
            {config?.helper && (
              <span className="text-xs font-normal text-gray-500">{config.helper}</span>
            )}
          </div>
        )}
        {isLoadingOptions ? (
          <div className="text-sm text-gray-500 py-2">Loading options...</div>
        ) : optionsError ? (
          <div className="text-sm text-red-600 py-2">{optionsError}</div>
        ) : (
          <ToggleGroupRoot
            ref={groupRef}
            orientation={resolvedOrientation}
            rovingFocus={true}
            disabled={disabled}
            {...(selectionBehavior
              ? { selectionBehavior }
              : config?.selectionBehavior
                ? { selectionBehavior: config.selectionBehavior }
                : {})}
            className={rootClasses}
            {...props}
            {...toggleGroupTypeProps}
          >
            {normalizedOptions.length > 0 ? (
              normalizedOptions.map(renderOption)
            ) : (
              <div className="text-sm text-gray-500">No options available</div>
            )}
          </ToggleGroupRoot>
        )}
        {config?.description && (
          <p className="text-xs text-gray-500">{config.description}</p>
        )}
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

ToggleGroupComponent.displayName = 'ToggleGroup';

export const ToggleGroup = ToggleGroupComponent;


