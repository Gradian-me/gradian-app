// Textarea Component

import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { TextareaProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { getLabelClasses, errorTextClasses } from '../utils/field-styles';
import { CopyContent } from './CopyContent';
import { TranslationDialog } from './TranslationDialog';
import { ProfessionalWritingModal } from '@/gradian-ui/communication/professional-writing';
import { VoiceInputDialog } from '@/gradian-ui/communication/voice/components/VoiceInputDialog';
import { TextareaAiEnhanceButton } from './TextareaAiEnhanceButton';
import { TextareaVoiceInputButton } from './TextareaVoiceInputButton';
import { scrollInputIntoView } from '@/gradian-ui/shared/utils/dom-utils';
import {
  resolveFromTranslationsArray,
  isTranslationArray,
  getDefaultLanguage,
} from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';
import { Languages } from 'lucide-react';

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
      rows = 8,
      cols,
      resize = 'vertical',
      maxLength,
      className,
      touched,
      canCopy = false,
      allowTranslation = false,
      language: languageProp,
      defaultLanguage: defaultLanguageProp,
      aiAgentId,
      enableVoiceInput = false,
      loadingTextSwitches,
      ...props
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);
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
    const isTranslatableDisabled = allowTranslation;

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
      validate: () => {
        if (!config.validation) return true;
        const result = validateField(valueForValidation, config.validation);
        return result.isValid;
      },
      reset: () => (allowTranslation ? onChange?.([]) : onChange?.('')),
      getValue: () => value,
      setValue: (newValue) => onChange?.(newValue),
    }));

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (allowTranslation) return;
      onChange?.(e.target.value);
    };

    const handleBlur = () => {
      onBlur?.();
    };

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      scrollInputIntoView(e.currentTarget, { delay: 100 });
      onFocus?.();
    };

    const handleAiAgentClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsModalOpen(true);
    };

    const handleApplyEnhancedText = (enhancedText: string) => {
      onChange?.(enhancedText);
      setIsModalOpen(false);
    };

    const handleVoiceInputClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsVoiceDialogOpen(true);
    };

    const handleTranslationChange = (arr: Array<Record<string, string>>) => {
      onChange?.(arr);
    };

    const textareaClasses = cn(
      'w-full direction-auto px-3 py-2 border rounded-lg border-gray-300 bg-white text-xs text-gray-900 ring-offset-background placeholder:text-gray-400 transition-colors',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-300 focus-visible:ring-offset-1 focus-visible:border-violet-400',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-500',
      'dark:border-gray-600 dark:bg-gray-900/60 dark:text-gray-300 dark:placeholder:text-gray-400 dark:ring-offset-gray-900 dark:focus-visible:ring-violet-500 dark:focus-visible:border-violet-500 dark:disabled:bg-gray-800/30 dark:disabled:text-gray-300',
      error
        ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500'
        : '',
      resize === 'none' && 'resize-none',
      resize === 'horizontal' && 'resize-x',
      resize === 'vertical' && 'resize-y',
      resize === 'both' && 'resize',
      (aiAgentId || enableVoiceInput) && !allowTranslation && 'pe-12',
      allowTranslation && 'pe-10',
      className
    );

    return (
      <div className="w-full">
        {config.label && (
          <label
            htmlFor={config.name}
            className={getLabelClasses({ error: Boolean(error), required })}
          >
            {config.label}
          </label>
        )}
        <div className="relative">
          <textarea
            ref={textareaRef}
            id={config.name}
            name={config.name}
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={config.placeholder}
            rows={rows}
            cols={cols}
            maxLength={allowTranslation ? undefined : (maxLength || config.validation?.maxLength)}
            minLength={config.validation?.minLength}
            required={required ?? config.validation?.required ?? false}
            disabled={disabled || isTranslatableDisabled}
            className={textareaClasses}
            style={(aiAgentId || enableVoiceInput) && !allowTranslation ? { paddingInlineEnd: '3rem' } : undefined}
            {...props}
          />
          <div className="absolute end-3 top-2 flex items-center gap-1">
            {canCopy && displayValue && (
              <CopyContent content={displayValue} />
            )}
            {allowTranslation && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTranslationDialogOpen(true);
                }}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Edit translations"
                aria-label="Edit translations"
              >
                <Languages className="h-4 w-4" />
              </button>
            )}
            {aiAgentId && !allowTranslation && typeof value === 'string' && value.trim() && (
              <TextareaAiEnhanceButton
                onClick={handleAiAgentClick}
                disabled={disabled}
              />
            )}
          </div>
          {enableVoiceInput && !allowTranslation && (
            <div className="absolute end-3 bottom-4 flex items-center gap-1">
              <TextareaVoiceInputButton
                onClick={handleVoiceInputClick}
                disabled={disabled}
              />
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
            isTextarea={true}
            title={config.label}
            defaultLanguage={defaultLang}
          />
        )}
        {aiAgentId && !allowTranslation && (
          <ProfessionalWritingModal
            isOpen={isModalOpen}
            onOpenChange={setIsModalOpen}
            initialText={typeof value === 'string' ? (value || '') : displayValue}
            onApply={handleApplyEnhancedText}
          />
        )}
        {enableVoiceInput && !allowTranslation && (
          <VoiceInputDialog
            isOpen={isVoiceDialogOpen}
            onOpenChange={setIsVoiceDialogOpen}
            onTranscript={(text) => {
              onChange?.(text);
            }}
            onApply={(text) => {
              onChange?.(text);
              setIsVoiceDialogOpen(false);
            }}
            autoStart={false}
          />
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
