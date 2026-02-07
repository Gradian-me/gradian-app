// File Input Component
// File input with type="file" embedded

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { FileInputProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { getLabelClasses, errorTextClasses } from '../utils/field-styles';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

export const FileInput = forwardRef<FormElementRef, FileInputProps>(
  (
    {
      config,
      value,
      onChange,
      onBlur,
      onFocus,
      error,
      disabled = false,
      required = false,
      accept,
      multiple,
      maxFileSize,
      onFileSelect,
      className,
      touched,
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
      reset: () => {
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        onChange?.('');
      },
      getValue: () => value,
      setValue: (newValue) => onChange?.(newValue),
    }));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        if (onFileSelect) {
          onFileSelect(files);
        }
        if (multiple) {
          onChange?.(Array.from(files));
        } else {
          onChange?.(files[0]);
        }
      }
    };

    const handleBlur = () => {
      onBlur?.();
    };

    const handleFocus = () => {
      onFocus?.();
    };

    const inputClasses = cn(
      'w-full direction-auto px-3 py-2 border rounded-lg border-gray-300 bg-white text-sm text-gray-900 ring-offset-background placeholder:text-gray-400 transition-colors',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-300 focus-visible:ring-offset-1 focus-visible:border-violet-400',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-500',
      'dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder:text-gray-400 dark:ring-offset-gray-900 dark:focus-visible:ring-violet-500 dark:focus-visible:border-violet-500 dark:disabled:bg-gray-800/30 dark:disabled:text-gray-300',
      'file:me-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700',
      'hover:file:bg-violet-100',
      error
        ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500'
        : '',
      className
    );

    const fieldName = config?.name || 'unknown';
    const fieldLabel = config?.label;
    const acceptTypes = accept || (config as any).accept || '*/*';

    if (!config) {
      loggingCustom(LogType.CLIENT_LOG, 'error', 'FileInput: config is required');
      return null;
    }

    return (
      <div className="w-full">
        {fieldLabel && (
          <label
            htmlFor={fieldName}
            dir="ltr"
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
            type="file"
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            accept={acceptTypes}
            multiple={multiple || (config as any).multiple}
            required={required ?? config.required ?? config.validation?.required ?? false}
            disabled={disabled}
            className={inputClasses}
            {...props}
          />
        </div>
        {error && (
          <p className={errorTextClasses} role="alert">
            {error}
          </p>
        )}
        {maxFileSize && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-end">
            Max file size: {(maxFileSize / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
      </div>
    );
  }
);

FileInput.displayName = 'FileInput';
