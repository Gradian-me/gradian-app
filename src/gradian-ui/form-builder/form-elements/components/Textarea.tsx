// Textarea Component

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { TextareaProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { CopyContent } from './CopyContent';

export const Textarea = forwardRef<FormElementRef, TextareaProps>(
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
      rows = 3,
      cols,
      resize = 'vertical',
      maxLength,
      className,
      touched,
      canCopy = false,
      ...props
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
      validate: () => {
        if (!config.validation) return true;
        const result = validateField(value, config.validation);
        return result.isValid;
      },
      reset: () => onChange?.(''),
      getValue: () => value,
      setValue: (newValue) => onChange?.(newValue),
    }));

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange?.(newValue);
    };

    const handleBlur = () => {
      onBlur?.();
    };

    const handleFocus = () => {
      onFocus?.();
    };

    const textareaClasses = cn(
      'w-full direction-auto px-3 py-2 border rounded-lg border-gray-300 bg-white text-sm text-gray-900 ring-offset-background placeholder:text-gray-400 transition-colors',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-300 focus-visible:ring-offset-1 focus-visible:border-violet-400',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-500',
      'dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder:text-gray-400 dark:ring-offset-gray-900 dark:focus-visible:ring-violet-500 dark:focus-visible:border-violet-500 dark:disabled:bg-gray-800/30 dark:disabled:text-gray-500',
      error
        ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500'
        : '',
      resize === 'none' && 'resize-none',
      resize === 'horizontal' && 'resize-x',
      resize === 'vertical' && 'resize-y',
      resize === 'both' && 'resize',
      canCopy && 'pr-10',
      className
    );

    return (
      <div className="w-full">
        {config.label && (
          <label
            htmlFor={config.name}
            className={cn(
              'block text-sm font-medium mb-1',
              error ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300',
              required && 'after:content-["*"] after:ml-1 after:text-red-500 dark:after:text-red-400'
            )}
          >
            {config.label}
          </label>
        )}
        <div className="relative">
        <textarea
          ref={textareaRef}
          id={config.name}
          name={config.name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={config.placeholder}
          rows={rows}
          cols={cols}
          maxLength={maxLength || config.validation?.maxLength}
          minLength={config.validation?.minLength}
          required={required ?? config.required ?? config.validation?.required ?? false}
          disabled={disabled}
          className={textareaClasses}
          {...props}
        />
          {canCopy && value && (
            <div className="absolute right-1 top-2">
              <CopyContent content={value} />
            </div>
          )}
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

Textarea.displayName = 'Textarea';
