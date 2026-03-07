'use client';

// Number Input Component
// Number input with type="number" embedded

import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NumberInputProps, FormElementRef } from '../types';
import { cn, validateField, formatNumber } from '../../../shared/utils';
import { CopyContent } from './CopyContent';
import { baseInputClasses, getLabelClasses, errorTextClasses } from '../utils/field-styles';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage, resolveSchemaFieldPlaceholder } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { Calculator as CalculatorIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calculator } from '@/gradian-ui/formula-engine';

export const NumberInput = forwardRef<FormElementRef, NumberInputProps>(
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
      step,
      className,
      touched,
      canCopy = false,
      enableCalculatorInput = true,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [displayValue, setDisplayValue] = useState<string>('');
    const [calculatorOpen, setCalculatorOpen] = useState(false);
    const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
    const defaultLang = getDefaultLanguage();
    const effectiveEnableCalculator = enableCalculatorInput ?? (config as any)?.enableCalculatorInput ?? false;

    // Check if thousand separator formatting is enabled (default: true, can be disabled via config)
    const useThousandSeparator = (config as any)?.useThousandSeparator !== false;
    
    // Get component-specific config values
    const componentConfig = {
      useThousandSeparator,
      decimalPoints: (config as any)?.decimalPoints,
      allowNegative: (config as any)?.allowNegative !== false,
      min: (config as any)?.min ?? min ?? config.validation?.min,
      max: (config as any)?.max ?? max ?? config.validation?.max,
      step: (config as any)?.step ?? step ?? '1',
    };

    // Initialize display value
    useEffect(() => {
      if (value === '' || value === null || value === undefined) {
        setDisplayValue('');
      } else if (typeof value === 'number') {
        setDisplayValue(useThousandSeparator ? formatNumber(value) : String(value));
      } else {
        setDisplayValue(String(value));
      }
    }, []); // Only run on mount

    // Update display value when value changes (only when not focused)
    useEffect(() => {
      if (!isFocused) {
        if (value === '' || value === null || value === undefined) {
          setDisplayValue('');
        } else if (typeof value === 'number') {
          setDisplayValue(useThousandSeparator ? formatNumber(value) : String(value));
        } else {
          setDisplayValue(String(value));
        }
      }
    }, [value, isFocused, useThousandSeparator]);

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
      
      if (useThousandSeparator) {
        // Remove thousand separators and other non-numeric characters except decimal point and minus
        let cleanedValue = newValue.replace(/[^\d.-]/g, '');
        
        // Handle negative numbers
        if (!componentConfig.allowNegative && cleanedValue.startsWith('-')) {
          cleanedValue = cleanedValue.replace('-', '');
        }
        
        // Handle decimal points limit
        if (componentConfig.decimalPoints !== undefined && componentConfig.decimalPoints !== null) {
          const parts = cleanedValue.split('.');
          if (parts.length > 1 && parts[1].length > componentConfig.decimalPoints) {
            cleanedValue = parts[0] + '.' + parts[1].substring(0, componentConfig.decimalPoints);
          }
        }
        
        setDisplayValue(cleanedValue);
        
        // Convert to number if not empty, otherwise keep empty string
        if (cleanedValue === '' || cleanedValue === '-') {
          onChange?.('');
        } else {
          const numValue = Number(cleanedValue);
          onChange?.(isNaN(numValue) ? '' : numValue);
        }
      } else {
        // For non-formatted inputs, use standard number input behavior
        let processedValue = newValue;
        
        // Handle negative numbers
        if (!componentConfig.allowNegative && processedValue.startsWith('-')) {
          processedValue = processedValue.replace('-', '');
        }
        
        const numValue = processedValue === '' ? '' : Number(processedValue);
        onChange?.(numValue);
        setDisplayValue(processedValue);
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      // Format the value on blur if thousand separator is enabled
      if (useThousandSeparator && value !== '' && value !== null && value !== undefined && typeof value === 'number' && !isNaN(value)) {
        setDisplayValue(formatNumber(value));
      }
      onBlur?.();
    };

    const handleFocus = () => {
      setIsFocused(true);
      // Show raw number value when focused (no formatting)
      if (useThousandSeparator && value !== '' && value !== null && value !== undefined) {
        setDisplayValue(String(value));
      }
      onFocus?.();
    };

    const hasValue = value !== '' && value !== null && value !== undefined && (typeof value !== 'number' || !isNaN(value));
    const inputClasses = cn(
      baseInputClasses,
      error
        ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500'
        : '',
      (canCopy || effectiveEnableCalculator) && (canCopy && effectiveEnableCalculator ? 'pe-20' : 'pe-10'),
      className
    );

    const handleCalculatorApply = (result: number) => {
      if (hasValue) {
        const confirmMsg = getT(TRANSLATION_KEYS.MESSAGE_CALCULATOR_REPLACE_VALUE, language, defaultLang);
        if (!window.confirm(confirmMsg)) return;
      }
      onChange?.(result);
      setCalculatorOpen(false);
    };

    const fieldName = config?.name || 'unknown';
    const fieldLabel = config?.label;
    const resolvedConfigPlaceholder = resolveSchemaFieldPlaceholder(config as any, language, defaultLang);
    const fieldPlaceholder = placeholder || resolvedConfigPlaceholder || getT(TRANSLATION_KEYS.PLACEHOLDER_ENTER_NUMBER, language, defaultLang);

    if (!config) {
      loggingCustom(LogType.CLIENT_LOG, 'error', 'NumberInput: config is required');
      return null;
    }

    return (
      <div className="w-full">
        {fieldLabel && (
          <label
            htmlFor={fieldName}
            className={getLabelClasses({ error: Boolean(error), required: Boolean(required) })}
          >
            {fieldLabel}
          </label>
        )}
        <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={fieldName}
          name={fieldName}
          type={useThousandSeparator ? 'text' : 'number'}
          inputMode={useThousandSeparator ? ('decimal' as const) : ('numeric' as const)}
          value={useThousandSeparator ? displayValue : (value === '' ? '' : String(value))}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={fieldPlaceholder}
          min={useThousandSeparator ? undefined : componentConfig.min}
          max={useThousandSeparator ? undefined : componentConfig.max}
          step={useThousandSeparator ? undefined : componentConfig.step}
          required={required ?? config.required ?? config.validation?.required ?? false}
          disabled={disabled}
          autoComplete="off"
          className={inputClasses}
          {...props}
        />
          <div className="absolute end-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {canCopy && hasValue && (
              <CopyContent content={value} />
            )}
            {effectiveEnableCalculator && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCalculatorOpen(true)}
                  disabled={disabled}
                  className="h-7 w-7 p-0 hover:bg-violet-100 hover:text-violet-600"
                  title="Open calculator"
                  aria-label="Open calculator"
                  tabIndex={-1}
                >
                  <CalculatorIcon className="h-4 w-4" />
                </Button>
                {calculatorOpen &&
                  typeof document !== 'undefined' &&
                  createPortal(
                    <div
                      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 pointer-events-auto"
                      style={{ isolation: 'isolate' }}
                      onClick={() => setCalculatorOpen(false)}
                      role="presentation"
                      dir="ltr"
                    >
                      <div
                        className="rounded-lg border border-gray-700 shadow-2xl overflow-hidden pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Calculator"
                      >
                        <Calculator
                          enableCalculatorInput
                          enableSign={false}
                          enableParanthesis
                          enableHistory={false}
                          initialValue={typeof value === 'number' ? value : value ?? ''}
                          onApply={handleCalculatorApply}
                          onCancel={() => setCalculatorOpen(false)}
                        />
                      </div>
                    </div>,
                    document.body
                  )}
              </>
            )}
          </div>
        </div>
        {error && (
          <p className={errorTextClasses} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

NumberInput.displayName = 'NumberInput';
