'use client';

// Radio Group Component

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { RadioProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { extractFirstId, normalizeOptionArray, NormalizedOption } from '../utils/option-normalizer';
import { useOptionsFromUrl } from '../hooks/useOptionsFromUrl';

export const RadioGroup = forwardRef<FormElementRef, RadioProps>(
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
      options = [],
      direction = 'vertical',
      className,
      sourceUrl,
      queryParams,
      transform,
      ...props
    },
    ref
  ) => {
    const groupRef = useRef<HTMLDivElement>(null);

    // Fetch options from URL if sourceUrl is provided
    const {
      options: urlOptions,
      isLoading: isLoadingOptions,
      error: optionsError,
    } = useOptionsFromUrl({
      sourceUrl,
      enabled: Boolean(sourceUrl),
      transform,
      queryParams,
    });

    // Use URL options if sourceUrl is provided, otherwise use provided options
    const resolvedOptions = sourceUrl ? urlOptions : options;

    useImperativeHandle(ref, () => ({
      focus: () => {
        const firstRadio = groupRef.current?.querySelector('input[type="radio"]') as HTMLInputElement;
        firstRadio?.focus();
      },
      blur: () => {
        const activeElement = document.activeElement as HTMLInputElement;
        if (activeElement?.type === 'radio') {
          activeElement.blur();
        }
      },
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

    const groupClasses = cn(
      'space-y-2',
      direction === 'horizontal' && 'flex flex-wrap gap-4 space-y-0',
      className
    );

    const normalizedOptions: NormalizedOption[] = normalizeOptionArray(resolvedOptions);

    const resolvedValue = extractFirstId(value);

    return (
      <div className="w-full">
        {config.label && (
          <fieldset>
            <legend
              className={cn(
                'text-xs font-medium mb-2',
                error ? 'text-red-700' : 'text-gray-700',
                required && 'after:content-["*"] after:ml-1 after:text-red-500'
              )}
            >
              {config.label}
            </legend>
            {isLoadingOptions ? (
              <div className="text-sm text-gray-500 py-2">Loading options...</div>
            ) : optionsError ? (
              <div className="text-sm text-red-600 py-2">{optionsError}</div>
            ) : (
              <div ref={groupRef} className={groupClasses} {...props}>
                {normalizedOptions.map((option, index) => (
                <div key={option.id ?? index} className="flex items-center">
                  <input
                    id={`${config.name}-${option.id ?? index}`}
                    name={config.name}
                    type="radio"
                    value={option.id}
                    checked={resolvedValue === option.id}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onFocus={handleFocus}
                    required={required ?? config.required ?? config.validation?.required ?? false}
                    disabled={disabled || option.disabled}
                    className={cn(
                      // Base styles matching checkbox.tsx (lines 14-15) - adapted for radio
                      'peer h-4 w-4 shrink-0 rounded-full border border-violet-500 bg-background ring-offset-background',
                      'transition-all duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      // Checked state - radio uses white circle instead of checkmark
                      'checked:bg-violet-500 checked:border-violet-500 checked:shadow-sm',
                      'checked:after:content-[""] checked:after:absolute checked:after:left-1/2 checked:after:top-1/2',
                      'checked:after:-translate-x-1/2 checked:after:-translate-y-1/2',
                      'checked:after:w-2 checked:after:h-2 checked:after:rounded-full checked:after:bg-white',
                      // Hover effect
                      'hover:border-violet-400',
                      // Error state
                      error && 'border-red-500 focus-visible:ring-red-500 hover:border-red-500',
                      // Relative positioning for after pseudo-element
                      'relative'
                    )}
                  />
                  <label
                    htmlFor={`${config.name}-${index}`}
                    className={cn(
                      'ml-2 text-sm font-medium',
                      error ? 'text-red-700' : 'text-gray-700',
                      (disabled || option.disabled) && 'text-gray-400'
                    )}
                  >
                    {option.label}
                  </label>
                </div>
              ))}
              </div>
            )}
          </fieldset>
        )}
        {error && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';
