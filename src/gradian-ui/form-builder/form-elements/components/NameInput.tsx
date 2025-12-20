import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { cn, validateField } from '../../../shared/utils';
import { FormElementRef, NameInputProps } from '../types';
import { CopyContent } from './CopyContent';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

const allowedPattern = /^[a-z0-9_-]+$/;

export const NameInput = forwardRef<FormElementRef, NameInputProps>(
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
      className,
      forbiddenSymbolsMessage = 'Lowercase, numbers, hyphens(-), and underscores(_) are allowed.',
      isCustomizable = false,
      customMode: customModeProp,
      defaultCustomMode = false,
      onCustomModeChange,
      customizeDisabled = false,
      helperText,
      touched,
      canCopy = false,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const fieldName = config?.name || config?.id || 'name';
    const fieldLabel = config?.label;
    const fieldPlaceholder = placeholder || config?.placeholder;

    const isControlledCustomMode = typeof customModeProp === 'boolean';
    const [internalCustomMode, setInternalCustomMode] = useState(defaultCustomMode);
    const isCustomMode = isControlledCustomMode ? customModeProp! : internalCustomMode;

    const handleCustomModeToggle = () => {
      if (!isCustomizable || disabled || customizeDisabled) return;
      const next = !isCustomMode;
      if (!isControlledCustomMode) {
        setInternalCustomMode(next);
      }
      onCustomModeChange?.(next);
    };

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      validate: () => {
        if (!config?.validation) {
          return required ? allowedPattern.test(String(value)) : true;
        }
        const result = validateField(value, config.validation);
        return result.isValid && (config.validation?.pattern ? true : allowedPattern.test(String(value)));
      },
      reset: () => onChange?.(''),
      getValue: () => value,
      setValue: (newValue) => onChange?.(sanitize(newValue ?? '')),
    }));

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || (isCustomizable && !isCustomMode)) return;
      const sanitizedValue = sanitize(event.target.value);
      if (sanitizedValue !== event.target.value) {
        event.target.value = sanitizedValue;
      }
      onChange?.(sanitizedValue);
    };

    const handleBlur = () => {
      onBlur?.();
    };

    const handleFocus = () => {
      onFocus?.();
    };

    const isValidName = useMemo(() => Boolean(value) && allowedPattern.test(String(value)), [value]);

    const hasValue = Boolean(value);
    const showCheckCircle = isValidName && !error;
    const showCopyButton = canCopy && hasValue;
    const rightPadding = showCopyButton && showCheckCircle ? 'pe-20' : (showCopyButton || showCheckCircle ? 'pe-10' : '');

    const inputClasses = cn(
      'w-full direction-auto px-3 py-2 border rounded-lg border-gray-300 bg-white text-sm text-gray-900 ring-offset-background placeholder:text-gray-400 transition-colors',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-300 focus-visible:ring-offset-1 focus-visible:border-violet-400',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-500',
      'dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder:text-gray-400 dark:ring-offset-gray-900 dark:focus-visible:ring-violet-500 dark:focus-visible:border-violet-500 dark:disabled:bg-gray-800/30 dark:disabled:text-gray-500',
      error ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500' : '',
      rightPadding,
      className
    );

    if (!config) {
      loggingCustom(LogType.CLIENT_LOG, 'error', 'NameInput: config is required');
      return null;
    }

    const computedDisabled = disabled || (isCustomizable && !isCustomMode);
    const showHelperText = helperText ?? (isCustomizable && !isCustomMode
      ? 'Automatically generated. Click “Customize” to override.'
      : forbiddenSymbolsMessage);

    return (
      <div className="w-full">
        {(fieldLabel || isCustomizable) && (
          <div className="flex items-center justify-between gap-2 mb-1">
            {fieldLabel ? (
              <label
                htmlFor={fieldName}
                className={cn(
                  'block text-xs font-medium',
                  error ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300',
                  (required ?? config?.required ?? config?.validation?.required ?? false) && 'after:content-["*"] after:ms-1 after:text-red-500 dark:after:text-red-400'
                )}
              >
                {fieldLabel}
              </label>
            ) : (
              <span />
            )}
            {isCustomizable && (
              <button
                type="button"
                onClick={handleCustomModeToggle}
                disabled={disabled || customizeDisabled}
                className={cn(
                  'h-7 px-2 text-xs font-medium rounded-md border border-transparent transition-colors',
                  'bg-transparent text-violet-600 hover:bg-violet-50 disabled:text-gray-400 disabled:hover:bg-transparent'
                )}
              >
                {isCustomMode ? 'Use generated' : 'Customize'}
              </button>
            )}
          </div>
        )}

        <div className="relative">
          <input
            ref={inputRef}
            id={fieldName}
            name={fieldName}
            type="text"
            value={value ?? ''}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={fieldPlaceholder}
            required={required ?? config?.required ?? config?.validation?.required ?? false}
            disabled={computedDisabled}
            autoComplete="off"
            className={inputClasses}
            {...props}
          />

          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {canCopy && hasValue && (
              <CopyContent content={value} />
            )}
            {showCheckCircle && (
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            )}
          </div>
        </div>

        {error ? (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : showHelperText ? (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{showHelperText}</p>
        ) : null}
      </div>
    );
  }
);

NameInput.displayName = 'NameInput';

function sanitize(rawValue: string): string {
  return rawValue
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9@._-]/g, '') // Allow @ and .
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}
