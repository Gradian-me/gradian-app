// Date Input Component
// Date input with type="date" embedded

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { DateInputProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { baseInputClasses, getLabelClasses, errorTextClasses } from '../utils/field-styles';

export const DateInput = forwardRef<FormElementRef, DateInputProps>(
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
      format,
      className,
      touched,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const normalizedValue = value ?? '';

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      validate: () => {
        if (!config?.validation) return true;
        const result = validateField(normalizedValue, config.validation);
        return result.isValid;
      },
      reset: () => onChange?.(''),
      getValue: () => normalizedValue,
      setValue: (newValue) => onChange?.(newValue ?? ''),
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

    const inputClasses = cn(
      baseInputClasses,
      error
        ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500'
        : '',
      className
    );

    const fieldName = config?.name || 'unknown';
    const fieldLabel = config?.label;
    const fieldPlaceholder = placeholder || config?.placeholder;

    if (!config) {
      console.error('DateInput: config is required');
      return null;
    }

    return (
      <div className="w-full">
        {fieldLabel && (
          <label
            htmlFor={fieldName}
            className={getLabelClasses({ error: Boolean(error), required })}
          >
            {fieldLabel}
          </label>
        )}
        <input
          ref={inputRef}
          id={fieldName}
          name={fieldName}
          type="date"
          value={normalizedValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={fieldPlaceholder}
          min={min || (config as any).min}
          max={max || (config as any).max}
          required={required ?? config.validation?.required ?? false}
          disabled={disabled}
          autoComplete="off"
          className={inputClasses}
          {...props}
        />
        {error && (
          <p className={errorTextClasses} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

DateInput.displayName = 'DateInput';
