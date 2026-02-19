'use client';

// Textarea Component

import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { TextareaProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { getLabelClasses, errorTextClasses, textareaBaseClasses } from '../utils/field-styles';
import { CopyContent } from './CopyContent';
import { TranslationDialog } from './TranslationDialog';
import { TranslationButton } from './TranslationButton';
import { ProfessionalWritingModal } from '@/gradian-ui/communication/professional-writing';
import { VoiceInputDialog } from '@/gradian-ui/communication/voice/components/VoiceInputDialog';
import { TextareaAiEnhanceButton } from './TextareaAiEnhanceButton';
import { TextareaVoiceInputButton } from './TextareaVoiceInputButton';
import { TextareaFloatingActionButton } from './TextareaFloatingActionButton';
import { scrollInputIntoView } from '@/gradian-ui/shared/utils/dom-utils';
import {
  resolveFromTranslationsArray,
  isTranslationArray,
  getDefaultLanguage,
} from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';

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
      rows = 5,
      cols,
      resize = 'vertical',
      maxLength,
      className,
      touched,
      canCopy = true,
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
    const contentToCopy = allowTranslation ? displayValue : (typeof value === 'string' ? value : '');
    const valueForValidation = allowTranslation ? displayValue : (typeof value === 'string' ? value : '');

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
      textareaBaseClasses,
      error
        ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500'
        : '',
      resize === 'none' && 'resize-none',
      resize === 'horizontal' && 'resize-x',
      resize === 'vertical' && 'resize-y',
      resize === 'both' && 'resize',
      allowTranslation && 'read-only:bg-white read-only:border-gray-300 read-only:text-gray-900 read-only:dark:bg-gray-900/60 read-only:dark:border-gray-600 read-only:dark:text-gray-300 read-only:cursor-default',
      (contentToCopy.trim() || (allowTranslation && !disabled) || (aiAgentId && !allowTranslation) || (enableVoiceInput && !allowTranslation)) && 'pb-10',
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
            disabled={disabled}
            readOnly={allowTranslation && !disabled}
            className={textareaClasses}
            dir="auto"
            {...props}
          />
        {(contentToCopy.trim() || (allowTranslation && !disabled) || (aiAgentId && !allowTranslation && typeof value === 'string' && value.trim()) || (enableVoiceInput && !allowTranslation)) && (
          <div className="absolute bottom-2 end-2 mb-2 flex items-center justify-end gap-1">
            {contentToCopy.trim() && (
              <CopyContent content={contentToCopy} className="shrink-0" />
            )}
            {allowTranslation && !disabled && (
              <TranslationButton
                onClick={() => setTranslationDialogOpen(true)}
                mode="edit"
                disabled={disabled}
                iconClassName="h-3.5 w-3.5"
              />
            )}
            {aiAgentId && !allowTranslation && typeof value === 'string' && value.trim() && (
              <TextareaAiEnhanceButton
                onClick={handleAiAgentClick}
                disabled={disabled}
              />
            )}
            {enableVoiceInput && !allowTranslation && (
              <TextareaVoiceInputButton
                onClick={handleVoiceInputClick}
                disabled={disabled}
              />
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
