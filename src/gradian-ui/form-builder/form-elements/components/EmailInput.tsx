// Email Input Component
// Email input with type="email" embedded

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { TextInputProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { baseInputClasses, getLabelClasses } from '../utils/field-styles';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyContent } from './CopyContent';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

export const EmailInput = forwardRef<FormElementRef, TextInputProps>(
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

    const handleEmail = () => {
      if (value && typeof value === 'string' && value.trim() !== '') {
        window.location.href = `mailto:${value.trim()}`;
      }
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
    const fieldPlaceholder = placeholder || config?.placeholder || 'Enter email address';
    const hasValue = value && typeof value === 'string' && value.trim() !== '';

    if (!config) {
      loggingCustom(LogType.CLIENT_LOG, 'error', 'EmailInput: config is required');
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
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            id={fieldName}
            name={fieldName}
            type="email"
            value={value ?? ''}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={fieldPlaceholder}
            maxLength={maxLength || config.validation?.maxLength}
            minLength={minLength || config.validation?.minLength}
            required={required ?? config.required ?? config.validation?.required ?? false}
            disabled={disabled}
            autoComplete="email"
            dir="ltr"
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
                onClick={handleEmail}
                disabled={false}
                className="h-7 w-7 p-0 hover:bg-violet-100 hover:text-violet-600"
                title="Send email"
                aria-label="Send email"
                tabIndex={-1}
              >
                <Mail className="h-4 w-4" />
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
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-end">
            {value.length}/{config.validation.maxLength}
          </p>
        )}
      </div>
    );
  }
);

EmailInput.displayName = 'EmailInput';
