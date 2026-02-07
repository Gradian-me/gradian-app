import React from 'react';
import { Rating } from '@/gradian-ui/form-builder/form-elements';
import { normalizeOptionArray } from '@/gradian-ui/form-builder/form-elements/utils/option-normalizer';

export const getDisplayStrings = (value: any): string[] => {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  const normalizedOptions = normalizeOptionArray(value);
  if (normalizedOptions.length > 0) {
    return normalizedOptions
      .map((opt) => opt.label ?? opt.name ?? opt.title ?? opt.value ?? opt.id)
      .filter((entry): entry is string | number => entry !== undefined && entry !== null)
      .map((entry) => String(entry));
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (entry === null || entry === undefined) {
          return '';
        }
        if (typeof entry === 'object') {
          return (
            entry.label ??
            entry.name ??
            entry.title ??
            entry.value ??
            entry.id ??
            ''
          );
        }
        return String(entry);
      })
      .filter((entry): entry is string => Boolean(entry && entry.length > 0));
  }

  if (typeof value === 'object') {
    const fallback =
      (value as any).label ??
      (value as any).name ??
      (value as any).title ??
      (value as any).value ??
      (value as any).id;
    if (fallback !== undefined && fallback !== null) {
      return [String(fallback)];
    }
  }

  if (value !== null && value !== undefined && value !== '') {
    return [String(value)];
  }

  return [];
};

export const getPrimaryDisplayString = (value: any): string | null => {
  const strings = getDisplayStrings(value);
  return strings.length > 0 ? strings[0] : null;
};

export const getJoinedDisplayString = (
  value: any,
  separator = ', '
): string | null => {
  const strings = getDisplayStrings(value);
  if (strings.length === 0) {
    return null;
  }
  return strings.join(separator);
};

export const hasDisplayValue = (value: any): boolean => {
  const strings = getDisplayStrings(value);
  return strings.some((str) => str.trim() !== '');
};

interface PickerDisplayContext {
  row?: any;
  data?: any;
}

export const getPickerDisplayValue = (
  field: any,
  value: any,
  context: PickerDisplayContext = {}
): string | null => {
  if (!field) {
    return getPrimaryDisplayString(value);
  }

  const normalizedOptions = normalizeOptionArray(value);
  if (normalizedOptions.length > 0) {
    const primaryOption = normalizedOptions[0];
    const label =
      primaryOption.label ??
      primaryOption.name ??
      primaryOption.title ??
      primaryOption.value ??
      primaryOption.id;
    if (label !== undefined && label !== null) {
      return String(label);
    }
  }

  if (value && typeof value === 'object') {
    if (value._resolvedLabel) {
      return String(value._resolvedLabel);
    }
    if (value.label) {
      return String(value.label);
    }
    if (value.name) {
      return String(value.name);
    }
    if (value.title) {
      return String(value.title);
    }
    if (value.id) {
      return String(value.id);
    }
  }

  const resolvedKey = `_${field.name}_resolved`;
  const source = context.row ?? context.data;
  if (source && source[resolvedKey]) {
    const resolvedData = source[resolvedKey];
    const displayValue =
      resolvedData._resolvedLabel ??
      resolvedData.name ??
      resolvedData.title ??
      resolvedData.value ??
      resolvedData.id;
    if (displayValue !== undefined && displayValue !== null) {
      return String(displayValue);
    }
  }

  if (value !== null && value !== undefined && value !== '') {
    return String(value);
  }

  return null;
};

interface RenderRatingOptions {
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
  /** When true, rating is view-only (no interaction, cursor default). */
  readOnly?: boolean;
}

export const renderRatingValue = (
  value: any,
  options: RenderRatingOptions = {}
): React.ReactNode => {
  return (
    <Rating
      value={value}
      size={options.size ?? 'sm'}
      showValue={options.showValue ?? false}
      className={options.className}
      disabled={options.readOnly}
    />
  );
};


