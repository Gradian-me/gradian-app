// Text Input Component

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { TextInputProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { baseInputClasses, getLabelClasses, errorTextClasses } from '../utils/field-styles';
import { CopyContent } from './CopyContent';

export const TextInput = forwardRef<FormElementRef, TextInputProps>(
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
      maxLength,
      minLength,
      pattern,
      className,
      touched,
      canCopy = false,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
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

    const inputClasses = cn(
      baseInputClasses,
      'direction-auto',
      error
        ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500'
        : '',
      canCopy && 'pe-10',
      className
    );

    const fieldName = (config as any).name || 'unknown';
    const fieldLabel = (config as any).label;
    const fieldPlaceholder = (config as any).placeholder;
    const fieldReadOnly = (config as any).readonly ?? (config as any).readOnly ?? false;
    
    if (!config) {
      console.error('TextInput: config is required');
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
        <div className="relative">
        <input
          ref={inputRef}
          id={fieldName}
          name={fieldName}
          type={(config as any).type || 'text'}
          value={value ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder || fieldPlaceholder}
          maxLength={maxLength || (config as any).validation?.maxLength}
          minLength={minLength || (config as any).validation?.minLength}
          pattern={pattern}
          required={required ?? (config as any).validation?.required ?? false}
          disabled={disabled}
          readOnly={fieldReadOnly}
          autoComplete="off"
          dir="auto"
          className={inputClasses}
          {...props}
        />
          {canCopy && value && (
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
        {config.validation?.maxLength && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {value.length}/{config.validation.maxLength}
          </p>
        )}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';
