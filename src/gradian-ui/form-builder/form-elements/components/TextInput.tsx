'use client';

// Text Input Component

import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { TextInputProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { baseInputClasses, getLabelClasses, errorTextClasses } from '../utils/field-styles';
import { CopyContent } from './CopyContent';
import { TranslationDialog } from './TranslationDialog';
import { TranslationButton } from './TranslationButton';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { scrollInputIntoView } from '@/gradian-ui/shared/utils/dom-utils';
import {
  resolveFromTranslationsArray,
  isTranslationArray,
  getDefaultLanguage,
  getT,
  resolveSchemaFieldPlaceholder,
} from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

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
      allowTranslation = false,
      language: languageProp,
      defaultLanguage: defaultLanguageProp,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [translationDialogOpen, setTranslationDialogOpen] = useState(false);
    const language = useLanguageStore((s) => s.language) || getDefaultLanguage();
    const defaultLang = defaultLanguageProp ?? getDefaultLanguage();
    const lang = languageProp ?? language;

    const displayValue =
      allowTranslation && isTranslationArray(value)
        ? resolveFromTranslationsArray(value, lang, defaultLang)
        : typeof value === 'string'
          ? value
          : '';
    const valueForValidation = allowTranslation ? displayValue : (typeof value === 'string' ? value : '');

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      validate: () => {
        if (!config.validation) return true;
        const result = validateField(valueForValidation, config.validation);
        return result.isValid;
      },
      reset: () => (allowTranslation ? onChange?.([]) : onChange?.('')),
      getValue: () => value,
      setValue: (newValue) => onChange?.(newValue),
    }));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (allowTranslation) return;
      onChange?.(e.target.value);
    };

    const handleBlur = () => {
      onBlur?.();
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      scrollInputIntoView(e.currentTarget, { delay: 100 });
      onFocus?.();
    };

    const handleTranslationChange = (arr: Array<Record<string, string>>) => {
      onChange?.(arr);
    };

    const showCopyButton =
      canCopy && value != null && value !== '' && (!allowTranslation || !isTranslationArray(value));
    const showTranslationButton = allowTranslation && !disabled;

    const paddingEndClass =
      showCopyButton && showTranslationButton
        ? 'pe-20' /* space for copy + translation buttons (each h-7 w-7 + gap) */
        : showCopyButton || showTranslationButton
          ? 'pe-10' /* space for one button */
          : '';

    const readOnlyTranslationClasses = allowTranslation
      ? error
        ? 'read-only:bg-gray-100 read-only:text-gray-500 read-only:border-red-500 read-only:cursor-not-allowed read-only:opacity-70 read-only:dark:bg-gray-800/30 read-only:dark:text-gray-300 read-only:dark:border-red-500'
        : 'read-only:bg-gray-100 read-only:text-gray-500 read-only:border-gray-300 read-only:cursor-not-allowed read-only:opacity-70 read-only:dark:bg-gray-800/30 read-only:dark:text-gray-300 read-only:dark:border-gray-600'
      : '';

    const inputClasses = cn(
      baseInputClasses,
      'direction-auto text-xs',
      error
        ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500'
        : '',
      paddingEndClass,
      readOnlyTranslationClasses,
      className
    );

    const fieldName = (config as any).name || 'unknown';
    const fieldLabel = (config as any).label;
    const fieldPlaceholder = resolveSchemaFieldPlaceholder(config as any, language, defaultLang) || undefined;
    const fieldReadOnly = (config as any).readonly ?? (config as any).readOnly ?? false;
    const placeholderKey = allowTranslation
      ? TRANSLATION_KEYS.PLACEHOLDER_ENTER_TRANSLATED_VALUES
      : TRANSLATION_KEYS.PLACEHOLDER_ENTER_VALUE;

    if (!config) {
      loggingCustom(LogType.CLIENT_LOG, 'error', 'TextInput: config is required');
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
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={placeholder || fieldPlaceholder || getT(placeholderKey, language, defaultLang)}
            maxLength={allowTranslation ? undefined : (maxLength || (config as any).validation?.maxLength)}
            minLength={minLength || (config as any).validation?.minLength}
            pattern={pattern}
            required={required ?? (config as any).validation?.required ?? false}
            disabled={disabled}
            readOnly={fieldReadOnly || (allowTranslation && !disabled)}
            autoComplete="off"
            dir="auto"
            className={inputClasses}
            {...props}
          />
          {(showCopyButton || showTranslationButton) && (
            <div className="absolute end-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              {showCopyButton && (
                <CopyContent content={displayValue ?? ''} />
              )}
              {showTranslationButton && (
                <TranslationButton onClick={() => setTranslationDialogOpen(true)} mode="edit" />
              )}
            </div>
          )}
        </div>
        {error && (
          <p className={errorTextClasses} role="alert">
            {error}
          </p>
        )}
        {config.validation?.maxLength && !allowTranslation && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-end">
            {displayValue.length}/{config.validation.maxLength}
          </p>
        )}
        {allowTranslation && (
          <TranslationDialog
            open={translationDialogOpen}
            onOpenChange={setTranslationDialogOpen}
            value={typeof value === 'string' ? value : Array.isArray(value) ? value : ''}
            onChange={handleTranslationChange}
            isTextarea={false}
            title={fieldLabel}
            defaultLanguage={defaultLang}
          />
        )}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';
