'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ulid } from 'ulid';
import type { ComponentHookData, ComponentConfig } from '../types';

/**
 * Hook for managing async component data with loading and error states
 */
export const useComponentData = <T>(
  dataFetcher: () => Promise<T>,
  dependencies: any[] = []
): ComponentHookData & { data: T | null } => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await dataFetcher();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};

/**
 * Hook for managing complex form state with validation and repeating sections
 */
export const useFormState = <T extends Record<string, any>>(
  initialValues: T,
  validationRules?: Partial<Record<keyof T, any>>
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const setValue = useCallback((field: keyof T, value: any) => {
    const fieldStr = String(field);
    const match = fieldStr.match(/^(.+)\[(\d+)\]\.(.+)$/);

    if (match) {
      const [, sectionId, itemIndex, nestedField] = match;
      const index = parseInt(itemIndex);

      setValues(prev => {
        const currentArray = (prev[sectionId as keyof T] as any) || [];
        const newArray = [...currentArray];

        while (newArray.length <= index) {
          newArray.push({ id: ulid() });
        }

        newArray[index] = {
          ...newArray[index],
          [nestedField]: value,
        };

        return {
          ...prev,
          [sectionId]: newArray,
        } as T;
      });

      const errorKey = field;
      if (errors[errorKey]) {
        setErrors(prev => ({ ...prev, [errorKey]: undefined }));
      }
    } else {
      setValues(prev => ({ ...prev, [field]: value }));

      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: undefined }));
      }
    }
  }, [errors]);

  const setFieldTouched = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const validateField = useCallback((field: keyof T) => {
    if (!validationRules?.[field]) return true;

    const rule = validationRules[field];
    const value = values[field];

    if (rule.required && (!value || value.toString().trim() === '')) {
      setErrors(prev => ({ ...prev, [field]: 'This field is required' }));
      return false;
    }

    if (value && rule.minLength && value.toString().length < rule.minLength) {
      setErrors(prev => ({ ...prev, [field]: `Minimum length is ${rule.minLength}` }));
      return false;
    }

    if (value && rule.maxLength && value.toString().length > rule.maxLength) {
      setErrors(prev => ({ ...prev, [field]: `Maximum length is ${rule.maxLength}` }));
      return false;
    }

    if (value && rule.min !== undefined) {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < rule.min) {
        setErrors(prev => ({ ...prev, [field]: `Minimum value is ${rule.min}` }));
        return false;
      }
    }

    if (value && rule.max !== undefined) {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue > rule.max) {
        setErrors(prev => ({ ...prev, [field]: `Maximum value is ${rule.max}` }));
        return false;
      }
    }

    if (value && rule.pattern) {
      const pattern = toRegExp(rule.pattern);

      if (pattern && typeof pattern.test === 'function' && !pattern.test(value.toString())) {
        setErrors(prev => ({ ...prev, [field]: 'Invalid format' }));
        return false;
      }
    }

    if (value && rule.custom) {
      const result = rule.custom(value);
      if (typeof result === 'object' && result !== null) {
        const { isValid, error } = result as { isValid: boolean; error?: string };
        if (!isValid) {
          setErrors(prev => ({ ...prev, [field]: error || 'Invalid value' }));
          return false;
        }
      } else if (typeof result === 'string') {
        setErrors(prev => ({ ...prev, [field]: result }));
        return false;
      } else if (!result) {
        setErrors(prev => ({ ...prev, [field]: 'Invalid value' }));
        return false;
      }
    }

    setErrors(prev => ({ ...prev, [field]: undefined }));
    return true;
  }, [values, validationRules]);

  const validateForm = useCallback(() => {
    if (!validationRules) return true;

    let isValid = true;
    Object.keys(validationRules).forEach(field => {
      const fieldKey = field as keyof T;
      if (!validateField(fieldKey)) {
        isValid = false;
      }
    });

    return isValid;
  }, [validateField, validationRules]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const isFieldValid = useCallback((field: keyof T) => {
    return !errors[field] && (touched[field] || values[field] !== initialValues[field]);
  }, [errors, touched, values, initialValues]);

  const isFormValid = useCallback(() => {
    return Object.keys(errors).length === 0 && validateForm();
  }, [errors, validateForm]);

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateField,
    validateForm,
    reset,
    isFieldValid,
    isFormValid,
  };
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
 * Hook for managing visibility with animation helpers
 */
export const useVisibility = (initialVisible: boolean = false) => {
  const [isVisible, setIsVisible] = useState(initialVisible);
  const [isAnimating, setIsAnimating] = useState(false);

  const show = useCallback(() => {
    setIsVisible(true);
    setIsAnimating(true);
  }, []);

  const hide = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsAnimating(false);
    }, 300);
  }, []);

  const toggle = useCallback(() => {
    if (isVisible) {
      hide();
    } else {
      show();
    }
  }, [isVisible, show, hide]);

  return {
    isVisible,
    isAnimating,
    show,
    hide,
    toggle,
  };
};

/**
 * Hook for tracking focus state of a DOM element
 */
export const useFocus = () => {
  const [isFocused, setIsFocused] = useState(false);
  const ref = useRef<HTMLElement>(null);

  const focus = useCallback(() => {
    ref.current?.focus();
    setIsFocused(true);
  }, []);

  const blur = useCallback(() => {
    ref.current?.blur();
    setIsFocused(false);
  }, []);

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  return {
    isFocused,
    ref,
    focus,
    blur,
    handleFocus,
    handleBlur,
  };
};

/**
 * Hook for observing element resize
 */
export const useResize = () => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return { dimensions, ref };
};

/**
 * Hook for managing component configuration
 */
export const useComponentConfig = (config: ComponentConfig) => {
  const [currentConfig, setCurrentConfig] = useState(config);

  const updateConfig = useCallback((updates: Partial<ComponentConfig>) => {
    setCurrentConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const resetConfig = useCallback(() => {
    setCurrentConfig(config);
  }, [config]);

  return {
    config: currentConfig,
    updateConfig,
    resetConfig,
  };
};

/**
 * Hook for syncing state with localStorage
 */
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
};

// Re-export legacy shared hooks for backward compatibility
export { useHydration } from './use-hydration';
export { useDynamicEntity } from './use-dynamic-entity';
export { useCreateModal } from './use-create-modal';
export type { UseCreateModalOptions, UseCreateModalReturn } from './use-create-modal';
export { useEditModal } from './use-edit-modal';
export type { UseEditModalOptions, UseEditModalReturn } from './use-edit-modal';

// Re-export form modal helpers from the form-builder package
export { useFormModal } from '../../form-builder';
export type { UseFormModalOptions, UseFormModalReturn, FormModalMode } from '../../form-builder';

// Re-export print hook
export { usePrint } from './use-print';
export type { UsePrintReturn } from './use-print';