// Select Component
'use client';

import React, { useMemo, useEffect, useLayoutEffect } from 'react';
import {
  Select as RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '../../../../components/ui/select';
import { SelectProps } from '../types';
import { cn } from '../../../shared/utils';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Badge } from '../../../../components/ui/badge';
import { motion } from 'framer-motion';
import { UI_PARAMS } from '@/gradian-ui/shared/configs/ui-config';
import { extractFirstId, normalizeOptionArray, NormalizedOption } from '../utils/option-normalizer';
import { ChevronDown, Search } from 'lucide-react';
import { useOptionsFromUrl } from '../hooks/useOptionsFromUrl';
import { useOptionsFromSchemaOrUrl } from '../hooks/useOptionsFromSchemaOrUrl';
import { getLabelClasses, errorTextClasses, selectTriggerBaseClasses, selectErrorBorderClasses } from '../utils/field-styles';
import { sortNormalizedOptions, SortType } from '@/gradian-ui/shared/utils/sort-utils';
import { buildReferenceFilterUrl, buildLookupOptionsUrl } from '../../utils/reference-filter-builder';
import { useDynamicFormContextStore } from '@/stores/dynamic-form-context.store';
import { ColumnMapConfig } from '@/gradian-ui/shared/utils/column-mapper';
import { replaceDynamicContext } from '../../utils/dynamic-context-replacer';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { scrollInputIntoView } from '@/gradian-ui/shared/utils/dom-utils';
import { getValidBadgeVariant } from '@/gradian-ui/data-display/utils/badge-variant-mapper';
import { getT, getDefaultLanguage, isRTL, resolveDisplayLabel } from '@/gradian-ui/shared/utils/translation-utils';
import { resolveLocalizedField } from '@/gradian-ui/shared/utils/localization';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { useLanguageStore } from '@/stores/language.store';

/** Resolve option label (string or API localized shape) to display string. */
function getOptionDisplayLabel(raw: unknown, lang: string, defaultLang: string): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return resolveDisplayLabel(raw, lang, defaultLang);
  return resolveLocalizedField(raw as Parameters<typeof resolveLocalizedField>[0], lang, defaultLang);
}

export interface SelectOption {
  id?: string;
  value?: string;
  label: string;
  disabled?: boolean;
  icon?: string;
  /** ISO 3166-1 alpha-2 country code for flag-icons (e.g. 'gb', 'ir'). When set, flag is shown instead of icon. */
  flagCode?: string;
  color?: string; // Can be a badge variant (success, warning, etc.), custom hex color, or Tailwind classes
  category?: string; // Category for grouping options
  isRTL?: boolean; // Right-to-left script (e.g. Arabic, Persian)
  /** BCP 47 locale string (e.g. 'en-US', 'fa-IR') for date/number formatting. Used by LanguageSelector. */
  locale?: string;
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
  /**
   * Enable client-side search functionality (default: true)
   */
  enableSearch?: boolean;
  /**
   * Sort options alphabetically A to Z (default: true). If false, shows options in original order.
   */
  sortAtoZ?: boolean;
  /**
   * Enable grouping by category (default: true). If true and options have categories, they will be grouped. If false, shows all options directly.
   */
  enableGrouping?: boolean;
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
  enableSearch = true,
  sortAtoZ = true,
  enableGrouping = true,
  ...props
}) => {
  const language = useLanguageStore((s) => s.getLanguage()) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => setIsMounted(true), []);
  const rtl = isMounted ? isRTL(language) : false;
  const noOptionsFoundLabel = getT(TRANSLATION_KEYS.MESSAGE_NO_OPTIONS_FOUND, language, defaultLang);
  const placeholderSearchOptions = getT(TRANSLATION_KEYS.PLACEHOLDER_SEARCH_OPTIONS, language, defaultLang);

  // State for search functionality
  const [searchValue, setSearchValue] = React.useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [isSelectOpen, setIsSelectOpen] = React.useState(false);
  // Controlled open state to prevent closing when keyboard opens (must be declared unconditionally)
  const [controlledOpen, setControlledOpen] = React.useState<boolean | undefined>(undefined);
  
  // Detect touch device
  const isTouchDevice = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);
  
  // Track viewport height to detect keyboard appearance
  const viewportHeightRef = React.useRef<number>(typeof window !== 'undefined' ? window.innerHeight : 0);
  const isKeyboardOpeningRef = React.useRef(false);
  const isKeyboardClosingRef = React.useRef(false);
  // Track if we're manually closing to prevent double-closing
  const isManuallyClosingRef = React.useRef(false);
  
  // Maintain focus on search input when select is open
  // On touch devices, don't auto-focus to prevent keyboard from closing the select
  // Instead, let user tap the input to open keyboard
  useLayoutEffect(() => {
    if (isSelectOpen && enableSearch && searchInputRef.current && !isTouchDevice) {
      // On non-touch devices, focus immediately
      requestAnimationFrame(() => {
        if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
          searchInputRef.current.focus();
        }
      });
    }
    
    // Track viewport height changes (keyboard open/close)
    if (isTouchDevice && isSelectOpen) {
      const updateViewportHeight = () => {
        const currentHeight = window.innerHeight;
        const heightDiff = viewportHeightRef.current - currentHeight;
        
        // If viewport shrunk significantly (keyboard opened), mark it
        if (heightDiff > 100) {
          isKeyboardOpeningRef.current = true;
          isKeyboardClosingRef.current = false;
          // Reset after a short delay
          setTimeout(() => {
            isKeyboardOpeningRef.current = false;
          }, 500);
        }
        // If viewport expanded significantly (keyboard closed), mark it
        else if (heightDiff < -100) {
          isKeyboardClosingRef.current = true;
          isKeyboardOpeningRef.current = false;
          // Reset after a short delay
          setTimeout(() => {
            isKeyboardClosingRef.current = false;
          }, 500);
        }
        viewportHeightRef.current = currentHeight;
      };
      
      // Update initial viewport height
      viewportHeightRef.current = window.innerHeight;
      
      // Listen for resize events (keyboard open/close)
      window.addEventListener('resize', updateViewportHeight);
      // Also listen for visual viewport changes (more accurate for mobile keyboards)
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateViewportHeight);
      }
      
      return () => {
        window.removeEventListener('resize', updateViewportHeight);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', updateViewportHeight);
        }
      };
    }
  }, [isSelectOpen, enableSearch, isTouchDevice]);
  
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
    if (process.env.NODE_ENV === 'production' && !result && (config as any)?.component === 'select' && (configTargetSchema || configTargetSchemaUnderscore || configTargetSchemaDash)) {
      loggingCustom(LogType.CLIENT_LOG, 'warn', `[Select] targetSchema is null/empty for field: ${configName || configId}, targetSchema value: ${JSON.stringify(ts)}, resolved: ${JSON.stringify(resolvedTargetSchema)}, config keys: ${Object.keys(config || {}).join(', ')}`);
    }
    
    return result;
  }, [config, dynamicContext]);

  // Check if referenceEntityId is static (no dynamic context syntax)
  const isStaticReferenceId = React.useMemo(() => {
    return referenceEntityId && !referenceEntityId.includes('{{') && !referenceEntityId.includes('}}');
  }, [referenceEntityId]);

  // Build sourceUrl from reference fields if they're present and no explicit sourceUrl is provided
  const referenceBasedSourceUrl = React.useMemo(() => {
    if (!referenceEntityId || sourceUrl) {
      return null;
    }
    const shouldUseContext = !isStaticReferenceId;
    const contextSchema = shouldUseContext ? dynamicContext.formSchema : undefined;
    const contextValues = shouldUseContext ? dynamicContext.formData : undefined;

    // Lookup options: targetSchema=lookups and referenceEntityId=lookup id → GET /api/lookups/options/[id]
    if (targetSchemaFromConfig === 'lookups') {
      const url = buildLookupOptionsUrl({
        referenceEntityId,
        schema: contextSchema,
        values: contextValues,
      });
      return url && url.trim() !== '' ? url : null;
    }

    // Relation-based: referenceSchema + referenceRelationTypeId + referenceEntityId
    if (!referenceSchema || !referenceRelationTypeId) {
      return null;
    }
    const url = buildReferenceFilterUrl({
      referenceSchema,
      referenceRelationTypeId,
      referenceEntityId,
      targetSchema: (targetSchemaFromConfig || schemaId) || undefined,
      schema: contextSchema,
      values: contextValues,
    });
    return url && url.trim() !== '' ? url : null;
  }, [referenceSchema, referenceRelationTypeId, referenceEntityId, targetSchemaFromConfig, schemaId, sourceUrl, isStaticReferenceId, dynamicContext.formSchema, dynamicContext.formData]);

  // Use explicit sourceUrl if provided, otherwise use reference-based sourceUrl
  // If reference-based URL is empty, fall back to using schemaId or targetSchema
  const effectiveSourceUrl = sourceUrl || referenceBasedSourceUrl || undefined;
  // Determine effective schemaId: use schemaId prop if provided, otherwise use targetSchemaFromConfig
  // This ensures targetSchema works even when schemaId prop is not explicitly passed
  const effectiveSchemaId = React.useMemo(() => {
    if (schemaId) return schemaId;
    if (targetSchemaFromConfig) return targetSchemaFromConfig;
    // Fallback: if we have reference fields but URL is empty, try using targetSchema
    if (referenceSchema && !referenceBasedSourceUrl && !sourceUrl && targetSchemaFromConfig) {
      return targetSchemaFromConfig;
    }
    return undefined;
  }, [schemaId, targetSchemaFromConfig, referenceSchema, referenceBasedSourceUrl, sourceUrl]);

  // Default columnMap: lookups options return { data: options }; relations return { data: [{ data: items }] } → data.0.data
  const defaultColumnMap: ColumnMapConfig = React.useMemo(() => ({
    response: {
      data: targetSchemaFromConfig === 'lookups' ? 'data' : 'data.0.data',
    },
    item: {
      id: 'id',
      label: 'label',
      icon: 'icon',
      color: 'color',
    },
  }), [targetSchemaFromConfig]);

  // Get columnMap from config if provided
  const configColumnMap = (config as any)?.columnMap as ColumnMapConfig | undefined;

  // Use provided columnMap or fallback to default when using reference-based filtering
  const effectiveColumnMap = React.useMemo(() => {
    if (configColumnMap) {
      const base = {
        response: { data: targetSchemaFromConfig === 'lookups' ? 'data' : 'data.0.data' },
        item: { id: 'id', label: 'label', icon: 'icon', color: 'color' as const },
      };
      return {
        ...base,
        ...configColumnMap,
        response: { ...base.response, ...configColumnMap.response },
        item: { ...base.item, ...configColumnMap.item },
      };
    }
    return referenceBasedSourceUrl ? defaultColumnMap : undefined;
  }, [configColumnMap, referenceBasedSourceUrl, defaultColumnMap, targetSchemaFromConfig]);

  // Fetch options from schemaId or sourceUrl if provided
  const {
    options: fetchedOptions,
    isLoading: isLoadingOptions,
    error: optionsError,
  } = useOptionsFromSchemaOrUrl({
    schemaId: effectiveSchemaId || schemaId,
    sourceUrl: effectiveSourceUrl,
    enabled: Boolean(effectiveSchemaId || schemaId || effectiveSourceUrl),
    transform,
    queryParams,
    sortType,
    columnMap: effectiveColumnMap,
  });

  // Use fetched options if schemaId or sourceUrl is provided, otherwise use provided options
  const resolvedOptions = (effectiveSchemaId || schemaId || effectiveSourceUrl) ? fetchedOptions : options;
  const sizeClasses = {
    sm: 'h-8',
    md: 'min-h-11',
    lg: 'h-12',
  };

  const selectClasses = cn(
    selectTriggerBaseClasses,
    sizeClasses[size],
    error && selectErrorBorderClasses,
    className
  );

  const fieldName = config?.name || 'unknown';
  const selectLang = useLanguageStore((s) => s.getLanguage?.()) ?? getDefaultLanguage();
  const selectDefaultLang = getDefaultLanguage();
  const fieldLabel = resolveDisplayLabel(config?.label, selectLang, selectDefaultLang);
  const fieldPlaceholder = placeholder || config?.placeholder || getT(TRANSLATION_KEYS.PLACEHOLDER_SELECT_OPTION, selectLang, selectDefaultLang);

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
    const isFetching = Boolean(schemaId || effectiveSourceUrl);
    
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
    // Otherwise, normalize the provided options (resolve localized labels to string)
    const normalized = normalizeOptionArray(resolvedOptions).map((opt) => ({
      ...opt,
      label: getOptionDisplayLabel(opt.label ?? opt.id, selectLang, selectDefaultLang) || (opt.id ?? ''),
    }));
    
    // Sort options based on sortType or sortAtoZ
    let sorted = normalized;
    if (sortType) {
      // Use sortType if specified (takes precedence)
      sorted = sortNormalizedOptions(normalized, sortType);
    } else if (sortAtoZ) {
      // Sort alphabetically A to Z
      sorted = [...normalized].sort((a, b) => {
        const labelA = getOptionDisplayLabel(a.label ?? a.id, selectLang, selectDefaultLang).toLowerCase();
        const labelB = getOptionDisplayLabel(b.label ?? b.id, selectLang, selectDefaultLang).toLowerCase();
        return labelA.localeCompare(labelB);
      });
    }
    // If sortAtoZ is false and sortType is null, keep original order (no sorting)
    
    return sorted;
    // eslint-disable-next-line react-hooks/preserve-manual-memoization -- selectLang from store; compiler flags it as possibly mutated
  }, [resolvedOptions, schemaId, effectiveSourceUrl, fetchedOptions, isLoadingOptions, optionsError, sortType, sortAtoZ, selectLang]);

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

  // Filter options based on search value (resolve labels so translation arrays never get .toLowerCase)
  const filteredOptions = useMemo(() => {
    if (!enableSearch || !searchValue.trim()) {
      return normalizedOptions;
    }
    const searchLower = searchValue.toLowerCase().trim();
    return normalizedOptions.filter((opt) => {
      const labelStr = getOptionDisplayLabel(opt.label ?? opt.id ?? '', selectLang, selectDefaultLang);
      const id = (opt.id || '').toLowerCase();
      return labelStr.toLowerCase().includes(searchLower) || id.includes(searchLower);
    });
  }, [normalizedOptions, searchValue, enableSearch, selectLang, selectDefaultLang]);
  
  const validOptions = useMemo(
    () => filteredOptions.filter((opt) => opt.id && opt.id !== ''),
    [filteredOptions]
  );

  // Group options by category (only if enableGrouping is true)
  const groupedOptions = useMemo(() => {
    if (!enableGrouping) {
      return { groups: {}, ungrouped: validOptions };
    }

    const groups: Record<string, NormalizedOption[]> = {};
    const ungrouped: NormalizedOption[] = [];

    validOptions.forEach((option) => {
      const rawCategory = (option as any).category ?? option.category;
      const category = getOptionDisplayLabel(rawCategory, selectLang, selectDefaultLang);
      if (category && category.trim()) {
        const categoryKey = category.trim();
        if (!groups[categoryKey]) {
          groups[categoryKey] = [];
        }
        groups[categoryKey].push(option);
      } else {
        ungrouped.push(option);
      }
    });

    // Sort groups by title (category name)
    const sortedGroupEntries = Object.entries(groups).sort(([a], [b]) => 
      a.localeCompare(b)
    );

    // Sort items within each group by label
    const sortedGroups: Record<string, NormalizedOption[]> = {};
    sortedGroupEntries.forEach(([category, options]) => {
      sortedGroups[category] = [...options].sort((a, b) => {
        const labelA = getOptionDisplayLabel(a.label ?? a.id ?? '', selectLang, selectDefaultLang).toLowerCase();
        const labelB = getOptionDisplayLabel(b.label ?? b.id ?? '', selectLang, selectDefaultLang).toLowerCase();
        return labelA.localeCompare(labelB);
      });
    });

    return { groups: sortedGroups, ungrouped };
  }, [validOptions, enableGrouping, selectLang, selectDefaultLang]);

  // Calculate fallback select value for default behavior (must be before any conditional returns)
  const fallbackSelectValue = React.useMemo(() => {
    const extracted = extractFirstId(value);
    return extracted === '' || extracted === undefined || extracted === null
      ? undefined
      : String(extracted);
  }, [value]);

  // Check if color is a valid badge variant, custom color, or Tailwind classes
  const isValidBadgeVariant = (color?: string): boolean => {
    if (!color) return false;
    // Use getValidBadgeVariant to check if it's a valid badge variant
    // The function returns the color if valid, or 'outline' as fallback for invalid colors
    const variant = getValidBadgeVariant(color);
    // If the variant matches the input, it's a valid variant (including 'outline' itself)
    return variant === color;
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

  // Resolve option label (handles translation arrays and API localized fields e.g. company name)
  const optionLabel = (option: NormalizedOption) =>
    getOptionDisplayLabel(option.label ?? option.id ?? '', selectLang, selectDefaultLang);

  // Render badge or custom colored badge
  const renderBadgeContent = (option: NormalizedOption) => {
    // Add pointer-events-none to nested elements to ensure clicks propagate to SelectItem
    const pointerEventsNone = 'pointer-events-none';
    const label = optionLabel(option);
    const flagCode = option.flagCode as string | undefined;
    const iconEl = flagCode ? (
      <span
        className={`fi fi-${flagCode.toLowerCase()} inline-block overflow-hidden rounded shrink-0`}
        style={{ width: '1rem', height: '0.75rem' }}
        aria-hidden
      />
    ) : option.icon ? (
      <IconRenderer iconName={option.icon} className="h-4 w-4" />
    ) : null;

    if (!option.color) {
      return (
        <div className={`flex items-center gap-2 ${pointerEventsNone}`}>
          {flagCode ? (
            <span
              className={`fi fi-${flagCode.toLowerCase()} inline-block overflow-hidden rounded shrink-0`}
              style={{ width: '1.25rem', height: '0.9375rem' }}
              aria-hidden
            />
          ) : option.icon ? (
            <IconRenderer iconName={option.icon} className="h-5 w-5" />
          ) : null}
          {label}
        </div>
      );
    }

    // Check badge variant
    if (isValidBadgeVariant(option.color)) {
      return (
        <Badge variant={option.color as any} className={`flex items-center gap-1.5 px-2 py-0.5 ${pointerEventsNone}`}>
          {iconEl}
          {label}
        </Badge>
      );
    }

    // Tailwind classes - render with custom classes
    if (isTailwindClasses(option.color)) {
      // Check if text color is already specified, if not add a default
      const hasTextColor = option.color.includes('text-');
      const defaultTextColor = hasTextColor ? '' : 'text-white';
      
      return (
        <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border ${defaultTextColor} ${option.color} ${pointerEventsNone}`}>
          {iconEl}
          {label}
        </div>
      );
    }

    // Hex color - render with inline styles
    if (isHexColor(option.color)) {
      return (
        <div 
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${pointerEventsNone}`}
          style={{ backgroundColor: option.color, color: '#fff', border: 'none' }}
        >
          {iconEl}
          {label}
        </div>
      );
    }

    // Fallback - just render with color as className
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 ${option.color} ${pointerEventsNone}`}>
        {iconEl}
        {label}
      </div>
    );
  };

  // Show loading state if fetching from schemaId or sourceUrl
  if ((schemaId || effectiveSourceUrl) && isLoadingOptions) {
    return (
      <div className="w-full">
        {renderFieldLabel()}
        <div className={cn(selectClasses, 'flex items-center justify-center text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700')}>
          {getT(TRANSLATION_KEYS.MESSAGE_LOADING_OPTIONS, language, defaultLang)}
        </div>
        {renderErrorMessage(optionsError ?? undefined)}
        {renderErrorMessage(error)}
      </div>
    );
  }

  // Show error state if fetching from schemaId or sourceUrl failed
  if ((schemaId || effectiveSourceUrl) && optionsError) {
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
    // Ensure selectValue is always a scalar string or undefined (never an array or object)
    const selectValue = selectedOption?.id 
      ? String(selectedOption.id) 
      : (normalizedCurrentValue === '' || normalizedCurrentValue === undefined || normalizedCurrentValue === null
          ? undefined 
          : String(normalizedCurrentValue));
    const displayOption = selectedOption ??
      (normalizedValueEntry
        ? {
            ...normalizedValueEntry,
            label: getOptionDisplayLabel(normalizedValueEntry.label ?? normalizedValueEntry.id, selectLang, selectDefaultLang) || normalizedValueEntry.id,
          }
        : undefined);

    const handleRadixChange = (selectedId: string) => {
      // Don't clear search here - let handleOpenChange do it when closing
      // This prevents showing all items again before the select closes
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
      // Close the select immediately after selection
      // Mark that we're manually closing to prevent double-closing
      isManuallyClosingRef.current = true;
      setIsSelectOpen(false);
      setControlledOpen(false);
      // Clear search when closing
      if (enableSearch) {
        setSearchValue('');
      }
      onOpenChange?.(false);
      // Reset the flag after a short delay
      setTimeout(() => {
        isManuallyClosingRef.current = false;
      }, 100);
    };
    
    // Clear search when select closes, focus search input when opens
    const handleOpenChange = (open: boolean) => {
      // If we're manually closing, skip this handler to prevent double-closing
      if (!open && isManuallyClosingRef.current) {
        return;
      }
      // On touch devices, prevent closing if keyboard is opening
      if (!open && isTouchDevice && isKeyboardOpeningRef.current) {
        // Reset the flag after a short delay
        setTimeout(() => {
          isKeyboardOpeningRef.current = false;
        }, 300);
        // Force select to stay open by setting controlled state
        setControlledOpen(true);
        setIsSelectOpen(true);
        return;
      }
      
      // On touch devices, prevent closing if keyboard is closing (don't clear search)
      if (!open && isTouchDevice && isKeyboardClosingRef.current) {
        // Reset the flag after a short delay
        setTimeout(() => {
          isKeyboardClosingRef.current = false;
        }, 300);
        // Force select to stay open by setting controlled state
        // Don't clear search - keyboard closing shouldn't clear it
        setControlledOpen(true);
        setIsSelectOpen(true);
        return;
      }
      
      setIsSelectOpen(open);
      setControlledOpen(open ? true : false); // Use controlled when open, false when closed
      // Only clear search when select is actually closed (not due to keyboard closing)
      if (!open && enableSearch && !isKeyboardClosingRef.current) {
        setSearchValue('');
        isKeyboardOpeningRef.current = false;
        isKeyboardClosingRef.current = false;
      }
      // Only focus on non-touch devices
      // On touch devices, let user manually tap the search input to open keyboard
      if (open && enableSearch && searchInputRef.current && !isTouchDevice) {
        // Use setTimeout to ensure the DOM is ready
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 0);
      }
      onOpenChange?.(open);
    };

    return (
      <div className="w-full">
        {renderFieldLabel()}
        <RadixSelect
          value={selectValue}
          onValueChange={handleRadixChange}
          disabled={disabled}
          open={controlledOpen}
          onOpenChange={handleOpenChange}
          dir={rtl ? 'rtl' : undefined}
          {...props}
        >
          <SelectTrigger className={cn(selectClasses)} id={fieldName}>
            <SelectValue placeholder={fieldPlaceholder}>
              {displayOption && renderBadgeContent(displayOption)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            searchSlot={
              enableSearch ? (
                <div 
                  data-search-container
                  className="px-2 py-2"
                  onKeyDown={(e) => {
                    // Prevent Radix Select from handling keyboard events in search area
                    if (e.target === searchInputRef.current || (e.target as HTMLElement).tagName === 'INPUT') {
                      e.stopPropagation();
                    }
                  }}
                  onKeyUp={(e) => {
                    // Prevent Radix Select from handling keyboard events in search area
                    if (e.target === searchInputRef.current || (e.target as HTMLElement).tagName === 'INPUT') {
                      e.stopPropagation();
                    }
                  }}
                  onTouchStart={(e) => {
                    // Prevent select from closing when touching search area on mobile
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    // Prevent select from closing when touch ends in search area
                    e.stopPropagation();
                  }}
                >
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchValue}
                      onChange={(e) => {
                        setSearchValue(e.target.value);
                      }}
                      onInput={(e) => {
                        // Keep focus on input during typing
                        const target = e.currentTarget;
                        requestAnimationFrame(() => {
                          if (target && document.activeElement !== target) {
                            target.focus();
                          }
                        });
                      }}
                      onKeyDown={(e) => {
                        // Prevent select from closing when typing
                        e.stopPropagation();
                        // Prevent arrow keys from navigating select items when typing
                        if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
                          e.stopPropagation();
                        }
                        // Prevent Escape from closing if there's text (allow clearing instead)
                        if (e.key === 'Escape' && searchValue) {
                          e.stopPropagation();
                          setSearchValue('');
                        }
                      }}
                      onKeyUp={(e) => {
                        // Prevent select from handling keyboard events
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        // Prevent select from closing when clicking search input
                        e.stopPropagation();
                        // Let native focus behavior handle it - don't force focus
                        // This prevents issues with keyboard opening on touch devices
                      }}
                      onMouseDown={(e) => {
                        // Prevent select from closing, but allow default focus behavior
                        e.stopPropagation();
                        // Don't prevent default to allow normal focus
                      }}
                      onTouchStart={(e) => {
                        // Prevent select from closing when touching search input on mobile
                        e.stopPropagation();
                        // Mark that we're interacting with the input (keyboard might open)
                        isKeyboardOpeningRef.current = true;
                        // Don't prevent default - let native focus happen naturally
                        // Focus will happen via native touch behavior
                      }}
                      onTouchEnd={(e) => {
                        // Prevent select from closing when touch ends
                        e.stopPropagation();
                        // Don't prevent default to allow native focus behavior
                        // The input will focus naturally via the touch event
                      }}
                      onFocus={(e) => {
                        // Ensure input stays focused
                        e.stopPropagation();
                        // Scroll input into view when focused (especially important on mobile when keyboard opens)
                        scrollInputIntoView(e.currentTarget, { delay: 150 });
                      }}
                      onBlur={(e) => {
                        // Don't aggressively refocus on blur - let the select stay open
                        // The user can tap the input again if needed
                        // Only prevent event propagation to avoid closing select
                        e.stopPropagation();
                      }}
                      placeholder={placeholderSearchOptions}
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-300 dark:focus:ring-violet-500 focus:border-violet-400 dark:focus:border-violet-500"
                    />
                    {searchValue && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchValue('');
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
                        aria-label="Clear search"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ) : undefined
            }
          >
            {validOptions.length === 0 && searchValue ? (
              <div className="px-2 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                {noOptionsFoundLabel}
              </div>
            ) : enableGrouping && Object.keys(groupedOptions.groups).length > 0 ? (
              <>
                {/* Render ungrouped options first */}
                {groupedOptions.ungrouped.length > 0 && (
                  <>
                    {groupedOptions.ungrouped.map((option, index) => (
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
                  </>
                )}
                {/* Render grouped options - sorted by category title */}
                {Object.entries(groupedOptions.groups).map(([category, options], groupIndex) => (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      duration: 0.25,
                      delay: Math.min(
                        (groupedOptions.ungrouped.length + groupIndex * 10) * UI_PARAMS.CARD_INDEX_DELAY.STEP,
                        UI_PARAMS.CARD_INDEX_DELAY.SKELETON_MAX
                      ),
                      ease: 'easeOut',
                    }}
                  >
                    <SelectGroup>
                      <SelectLabel icon={<IconRenderer iconName="Folder" className="h-5 w-5" />}>{category}</SelectLabel>
                      {options.map((option, index) => (
                        <motion.div
                          key={option.id ?? `${category}-${index}`}
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            duration: 0.2,
                            delay: Math.min(
                              (groupedOptions.ungrouped.length + groupIndex * 10 + index) * UI_PARAMS.CARD_INDEX_DELAY.STEP,
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
                    </SelectGroup>
                  </motion.div>
                ))}
              </>
            ) : (
              /* Render all options directly when grouping is disabled or no categories */
              validOptions.map((option, index) => (
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
              ))
            )}
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
      <RadixSelect value={fallbackSelectValue} onValueChange={onValueChange} dir={rtl ? 'rtl' : undefined} {...props}>
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
