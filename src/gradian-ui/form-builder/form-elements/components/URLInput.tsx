// URL Input Component
// URL input with type="url" embedded

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { TextInputProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyContent } from './CopyContent';

export const URLInput = forwardRef<FormElementRef, TextInputProps>(
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
      onChange?.(newValue);
    };

    const handleBlur = () => {
      onBlur?.();
    };

    const handleFocus = () => {
      onFocus?.();
    };

    const handleOpenUrl = () => {
      if (value && typeof value === 'string' && value.trim() !== '') {
        let url = value.trim();
        // Add protocol if missing
        if (!url.match(/^https?:\/\//i)) {
          url = `https://${url}`;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    };

    const inputClasses = cn(
      'w-full direction-auto px-3 py-2 border rounded-lg border-gray-300 bg-white text-sm text-gray-900 ring-offset-background placeholder:text-gray-400 transition-colors',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-300 focus-visible:ring-offset-1 focus-visible:border-violet-400',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-500',
      'dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder:text-gray-400 dark:ring-offset-gray-900 dark:focus-visible:ring-violet-500 dark:focus-visible:border-violet-500 dark:disabled:bg-gray-800/30 dark:disabled:text-gray-500',
      error
        ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500'
        : '',
      className
    );

    const fieldName = config?.name || 'unknown';
    const fieldLabel = config?.label;
    const fieldPlaceholder = placeholder || config?.placeholder || 'Enter URL';
    const hasValue = value && typeof value === 'string' && value.trim() !== '';

    if (!config) {
      console.error('URLInput: config is required');
      return null;
    }

    return (
      <div className="w-full">
        {fieldLabel && (
          <label
            htmlFor={fieldName}
            className={cn(
              'block text-xs font-medium mb-2',
              error ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300',
              required && 'after:content-["*"] after:ml-1 after:text-red-500 dark:after:text-red-400'
            )}
          >
            {fieldLabel}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            id={fieldName}
            name={fieldName}
            type="url"
            value={value ?? ''}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={fieldPlaceholder}
            maxLength={maxLength || config.validation?.maxLength}
            minLength={minLength || config.validation?.minLength}
            required={required ?? config.required ?? config.validation?.required ?? false}
            disabled={disabled}
            autoComplete="off"
            className={cn(inputClasses, hasValue && !canCopy && 'pr-10', hasValue && canCopy && 'pr-20')}
            {...props}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {canCopy && hasValue && (
              <CopyContent content={value} />
            )}
            {hasValue && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleOpenUrl}
                disabled={false}
                className="h-7 w-7 p-0 hover:bg-violet-100 hover:text-violet-600"
                title="Open URL"
                aria-label="Open URL"
                tabIndex={-1}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
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

URLInput.displayName = 'URLInput';

