 'use client';

// Icon Input Component
// Icon input with icon preview and validation

import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TextInputProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { baseInputClasses } from '../utils/field-styles';
import { IconRenderer, isValidLucideIcon } from '@/gradian-ui/shared/utils/icon-renderer';
import { CopyContent } from './CopyContent';
import { PopupPicker } from './PopupPicker';
import { ClipboardCopy } from 'lucide-react';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

export interface IconInputProps extends TextInputProps {}

export const IconInput = forwardRef<FormElementRef, IconInputProps>(
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
      touched,
      canCopy = false,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const iconValue = typeof value === 'string' ? value : '';
    const isValid = isValidLucideIcon(iconValue);
    const isEmpty = !iconValue || iconValue.trim() === '';

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

    const shouldShowLibraryButton = config?.metadata?.disableIconLibrary !== true;

    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const inputClasses = cn(
      baseInputClasses,
      'bg-white dark:bg-gray-800/50', // Ensure background matches EmailInput
      error
        ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500'
        : '',
      (canCopy || shouldShowLibraryButton) && 'pe-16',
      !isEmpty && 'ps-12', // Add extra left padding when icon is shown inside circle
      className
    );

    const fieldName = config?.name || 'unknown';
    const fieldLabel = config?.label;
    const fieldPlaceholder = placeholder || config?.placeholder || 'Enter Lucide Icon name (e.g., User, Home, Search)';

    const handleOpenPicker = () => {
      setIsPickerOpen(true);
    };

    if (!config) {
      loggingCustom(LogType.CLIENT_LOG, 'error', 'IconInput: config is required');
      return null;
    }

    return (
      <div className="w-full">
        {fieldLabel && (
          <label
            htmlFor={fieldName}
            className={cn(
              'block text-xs font-medium mb-2',
              error ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-slate-200',
              required && 'after:content-["*"] after:ms-1 after:text-red-500'
            )}
          >
            {fieldLabel}
          </label>
        )}
        <div className="relative">
          {/* Icon preview on the left */}
          {!isEmpty && (
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              <div
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center border',
                  isValid
                    ? 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-slate-800 dark:text-violet-300 dark:border-slate-700'
                    : 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950 dark:text-red-300 dark:border-red-900'
                )}
              >
                {isValid ? (
                  <IconRenderer iconName={iconValue} className="h-4 w-4" />
                ) : (
                  <span className="text-[11px] leading-none">?</span>
                )}
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            id={fieldName}
            name={fieldName}
            type="text"
            value={iconValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={fieldPlaceholder}
            required={required ?? config.required ?? config.validation?.required ?? false}
            disabled={disabled}
            className={inputClasses}
            {...props}
          />
          {(shouldShowLibraryButton || (!isEmpty && !canCopy) || (canCopy && !isEmpty)) && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {shouldShowLibraryButton && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-violet-50 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={(e) => {
                    e.preventDefault();
                    handleOpenPicker();
                  }}
                  disabled={disabled}
                  aria-label="Open Lucide icon picker"
                  title="Browse Lucide icons"
                >
                  <ClipboardCopy className="h-4 w-4" />
                </Button>
              )}
              {!isEmpty && !canCopy && (
                <div className="pointer-events-none">
                  <span
                    className={cn(
                      'text-sm rounded-full px-2 py-1',
                      isValid
                        ? 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/40'
                        : 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/40'
                    )}
                  >
                    {isValid ? '✓' : '✗'}
                  </span>
                </div>
              )}
              {canCopy && !isEmpty && (
                <div>
                  <CopyContent content={iconValue} />
                </div>
              )}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {shouldShowLibraryButton && (
          <>
            <PopupPicker
              isOpen={isPickerOpen}
              onClose={() => setIsPickerOpen(false)}
              sourceUrl="/api/integrations/lucide-icons"
              pageSize={60}
              title="Select an icon"
              description="Search and select a Lucide icon."
              onSelect={async (selections, _rawItems) => {
                const selected = selections[0];
                if (selected?.id) {
                  onChange?.(selected.id);
                } else if (selected?.label) {
                  onChange?.(selected.label);
                }
              }}
              selectedIds={iconValue ? [iconValue] : []}
            />
          </>
        )}
      </div>
    );
  }
);

IconInput.displayName = 'IconInput';

