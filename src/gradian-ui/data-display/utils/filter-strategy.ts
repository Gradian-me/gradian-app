/**
 * Filter strategy dictionary for DataFilterDialog.
 * Maps component types to operators and default operator; value rendering is in filter-pane-renderer-utils.
 */

import type { FilterOperatorOption, FilterStrategy } from '../types';

const TEXT_OPERATORS: FilterOperatorOption[] = [
  { id: 'eq', label: 'Equals', symbol: '=' },
  { id: 'ne', label: 'Not equals', symbol: '≠' },
  { id: 'contains', label: 'Contains' },
  { id: 'startsWith', label: 'Starts with' },
  { id: 'endsWith', label: 'Ends with' },
  { id: 'is_empty', label: 'Is empty' },
  { id: 'is_not_empty', label: 'Is not empty' },
];

const NUMBER_OPERATORS: FilterOperatorOption[] = [
  { id: 'eq', label: 'Equals', symbol: '=' },
  { id: 'ne', label: 'Not equals', symbol: '≠' },
  { id: 'gt', label: 'Greater than', symbol: '>' },
  { id: 'gte', label: 'Greater or equal', symbol: '≥' },
  { id: 'lt', label: 'Less than', symbol: '<' },
  { id: 'lte', label: 'Less or equal', symbol: '≤' },
  { id: 'between', label: 'Between' },
];

const DATE_OPERATORS: FilterOperatorOption[] = [
  { id: 'eq', label: 'Equals', symbol: '=' },
  { id: 'ne', label: 'Not equals', symbol: '≠' },
  { id: 'gt', label: 'After', symbol: '>' },
  { id: 'gte', label: 'On or after', symbol: '≥' },
  { id: 'lt', label: 'Before', symbol: '<' },
  { id: 'lte', label: 'On or before', symbol: '≤' },
  { id: 'between', label: 'Between' },
];

const SELECT_OPERATORS: FilterOperatorOption[] = [
  { id: 'eq', label: 'Equals', symbol: '=' },
  { id: 'ne', label: 'Not equals', symbol: '≠' },
  { id: 'in', label: 'In list' },
  { id: 'not_in', label: 'Not in list' },
];

const BOOLEAN_OPERATORS: FilterOperatorOption[] = [
  { id: 'eq', label: 'Equals', symbol: '=' },
  { id: 'ne', label: 'Not equals', symbol: '≠' },
];

const TEXT_STRATEGY: FilterStrategy = {
  operators: TEXT_OPERATORS,
  defaultOperator: 'contains', // exact match checkbox unchecked by default
};

const NUMBER_STRATEGY: FilterStrategy = {
  operators: NUMBER_OPERATORS,
  defaultOperator: 'between', // exact match checkbox unchecked by default
};

const DATE_STRATEGY: FilterStrategy = {
  operators: DATE_OPERATORS,
  defaultOperator: 'between', // exact match checkbox unchecked by default
};

const SELECT_STRATEGY: FilterStrategy = {
  operators: SELECT_OPERATORS,
  defaultOperator: 'eq',
};

const BOOLEAN_STRATEGY: FilterStrategy = {
  operators: BOOLEAN_OPERATORS,
  defaultOperator: 'eq',
};

/** Mutable strategy map. Use registerFilterStrategy to add or override. */
const FILTER_STRATEGY_MAP = new Map<string, FilterStrategy>();

function registerDefaults() {
  const textLike = [
    'text',
    'email',
    'textarea',
    'url',
    'phone',
    'tel',
    'name',
    'json',
    'markdown',
    'markdown-input',
    'list-input',
    'list',
    'checklist',
    'formula',
  ];
  textLike.forEach((t) => FILTER_STRATEGY_MAP.set(t, TEXT_STRATEGY));

  const numberLike = ['number', 'slider', 'rating'];
  numberLike.forEach((t) => FILTER_STRATEGY_MAP.set(t, NUMBER_STRATEGY));

  const dateLike = ['date', 'date-input', 'date-picker-calendar', 'datetime', 'datetime-local', 'datetime-input', 'datetime-picker-calendar'];
  dateLike.forEach((t) => FILTER_STRATEGY_MAP.set(t, DATE_STRATEGY));

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
  ];
  selectLike.forEach((t) => FILTER_STRATEGY_MAP.set(t, SELECT_STRATEGY));

  const booleanLike = ['checkbox', 'toggle', 'switch'];
  booleanLike.forEach((t) => FILTER_STRATEGY_MAP.set(t, BOOLEAN_STRATEGY));
}
registerDefaults();

/**
 * Get filter strategy for a component type. Falls back to text strategy if unknown.
 */
export function getFilterStrategy(componentType: string): FilterStrategy {
  const strategy = FILTER_STRATEGY_MAP.get(componentType);
  return strategy ?? TEXT_STRATEGY;
}

/**
 * Register or override a filter strategy for a component type.
 */
export function registerFilterStrategy(componentType: string, strategy: FilterStrategy): void {
  FILTER_STRATEGY_MAP.set(componentType, strategy);
}

/**
 * Resolve component type from a form field (field.component or field.type).
 */
export function getComponentTypeFromField(field: { component?: string; type?: string }): string {
  const raw = (field as { component?: string }).component ?? (field as { type?: string }).type ?? 'text';
  return String(raw);
}
