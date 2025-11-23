// Search Input Component

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { SearchInputProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { Search } from 'lucide-react';
import { baseInputClasses, getLabelClasses, errorTextClasses } from '../utils/field-styles';

export const SearchInput = forwardRef<FormElementRef, SearchInputProps>(
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
      onClear,
      onKeyDown,
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

    const handleClear = () => {
      onChange?.('');
      onClear?.();
      inputRef.current?.focus();
    };

    const inputClasses = cn(
      baseInputClasses,
      'py-2',
      error
        ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500'
        : '',
      value && onClear ? 'pl-10 pr-10' : 'pl-10',
      className
    );

    const fieldName = (config as any).name || 'search';
    const fieldLabel = (config as any).label;
    const fieldPlaceholder = (config as any).placeholder || placeholder || 'Search...';
    
    if (!config) {
      console.error('SearchInput: config is required');
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-5 w-5 pointer-events-none" />
          <input
            ref={inputRef}
            id={fieldName}
            name={fieldName}
            type="text"
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
          onKeyDown={onKeyDown}
            placeholder={fieldPlaceholder}
            maxLength={maxLength || (config as any).validation?.maxLength}
            minLength={minLength || (config as any).validation?.minLength}
            pattern={pattern}
            required={required ?? (config as any).validation?.required ?? false}
            disabled={disabled}
            autoComplete="off"
            className={inputClasses}
            {...props}
          />
          {value && onClear && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:text-gray-600 dark:focus:text-gray-300 transition-colors"
              aria-label="Clear search"
            >
              <svg
                className="h-4 w-4"
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

SearchInput.displayName = 'SearchInput';

