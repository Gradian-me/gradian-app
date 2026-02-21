'use client';

// Radio Group Component

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { RadioProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { getLabelClasses } from '../utils/field-styles';
import { extractFirstId, normalizeOptionArray, NormalizedOption } from '../utils/option-normalizer';
import { useOptionsFromUrl } from '../hooks/useOptionsFromUrl';
import { sortNormalizedOptions, SortType } from '@/gradian-ui/shared/utils/sort-utils';
import { buildReferenceFilterUrl, buildLookupOptionsUrl } from '../../utils/reference-filter-builder';
import { useDynamicFormContextStore } from '@/stores/dynamic-form-context.store';
import { ColumnMapConfig } from '@/gradian-ui/shared/utils/column-mapper';
import { replaceDynamicContext } from '../../utils/dynamic-context-replacer';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { useLanguageStore } from '@/stores/language.store';
import { getDefaultLanguage, resolveDisplayLabel } from '@/gradian-ui/shared/utils/translation-utils';
import { resolveLocalizedField } from '@/gradian-ui/shared/utils/localization';

function getOptionDisplayLabel(raw: unknown, lang: string | undefined, defaultLang: string): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return resolveDisplayLabel(raw, lang, defaultLang);
  return resolveLocalizedField(raw as Parameters<typeof resolveLocalizedField>[0], lang ?? defaultLang, defaultLang);
}

export const RadioGroup = forwardRef<FormElementRef, RadioProps>(
  (
    {
      config,
      value = '',
      onChange,
      onBlur,
      onFocus,
      error,
      disabled = false,
      required = false,
      options = [],
      direction = 'vertical',
      className,
      sourceUrl,
      queryParams,
      transform,
      sortType = null,
      ...props
    },
    ref
  ) => {
    const groupRef = useRef<HTMLDivElement>(null);

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
      if (process.env.NODE_ENV === 'production' && !result && (config as any)?.component === 'radio' && (configTargetSchema || configTargetSchemaUnderscore || configTargetSchemaDash)) {
        loggingCustom(LogType.CLIENT_LOG, 'warn', `[RadioGroup] targetSchema is null/empty for field: ${configName || configId}, targetSchema value: ${JSON.stringify(ts)}, resolved: ${JSON.stringify(resolvedTargetSchema)}, config keys: ${Object.keys(config || {}).join(', ')}`);
      }
      
      return result;
    }, [config, dynamicContext]);

    // Check if referenceEntityId is static (no dynamic context syntax)
    const isStaticReferenceId = React.useMemo(() => {
      return referenceEntityId && !referenceEntityId.includes('{{') && !referenceEntityId.includes('}}');
    }, [referenceEntityId]);

    // Build sourceUrl from reference fields if they're present and no explicit sourceUrl is provided
    const referenceBasedSourceUrl = React.useMemo(() => {
      if (!referenceEntityId || sourceUrl) return null;
      const shouldUseContext = !isStaticReferenceId;
      const contextSchema = shouldUseContext ? dynamicContext.formSchema : undefined;
      const contextValues = shouldUseContext ? dynamicContext.formData : undefined;
      if (targetSchemaFromConfig === 'lookups') {
        const url = buildLookupOptionsUrl({ referenceEntityId, schema: contextSchema, values: contextValues });
        return url && url.trim() !== '' ? url : null;
      }
      if (!referenceSchema || !referenceRelationTypeId) return null;
      const url = buildReferenceFilterUrl({
        referenceSchema,
        referenceRelationTypeId,
        referenceEntityId,
        targetSchema: targetSchemaFromConfig ?? undefined,
        schema: contextSchema,
        values: contextValues,
      });
      return url && url.trim() !== '' ? url : null;
    }, [referenceSchema, referenceRelationTypeId, referenceEntityId, targetSchemaFromConfig, sourceUrl, isStaticReferenceId, dynamicContext.formSchema, dynamicContext.formData]);

    // Use explicit sourceUrl if provided, otherwise use reference-based sourceUrl
    const effectiveSourceUrl = sourceUrl || referenceBasedSourceUrl || undefined;

    // Lookups options: { data: options }; relations: { data: [{ data: [...] }] } → data.0.data
    const defaultColumnMap: ColumnMapConfig = React.useMemo(() => ({
      response: { data: targetSchemaFromConfig === 'lookups' ? 'data' : 'data.0.data' },
      item: { id: 'id', label: 'label', icon: 'icon', color: 'color' },
    }), [targetSchemaFromConfig]);

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

    // Use URL options if sourceUrl is provided, otherwise use provided options
    const resolvedOptions = effectiveSourceUrl ? urlOptions : options;

    useImperativeHandle(ref, () => ({
      focus: () => {
        const firstRadio = groupRef.current?.querySelector('input[type="radio"]') as HTMLInputElement;
        firstRadio?.focus();
      },
      blur: () => {
        const activeElement = document.activeElement as HTMLInputElement;
        if (activeElement?.type === 'radio') {
          activeElement.blur();
        }
      },
      validate: () => {
        if (!config.validation) return true;
        const result = validateField(value, config.validation);
        return result.isValid;
      },
      reset: () => onChange?.(''),
      getValue: () => value,
      setValue: (newValue) => onChange?.(newValue),
    }));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange?.(newValue);
    };

    const handleBlur = () => {
      onBlur?.();
    };

    const handleFocus = () => {
      onFocus?.();
    };

    const groupClasses = cn(
      'space-y-2',
      direction === 'horizontal' && 'flex flex-wrap gap-4 space-y-0',
      className
    );

    const normalizedOptions: NormalizedOption[] = sortNormalizedOptions(
      normalizeOptionArray(resolvedOptions),
      sortType
    );

    const language = useLanguageStore((s) => s.getLanguage?.()) ?? undefined;
    const defaultLang = getDefaultLanguage();
    const resolvedValue = extractFirstId(value);

    return (
      <div className="w-full">
        {config.label && (
          <fieldset>
            <legend
              dir="auto"
              className={getLabelClasses({ error: Boolean(error), required, disabled })}
            >
              {resolveDisplayLabel(config.label, language ?? undefined, defaultLang)}
            </legend>
            {isLoadingOptions ? (
              <div className="text-sm text-gray-500 py-2">Loading options...</div>
            ) : optionsError ? (
              <div className="text-xs text-red-600 py-2">{optionsError}</div>
            ) : (
              <div ref={groupRef} className={groupClasses} {...props}>
                {normalizedOptions.map((option, index) => (
                <div key={option.id ?? index} className="flex items-center">
                  <input
                    id={`${config.name}-${option.id ?? index}`}
                    name={config.name}
                    type="radio"
                    value={option.id}
                    checked={resolvedValue === option.id}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onFocus={handleFocus}
                    required={required ?? config.validation?.required ?? false}
                    disabled={disabled || option.disabled}
                    className={cn(
                      // Base styles matching checkbox.tsx (lines 14-15) - adapted for radio
                      'peer h-4 w-4 shrink-0 rounded-full border border-violet-500 bg-background ring-offset-background',
                      'transition-all duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      // Checked state - radio uses white circle instead of checkmark
                      'checked:bg-violet-500 checked:border-violet-500 checked:shadow-sm',
                      'checked:after:content-[""] checked:after:absolute checked:after:left-1/2 checked:after:top-1/2',
                      'checked:after:-translate-x-1/2 checked:after:-translate-y-1/2',
                      'checked:after:w-2 checked:after:h-2 checked:after:rounded-full checked:after:bg-white',
                      // Hover effect
                      'hover:border-violet-400',
                      // Error state
                      error && 'border-red-500 focus-visible:ring-red-500 hover:border-red-500',
                      // Relative positioning for after pseudo-element
                      'relative'
                    )}
                  />
                  <label
                    htmlFor={`${config.name}-${option.id ?? index}`}
                    className={cn(
                      'ms-2 text-sm font-medium',
                      error ? 'text-red-700' : 'text-gray-700',
                      (disabled || option.disabled) && 'text-gray-400'
                    )}
                  >
                    {getOptionDisplayLabel(option.label ?? option.id, language ?? undefined, defaultLang)}
                  </label>
                </div>
              ))}
              </div>
            )}
          </fieldset>
        )}
        {error && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';
