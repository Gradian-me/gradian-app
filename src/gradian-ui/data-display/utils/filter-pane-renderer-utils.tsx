'use client';

/**
 * Renders operator selector + value input for a single filter row based on field component type.
 * Uses filter-strategy for operators; value UI is type-specific (TextInput, NumberInput, FormElementFactory, Select).
 */

import React, { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { FormField } from '@/gradian-ui/schema-manager/types/form-schema';
import { getFilterStrategy, getComponentTypeFromField } from './filter-strategy';
import { TextInput } from '@/gradian-ui/form-builder/form-elements/components/TextInput';
import { NumberInput } from '@/gradian-ui/form-builder/form-elements/components/NumberInput';
import { FormElementFactory } from '@/gradian-ui/form-builder/form-elements/components/FormElementFactory';
import { DatePickerCalendar } from '@/gradian-ui/form-builder/form-elements/components/DatePickerCalendar';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language.store';
import { getDefaultLanguage, getT } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

const BOOLEAN_OPTIONS = [
  { id: 'false', label: 'False' },
  { id: 'true', label: 'True' },
] as const;

export interface FilterPaneRendererProps {
  field: FormField | null;
  operator: string;
  value: unknown;
  onOperatorChange: (operator: string) => void;
  onValueChange: (value: unknown) => void;
  disabled?: boolean;
  className?: string;
}

const NO_VALUE_OPERATORS = new Set(['is_empty', 'is_not_empty']);

/** Shared width for number and date inputs in filter pane so they align and are large enough. */
const FILTER_PANE_INPUT_CLASS = 'min-w-44 w-44 min-h-9';

/** Number range value shape for between / exact. */
export interface NumberRangeValue {
  from?: number;
  to?: number;
}

/** Date range value shape for between / exact (ISO date strings). */
export interface DateRangeValue {
  from?: string;
  to?: string;
}

function parseNumberRange(value: unknown): NumberRangeValue {
  if (value == null) return {};
  if (typeof value === 'object' && 'from' in value && 'to' in value) {
    return {
      from: typeof (value as NumberRangeValue).from === 'number' ? (value as NumberRangeValue).from : undefined,
      to: typeof (value as NumberRangeValue).to === 'number' ? (value as NumberRangeValue).to : undefined,
    };
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isNaN(n)) return { from: n, to: n };
  return {};
}

export function FilterPaneRenderer({
  field,
  operator,
  value,
  onOperatorChange,
  onValueChange,
  disabled = false,
  className,
}: FilterPaneRendererProps) {
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const componentType = useMemo(
    () => (field ? getComponentTypeFromField(field) : 'text'),
    [field]
  );
  const strategy = useMemo(() => getFilterStrategy(componentType), [componentType]);

  const numberLike = ['number', 'slider', 'rating'].includes(componentType);
  const dateLike = ['date', 'date-input', 'date-picker-calendar', 'datetime', 'datetime-local', 'datetime-input', 'datetime-picker-calendar'].includes(componentType);
  const selectLike = [
    'select',
    'multi-select-legacy',
    'multi-select',
    'multiselect',
    'checkbox-list',
    'toggle-group',
    'radio',
    'picker',
    'popup-picker',
    'tag-input',
    'tag',
    'language-selector',
    'language',
  ].includes(componentType);
  const booleanLike = ['checkbox', 'toggle', 'switch'].includes(componentType);

  // For relation-based pickers in filters (status, assignedTo, etc.), always allow multiselect
  // so filter values are arrays of {id,label,color,icon} like in forms.
  const filterFieldConfig = useMemo(() => {
    if (!field) return field;
    const base: any = { ...field, label: '' };
    const isRelationPicker = ['picker', 'popup-picker'].includes(componentType);
    if (isRelationPicker) {
      return {
        ...base,
        allowMultiselect: true,
        metadata: {
          ...(field as any).metadata,
          allowMultiselect: true,
        },
      };
    }
    return base;
  }, [field, componentType]);

  const useExactMatchCheckbox = numberLike || dateLike || (!selectLike && !booleanLike);

  const labelExactMatch = getT(TRANSLATION_KEYS.LABEL_EXACT_VALUE, language, defaultLang);

  return (
    <div className={cn('flex flex-row flex-wrap items-center gap-2 sm:gap-3 w-full min-w-0 max-sm:flex-col max-sm:items-stretch', className)}>
      {useExactMatchCheckbox && (
        <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap shrink-0">
          <Checkbox
            checked={operator === 'eq'}
            onCheckedChange={(c) => onOperatorChange(c === true ? 'eq' : (numberLike || dateLike ? 'between' : 'contains'))}
            disabled={disabled}
          />
          {labelExactMatch}
        </label>
      )}
      {!useExactMatchCheckbox && (selectLike || booleanLike) && (
        <Select
          value={operator}
          onValueChange={onOperatorChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs shrink-0">
            <SelectValue placeholder={getT(TRANSLATION_KEYS.PLACEHOLDER_OPERATOR, language, defaultLang)} />
          </SelectTrigger>
          <SelectContent>
            {strategy.operators.map((op) => (
              <SelectItem key={op.id} value={op.id}>
                {op.symbol != null ? `${op.symbol} ` : ''}{op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {numberLike && (
        <NumberFilterValue
          value={value}
          onChange={onValueChange}
          disabled={disabled}
          operator={operator}
          onOperatorChange={onOperatorChange}
          field={field}
        />
      )}
      {dateLike && (
        <DateFilterValue
          value={value}
          onChange={onValueChange}
          disabled={disabled}
          operator={operator}
          onOperatorChange={onOperatorChange}
          field={field}
        />
      )}
      {!numberLike && !dateLike && selectLike && field && (
        <div className="flex-1 min-w-32">
          <FormElementFactory
            field={filterFieldConfig}
            value={value}
            onChange={onValueChange}
            disabled={disabled}
          />
        </div>
      )}
      {!numberLike && !dateLike && booleanLike && (
        <BooleanFilterValue
          value={value}
          onChange={onValueChange}
          disabled={disabled}
          placeholderOperator={getT(TRANSLATION_KEYS.PLACEHOLDER_SELECT, language, defaultLang)}
        />
      )}
      {!numberLike && !dateLike && !selectLike && !booleanLike && (
        <div className="flex-1 min-w-32">
          <TextInput
            config={field ? { ...field, label: '' } : { id: '', name: '', label: '', sectionId: '', component: 'text' }}
            value={typeof value === 'string' ? value : value != null ? String(value) : ''}
            onChange={(v) => onValueChange(v ?? '')}
            disabled={disabled}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}

function NumberFilterValue({
  value,
  onChange,
  disabled,
  operator,
  onOperatorChange,
  field,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
  operator: string;
  onOperatorChange: (op: string) => void;
  field: FormField | null;
}) {
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const labelFrom = getT(TRANSLATION_KEYS.LABEL_FROM, language, defaultLang);
  const labelTo = getT(TRANSLATION_KEYS.LABEL_TO, language, defaultLang);

  const range = parseNumberRange(value);
  const isBetween = operator === 'between';
  const exact = !isBetween;

  const config = useMemo(
    () =>
      field
        ? {
            ...field,
            label: '', // Row already shows translated field label; avoid duplicate
            useThousandSeparator: false, // avoid blur/format issues in filter pane
            componentTypeConfig: (field as any).componentTypeConfig,
            validation: (field as any).validation,
          }
        : { id: '', name: '', label: '', sectionId: '', component: 'number' as const },
    [field]
  );

  const handleFromChange = (v: string | number) => {
    const n = typeof v === 'number' ? v : v === '' ? undefined : Number(v);
    if (exact) {
      onChange(n != null && !Number.isNaN(n) ? { from: n, to: n } : undefined);
    } else {
      const nextRange = { ...range, from: n };
      onChange(nextRange);
      if (nextRange.from != null && !Number.isNaN(nextRange.from) && nextRange.to != null && !Number.isNaN(nextRange.to) && operator !== 'between') {
        onOperatorChange('between');
      }
    }
  };

  const handleToChange = (v: string | number) => {
    const n = typeof v === 'number' ? v : v === '' ? undefined : Number(v);
    const nextRange = { ...range, to: n };
    onChange(nextRange);
    if (nextRange.from != null && !Number.isNaN(nextRange.from) && nextRange.to != null && !Number.isNaN(nextRange.to) && operator !== 'between') {
      onOperatorChange('between');
    }
  };

  const fromVal = range.from ?? '';
  const toVal = range.to ?? '';

  return (
    <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3 max-sm:flex-col max-sm:items-stretch">
      <div className="flex flex-row items-center gap-1.5 min-w-0 shrink-0">
        {!exact && <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{labelFrom}</span>}
        <NumberInput
          key="number-from"
          config={config}
          value={fromVal}
          onChange={handleFromChange}
          disabled={disabled}
          className={FILTER_PANE_INPUT_CLASS}
        />
      </div>
      {isBetween && (
        <>
          <span className="text-xs text-gray-500">–</span>
          <div className="flex flex-row items-center gap-1.5 min-w-0 shrink-0">
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{labelTo}</span>
            <NumberInput
              key="number-to"
              config={config}
              value={toVal}
              onChange={handleToChange}
              disabled={disabled}
              className={FILTER_PANE_INPUT_CLASS}
            />
          </div>
        </>
      )}
      {!isBetween && !exact && (
        <div className="flex flex-row items-center gap-1.5 min-w-0 shrink-0">
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{labelTo}</span>
          <NumberInput
            key="number-to-alt"
            config={config}
            value={toVal}
            onChange={handleToChange}
            disabled={disabled}
            className={FILTER_PANE_INPUT_CLASS}
          />
        </div>
      )}
    </div>
  );
}

function parseDateRange(value: unknown): DateRangeValue {
  if (value == null) return {};
  if (typeof value === 'object' && 'from' in value && 'to' in value) {
    const v = value as { from?: string; to?: string };
    return { from: typeof v.from === 'string' ? v.from : undefined, to: typeof v.to === 'string' ? v.to : undefined };
  }
  const s = typeof value === 'string' ? value : String(value ?? '');
  if (s) return { from: s, to: s };
  return {};
}

function DateFilterValue({
  value,
  onChange,
  disabled,
  operator,
  onOperatorChange,
  field,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
  operator: string;
  onOperatorChange: (op: string) => void;
  field: FormField | null;
}) {
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const labelFrom = getT(TRANSLATION_KEYS.LABEL_FROM, language, defaultLang);
  const labelTo = getT(TRANSLATION_KEYS.LABEL_TO, language, defaultLang);

  const range = parseDateRange(value);
  const isBetween = operator === 'between';
  const exact = !isBetween;
  const componentType = field ? getComponentTypeFromField(field) : 'date';
  const isDateTime = ['datetime', 'datetime-local', 'datetime-input', 'datetime-picker-calendar'].includes(componentType);

  const fromDate = range.from ? (() => { const d = new Date(range.from); return isNaN(d.getTime()) ? undefined : d; })() : undefined;
  const toDate = range.to ? (() => { const d = new Date(range.to); return isNaN(d.getTime()) ? undefined : d; })() : undefined;

  const handleFromChange = (d: Date | undefined) => {
    const str = d ? (isDateTime ? d.toISOString() : d.toISOString().slice(0, 10)) : undefined;
    if (!isBetween) {
      onChange(str != null ? { from: str, to: str } : undefined);
    } else {
      const nextRange = { ...range, from: str };
      onChange(nextRange);
      if (nextRange.from && nextRange.to && operator !== 'between') {
        onOperatorChange('between');
      }
    }
  };

  const handleToChange = (d: Date | undefined) => {
    const str = d ? (isDateTime ? d.toISOString() : d.toISOString().slice(0, 10)) : undefined;
    const nextRange = { ...range, to: str };
    onChange(nextRange);
    if (nextRange.from && nextRange.to && operator !== 'between') {
      onOperatorChange('between');
    }
  };

  return (
    <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3 max-sm:flex-col max-sm:items-stretch">
      <div className="flex flex-row items-center gap-1.5 min-w-0 shrink-0">
        {!exact && <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{labelFrom}</span>}
        <DatePickerCalendar
          key="date-from"
          mode="single"
          timeInput={isDateTime}
          showApply={isDateTime}
          value={fromDate}
          onChange={(v) => handleFromChange(v instanceof Date ? v : undefined)}
          disabled={disabled}
          showPresets={true}
          allowChangeCalendar={true}
          className={FILTER_PANE_INPUT_CLASS}
        />
      </div>
      {isBetween && (
        <>
          <span className="text-xs text-gray-500">–</span>
          <div className="flex flex-row items-center gap-1.5 min-w-0 shrink-0">
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{labelTo}</span>
            <DatePickerCalendar
              key="date-to"
              mode="single"
              timeInput={isDateTime}
              showApply={isDateTime}
              value={toDate}
              onChange={(v) => handleToChange(v instanceof Date ? v : undefined)}
              disabled={disabled}
              showPresets={true}
              allowChangeCalendar={true}
              className={FILTER_PANE_INPUT_CLASS}
            />
          </div>
        </>
      )}
    </div>
  );
}

function BooleanFilterValue({
  value,
  onChange,
  disabled,
  placeholderOperator,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
  placeholderOperator: string;
}) {
  const normalized =
    value === true || value === 'true'
      ? 'true'
      : value === false || value === 'false'
        ? 'false'
        : '';
  return (
    <Select
      value={normalized || ''}
      onValueChange={(v) => {
        if (v === 'true') onChange(true);
        else if (v === 'false') onChange(false);
        else onChange(undefined);
      }}
      disabled={disabled}
    >
      <SelectTrigger className="h-8 min-w-[100px] text-xs">
        <SelectValue placeholder={placeholderOperator} />
      </SelectTrigger>
      <SelectContent>
        {BOOLEAN_OPTIONS.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
