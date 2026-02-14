import type { ComponentConfig, ValidationRule, ChartDataPoint } from '../types';
import { TRANSLATION_KEYS } from '../constants/translations';
import { getGlobalTranslator } from './global-translator';

export interface ValidateFieldOptions {
  /** When provided, error messages are translated using t(translationKey) */
  t?: (key: string) => string;
}

/**
 * Replaces {key} placeholders in a message string.
 */
function replaceParams(msg: string, params: Record<string, number | string>): string {
  let out = msg;
  for (const [key, val] of Object.entries(params)) {
    out = out.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
  }
  return out;
}

/**
 * Generates a unique ID for components
 */
export const generateId = (prefix: string = 'gradian'): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Merges class names with proper spacing
 */
export const cn = (...classes: (string | undefined | null | false | 0)[]): string => {
  return classes
    .filter(c => c !== undefined && c !== null && c !== false && c !== 0)
    .join(' ');
};

/**
 * Validates form field value based on validation rules.
 * Pass options.t (e.g. (key) => getT(key, language, defaultLang)) to get translated error messages.
 */
export const validateField = (
  value: any,
  rules: ValidationRule,
  options?: ValidateFieldOptions
): { isValid: boolean; error?: string } => {
  const t = options?.t ?? getGlobalTranslator();
  const err = (key: string, params?: Record<string, number | string>) => {
    if (t) {
      const msg = t(key);
      return params ? replaceParams(msg, params) : msg;
    }
    return undefined;
  };

  if (rules.required) {
    const isEmpty = value === undefined ||
                    value === null ||
                    value === '' ||
                    (Array.isArray(value) && value.length === 0) ||
                    (!Array.isArray(value) && value.toString().trim() === '');
    if (isEmpty) {
      return { isValid: false, error: t ? (err(TRANSLATION_KEYS.MESSAGE_FIELD_REQUIRED) ?? 'This field is required') : 'This field is required' };
    }
  }

  if (value && rules.minLength && value.toString().length < rules.minLength) {
    const msg = t ? (err(TRANSLATION_KEYS.MESSAGE_MIN_LENGTH, { min: rules.minLength }) ?? `Minimum length is ${rules.minLength}`) : `Minimum length is ${rules.minLength}`;
    return { isValid: false, error: msg };
  }

  if (value && rules.maxLength && value.toString().length > rules.maxLength) {
    const msg = t ? (err(TRANSLATION_KEYS.MESSAGE_MAX_LENGTH, { max: rules.maxLength }) ?? `Maximum length is ${rules.maxLength}`) : `Maximum length is ${rules.maxLength}`;
    return { isValid: false, error: msg };
  }

  if (value && rules.min !== undefined) {
    const numValue = Number(value);
    if (isNaN(numValue) || numValue < rules.min) {
      const msg = t ? (err(TRANSLATION_KEYS.MESSAGE_MIN_VALUE, { min: rules.min }) ?? `Minimum value is ${rules.min}`) : `Minimum value is ${rules.min}`;
      return { isValid: false, error: msg };
    }
  }

  if (value && rules.max !== undefined) {
    const numValue = Number(value);
    if (isNaN(numValue) || numValue > rules.max) {
      const msg = t ? (err(TRANSLATION_KEYS.MESSAGE_MAX_VALUE, { max: rules.max }) ?? `Maximum value is ${rules.max}`) : `Maximum value is ${rules.max}`;
      return { isValid: false, error: msg };
    }
  }

  if (value && rules.pattern) {
    const pattern = toRegExp(rules.pattern);

    if (pattern && typeof pattern.test === 'function') {
      if (Array.isArray(value)) {
        for (const item of value) {
          const itemLabel = typeof item === 'string' ? item : (item?.label || item?.value || String(item));
          const trimmedLabel = itemLabel ? String(itemLabel).trim() : '';
          if (trimmedLabel && !pattern.test(trimmedLabel)) {
            return { isValid: false, error: t ? (err(TRANSLATION_KEYS.MESSAGE_INVALID_FORMAT) ?? 'Invalid format') : 'Invalid format' };
          }
        }
      } else {
        const testValue = typeof value === 'string' ? value.trim() : value.toString();
        if (!pattern.test(testValue)) {
          return { isValid: false, error: t ? (err(TRANSLATION_KEYS.MESSAGE_INVALID_FORMAT) ?? 'Invalid format') : 'Invalid format' };
        }
      }
    }
  }

  if (value && rules.custom) {
    const result = rules.custom(value);
    if (typeof result === 'object' && result !== null) {
      return result as { isValid: boolean; error?: string };
    }
    if (typeof result === 'string') {
      return { isValid: false, error: result };
    }
    if (!result) {
      return { isValid: false, error: t ? (err(TRANSLATION_KEYS.MESSAGE_INVALID_VALUE) ?? 'Invalid value') : 'Invalid value' };
    }
  }

  return { isValid: true };
};

function toRegExp(pattern: unknown): RegExp | null {
  if (!pattern) {
    return null;
  }

  if (pattern instanceof RegExp) {
    return pattern;
  }

  if (typeof pattern === 'string') {
    try {
      return new RegExp(pattern);
    } catch {
      return null;
    }
  }

  if (typeof pattern === 'object') {
    const maybePattern = pattern as Record<string, unknown>;
    const source =
      typeof maybePattern.source === 'string'
        ? maybePattern.source
        : typeof maybePattern.pattern === 'string'
          ? maybePattern.pattern
          : typeof maybePattern.value === 'string'
            ? maybePattern.value
            : undefined;
    if (!source) {
      return null;
    }
    const flags = typeof maybePattern.flags === 'string' ? maybePattern.flags : undefined;
    try {
      return new RegExp(source, flags);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Formats number with proper locale formatting
 */
export const formatNumber = (value: number, options?: Intl.NumberFormatOptions): string => {
  const defaultOptions: Intl.NumberFormatOptions = {
    useGrouping: true,
    ...options,
  };
  return new Intl.NumberFormat('en-US', defaultOptions).format(value);
};

/**
 * Formats currency with proper locale formatting
 */
export const formatCurrency = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
};

/**
 * Formats date with proper locale formatting
 */
export const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
};

/**
 * Debounces function calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttles function calls
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Deep clones an object
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (Array.isArray(obj)) return obj.map(item => deepClone(item)) as any;
  if (typeof obj === 'object') {
    const clonedObj = {} as any;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clonedObj[key] = deepClone((obj as any)[key]);
      }
    }
    return clonedObj;
  }
  return obj;
};

/**
 * Calculates chart data statistics
 */
export const calculateChartStats = (data: ChartDataPoint[]) => {
  const values = data.map(d => d.value);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);

  return {
    sum,
    avg: Number(avg.toFixed(2)),
    max,
    min,
    count: values.length,
  };
};

/**
 * Generates color palette for charts
 */
export const generateColorPalette = (count: number, baseColor?: string): string[] => {
  const defaultColors = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#10B981', // green
    '#F59E0B', // yellow
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
  ];

  if (count <= defaultColors.length && !baseColor) {
    return defaultColors.slice(0, count);
  }

  const colors = baseColor ? [baseColor] : [...defaultColors];
  for (let i = colors.length; i < count; i++) {
    const hue = (i * 137.5) % 360; // Golden angle approximation
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }

  return colors.slice(0, count);
};

/**
 * Validates component configuration
 */
export const validateComponentConfig = (
  config: ComponentConfig
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.id) {
    errors.push('Component config must have an id');
  }

  if (!config.name) {
    errors.push('Component config must have a name');
  }

  if (!config.type) {
    errors.push('Component config must have a type');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Recursively finds component by id in config tree
 */
export const findComponentById = (
  config: ComponentConfig,
  id: string
): ComponentConfig | null => {
  if (config.id === id) {
    return config;
  }

  if (config.children) {
    for (const child of config.children) {
      const found = findComponentById(child, id);
      if (found) return found;
    }
  }

  return null;
};

/**
 * Converts component config to React element props
 */
export const configToProps = (config: ComponentConfig): Record<string, any> => {
  const { id, name, type, children, metadata, ...props } = config;
  return {
    ...props,
    'data-component-id': id,
    'data-component-name': name,
    'data-component-type': type,
  };
};

// Re-export structured utility modules for consumers expecting barrel exports
export * from './api';
export * from './validation';
export * from './logging-custom';
export * from './date-utils';
export * from './language-availables';
export * from './time-utils';
export * from './dom-utils';
export * from './icon-renderer';
export * from './number-formatter';
export * from './highlighter';
export * from './sort-utils';
export * from './localization';
export * from './translation-utils';
export * from './url-utils';
export * from './print-management';
// system-token.util is server-only - import directly: '@/gradian-ui/shared/utils/system-token.util'
