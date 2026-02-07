'use client';

import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { FormElementRef, ToggleGroupProps } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { ToggleGroup as ToggleGroupRoot, ToggleGroupItem } from '@/components/ui/toggle-group';
import { NormalizedOption, normalizeOptionArray } from '../utils/option-normalizer';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { useOptionsFromUrl } from '../hooks/useOptionsFromUrl';
import { sortNormalizedOptions, SortType } from '@/gradian-ui/shared/utils/sort-utils';
import { getLabelClasses, errorTextClasses } from '../utils/field-styles';
import { buildReferenceFilterUrl } from '../../utils/reference-filter-builder';
import { useDynamicFormContextStore } from '@/stores/dynamic-form-context.store';
import { ColumnMapConfig } from '@/gradian-ui/shared/utils/column-mapper';
import { replaceDynamicContext } from '../../utils/dynamic-context-replacer';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

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
  default: 'data-[state=on]:border-violet-400 data-[state=on]:bg-gradient-to-r data-[state=on]:from-violet-500 data-[state=on]:to-purple-600 data-[state=on]:text-white data-[state=on]:shadow-md dark:data-[state=on]:border-violet-500 dark:data-[state=on]:from-violet-600 dark:data-[state=on]:to-purple-700 dark:data-[state=on]:shadow-lg',
  secondary: 'data-[state=on]:border-gray-400 data-[state=on]:bg-gray-200 data-[state=on]:text-gray-800 dark:data-[state=on]:border-gray-600 dark:data-[state=on]:bg-gray-700 dark:data-[state=on]:text-gray-100',
  destructive: 'data-[state=on]:border-red-400 data-[state=on]:bg-gradient-to-r data-[state=on]:from-red-500 data-[state=on]:to-red-600 data-[state=on]:text-white data-[state=on]:shadow-md dark:data-[state=on]:border-red-500 dark:data-[state=on]:from-red-600 dark:data-[state=on]:to-red-700 dark:data-[state=on]:shadow-lg',
  success: 'data-[state=on]:border-emerald-400 data-[state=on]:bg-gradient-to-r data-[state=on]:from-emerald-500 data-[state=on]:to-emerald-600 data-[state=on]:text-white data-[state=on]:shadow-md dark:data-[state=on]:border-emerald-500 dark:data-[state=on]:from-emerald-600 dark:data-[state=on]:to-emerald-700 dark:data-[state=on]:shadow-lg',
  warning: 'data-[state=on]:border-amber-400 data-[state=on]:bg-gradient-to-r data-[state=on]:from-amber-500 data-[state=on]:to-amber-600 data-[state=on]:text-white data-[state=on]:shadow-md dark:data-[state=on]:border-amber-500 dark:data-[state=on]:from-amber-600 dark:data-[state=on]:to-amber-700 dark:data-[state=on]:shadow-lg',
  info: 'data-[state=on]:border-sky-400 data-[state=on]:bg-gradient-to-r data-[state=on]:from-sky-500 data-[state=on]:to-sky-600 data-[state=on]:text-white data-[state=on]:shadow-md dark:data-[state=on]:border-sky-500 dark:data-[state=on]:from-sky-600 dark:data-[state=on]:to-sky-700 dark:data-[state=on]:shadow-lg',
  outline: 'data-[state=on]:border-violet-400 data-[state=on]:bg-gradient-to-r data-[state=on]:from-violet-500 data-[state=on]:to-purple-600 data-[state=on]:text-white data-[state=on]:shadow-md dark:data-[state=on]:border-violet-500 dark:data-[state=on]:from-violet-600 dark:data-[state=on]:to-purple-700 dark:data-[state=on]:shadow-lg',
  gradient: 'data-[state=on]:border-violet-400 data-[state=on]:bg-gradient-to-r data-[state=on]:from-violet-500 data-[state=on]:to-purple-600 data-[state=on]:text-white data-[state=on]:shadow-md dark:data-[state=on]:border-violet-500 dark:data-[state=on]:from-violet-600 dark:data-[state=on]:to-purple-700 dark:data-[state=on]:shadow-lg',
  muted: 'data-[state=on]:border-gray-400 data-[state=on]:bg-gray-200 data-[state=on]:text-gray-800 dark:data-[state=on]:border-gray-600 dark:data-[state=on]:bg-gray-700 dark:data-[state=on]:text-gray-100',
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

    // Get dynamic context for reference-based filtering
    // Use selector to ensure reactivity when formSchema or formData changes
    const formSchema = useDynamicFormContextStore((state) => state.formSchema);
    const formData = useDynamicFormContextStore((state) => state.formData);
    const dynamicContext = { formSchema, formData };

    // Check for reference-based filtering fields in config
    const referenceSchema = config?.referenceSchema;
    const referenceRelationTypeId = config?.referenceRelationTypeId;
    const referenceEntityId = config?.referenceEntityId;
    
    // Extract targetSchema with defensive checks for production
    // Try multiple possible property names and handle empty strings
    // Process through dynamic context replacer to support templates like {{formData.resourceType}}
    const targetSchemaFromConfig = React.useMemo(() => {
      // Access config properties directly inside the memo to satisfy React Compiler
      const configTargetSchema = (config as any)?.targetSchema;
      const configTargetSchemaUnderscore = (config as any)?.target_schema;
      const configTargetSchemaDash = (config as any)?.['target-schema'];
      const configName = (config as any)?.name;
      const configId = (config as any)?.id;
      
      const ts = configTargetSchema || configTargetSchemaUnderscore || configTargetSchemaDash;
      
      if (!ts || String(ts).trim() === '') {
        return null;
      }
      
      const rawTargetSchema = String(ts).trim();
      
      // Process through dynamic context replacer to resolve templates like {{formData.resourceType}}
      const resolvedTargetSchema = replaceDynamicContext(rawTargetSchema, dynamicContext);
      
      // Check if the result still contains unresolved templates (still has {{ and }})
      // If so, return null to prevent invalid schema fetches
      if (typeof resolvedTargetSchema === 'string' && resolvedTargetSchema.includes('{{') && resolvedTargetSchema.includes('}}')) {
        return null;
      }
      
      // Return null for empty string, otherwise return the resolved value
      const result = typeof resolvedTargetSchema === 'string' && resolvedTargetSchema.trim() !== '' ? resolvedTargetSchema.trim() : null;
      
      // Log in production to help debug issues
      if (process.env.NODE_ENV === 'production' && !result && ((config as any)?.component === 'toggle-group' || (config as any)?.component === 'togglegroup') && (configTargetSchema || configTargetSchemaUnderscore || configTargetSchemaDash)) {
        loggingCustom(LogType.CLIENT_LOG, 'warn', `[ToggleGroup] targetSchema is null/empty for field: ${configName || configId}, targetSchema value: ${JSON.stringify(ts)}, resolved: ${JSON.stringify(resolvedTargetSchema)}, config keys: ${Object.keys(config || {}).join(', ')}`);
      }
      
      return result;
    }, [config, dynamicContext]);

    // Check if referenceEntityId is static (no dynamic context syntax)
    const isStaticReferenceId = React.useMemo(() => {
      return referenceEntityId && !referenceEntityId.includes('{{') && !referenceEntityId.includes('}}');
    }, [referenceEntityId]);

    // Build sourceUrl from reference fields if they're present and no explicit sourceUrl is provided
    const referenceBasedSourceUrl = React.useMemo(() => {
      if (!referenceSchema || !referenceRelationTypeId || !referenceEntityId || sourceUrl) {
        return null;
      }
      
      // For static IDs, we can build the URL immediately without waiting for dynamic context
      // For dynamic IDs, we need the context to be ready
      const shouldUseContext = !isStaticReferenceId;
      const contextSchema = shouldUseContext ? dynamicContext.formSchema : undefined;
      const contextValues = shouldUseContext ? dynamicContext.formData : undefined;
      
      // Build the sourceUrl using reference fields
      const url = buildReferenceFilterUrl({
        referenceSchema,
        referenceRelationTypeId,
        referenceEntityId,
        targetSchema: targetSchemaFromConfig ?? undefined,
        schema: contextSchema,
        values: contextValues,
      });
      
      // If URL is empty (e.g., dynamic context not ready for dynamic IDs), return null
      return url && url.trim() !== '' ? url : null;
    }, [referenceSchema, referenceRelationTypeId, referenceEntityId, targetSchemaFromConfig, sourceUrl, isStaticReferenceId, dynamicContext.formSchema, dynamicContext.formData]);

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
    const rawOptions = effectiveSourceUrl
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
      'flex flex-wrap gap-2 rounded-xl border p-2 shadow-sm transition-all duration-200',
      // Light mode
      'border-gray-200 bg-white/80 backdrop-blur-sm',
      // Dark mode
      'dark:border-gray-700 dark:bg-gray-800/60 dark:backdrop-blur-sm',
      // Orientation
      resolvedOrientation === 'vertical' && 'flex-col',
      // States
      disabled && 'opacity-60 pointer-events-none cursor-not-allowed',
      error && 'border-red-500 dark:border-red-600',
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
            'gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200',
            // Light mode - default
            'text-gray-700 border-gray-200 bg-white shadow-sm',
            'hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 hover:shadow-md',
            // Light mode - selected
            'data-[state=on]:bg-gradient-to-r data-[state=on]:from-violet-500 data-[state=on]:to-purple-600 data-[state=on]:border-violet-400 data-[state=on]:text-white data-[state=on]:shadow-md data-[state=on]:font-semibold',
            // Dark mode - default
            'dark:text-gray-300 dark:border-gray-700 dark:bg-gray-800/50',
            'dark:hover:border-violet-500 dark:hover:bg-gray-700 dark:hover:text-violet-300 dark:hover:shadow-lg',
            // Dark mode - selected
            'dark:data-[state=on]:bg-gradient-to-r dark:data-[state=on]:from-violet-600 dark:data-[state=on]:to-purple-700 dark:data-[state=on]:border-violet-500 dark:data-[state=on]:text-white dark:data-[state=on]:shadow-lg',
            // Active press effect
            'active:scale-[0.98]',
            sizeClasses[size],
            customClasses,
            error && 'ring-1 ring-red-200 dark:ring-red-600'
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

    const fieldName = config?.name || 'toggle-group';
    
    return (
      <div className="w-full space-y-2">
        {hasLabel && (
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={fieldName}
              dir="auto"
              className={getLabelClasses({ error: Boolean(error), required, disabled })}
            >
              {config?.label}
            </label>
            {config?.helper && (
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">{config.helper}</span>
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
          <p className="text-xs text-gray-500 dark:text-gray-400">{config.description}</p>
        )}
        {error && (
          <p className={errorTextClasses} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

ToggleGroupComponent.displayName = 'ToggleGroup';

export const ToggleGroup = ToggleGroupComponent;


