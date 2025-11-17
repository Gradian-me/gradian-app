// Number Input Component
// Number input with type="number" embedded

import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { NumberInputProps, FormElementRef } from '../types';
import { cn, validateField, formatNumber } from '../../../shared/utils';
import { CopyContent } from './CopyContent';
import { baseInputClasses, getLabelClasses, errorTextClasses } from '../utils/field-styles';

export const NumberInput = forwardRef<FormElementRef, NumberInputProps>(
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
      placeholder,
      min,
      max,
      step,
      className,
      touched,
      canCopy = false,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [displayValue, setDisplayValue] = useState<string>('');

    // Check if thousand separator formatting is enabled (default: true, can be disabled via config)
    const useThousandSeparator = (config as any)?.useThousandSeparator !== false;

    // Initialize display value
    useEffect(() => {
      if (value === '' || value === null || value === undefined) {
        setDisplayValue('');
      } else if (typeof value === 'number') {
        setDisplayValue(useThousandSeparator ? formatNumber(value) : String(value));
      } else {
        setDisplayValue(String(value));
      }
    }, []); // Only run on mount

    // Update display value when value changes (only when not focused)
    useEffect(() => {
      if (!isFocused) {
        if (value === '' || value === null || value === undefined) {
          setDisplayValue('');
        } else if (typeof value === 'number') {
          setDisplayValue(useThousandSeparator ? formatNumber(value) : String(value));
        } else {
          setDisplayValue(String(value));
        }
      }
    }, [value, isFocused, useThousandSeparator]);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      validate: () => {
        if (!config?.validation) return true;
        const result = validateField(value, config.validation);
        return result.isValid;
      },
      reset: () => onChange?.(''),
      getValue: () => value,
      setValue: (newValue) => onChange?.(newValue),
    }));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      
      if (useThousandSeparator) {
        // Remove thousand separators and other non-numeric characters except decimal point and minus
        const cleanedValue = newValue.replace(/[^\d.-]/g, '');
        setDisplayValue(cleanedValue);
        
        // Convert to number if not empty, otherwise keep empty string
        if (cleanedValue === '' || cleanedValue === '-') {
          onChange?.('');
        } else {
          const numValue = Number(cleanedValue);
          onChange?.(isNaN(numValue) ? '' : numValue);
        }
      } else {
        // For non-formatted inputs, use standard number input behavior
        const numValue = newValue === '' ? '' : Number(newValue);
        onChange?.(numValue);
        setDisplayValue(newValue);
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      // Format the value on blur if thousand separator is enabled
      if (useThousandSeparator && value !== '' && value !== null && value !== undefined && typeof value === 'number' && !isNaN(value)) {
        setDisplayValue(formatNumber(value));
      }
      onBlur?.();
    };

    const handleFocus = () => {
      setIsFocused(true);
      // Show raw number value when focused (no formatting)
      if (useThousandSeparator && value !== '' && value !== null && value !== undefined) {
        setDisplayValue(String(value));
      }
      onFocus?.();
    };

    const inputClasses = cn(
      baseInputClasses,
      error
        ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500'
        : '',
      canCopy && 'pr-10',
      className
    );

    const fieldName = config?.name || 'unknown';
    const fieldLabel = config?.label;
    const fieldPlaceholder = placeholder || config?.placeholder || 'Enter number';

    if (!config) {
      console.error('NumberInput: config is required');
      return null;
    }

    return (
      <div className="w-full">
        {fieldLabel && (
          <label
            htmlFor={fieldName}
            className={getLabelClasses({ error: Boolean(error), required: Boolean(required) })}
          >
            {fieldLabel}
          </label>
        )}
        <div className="relative">
        <input
          ref={inputRef}
          id={fieldName}
          name={fieldName}
          type={useThousandSeparator ? 'text' : 'number'}
          inputMode={useThousandSeparator ? ('decimal' as const) : ('numeric' as const)}
          value={useThousandSeparator ? displayValue : (value === '' ? '' : String(value))}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={fieldPlaceholder}
          min={useThousandSeparator ? undefined : (min ?? config.validation?.min)}
          max={useThousandSeparator ? undefined : (max ?? config.validation?.max)}
          step={useThousandSeparator ? undefined : (step || (config as any).step || '1')}
          required={required ?? config.required ?? config.validation?.required ?? false}
          disabled={disabled}
          autoComplete="off"
          className={inputClasses}
          {...props}
        />
          {canCopy && (value !== '' && value !== null && value !== undefined && (typeof value !== 'number' || !isNaN(value))) && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              <CopyContent content={value} />
            </div>
          )}
        </div>
        {error && (
          <p className={errorTextClasses} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

NumberInput.displayName = 'NumberInput';
