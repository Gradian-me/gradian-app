'use client';

// MarkdownInput Component
// A textarea component that handles markdown by default

import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { TextareaProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { getLabelClasses } from '../utils/field-styles';
import { CopyContent } from './CopyContent';
import { ProfessionalWritingModal } from '@/gradian-ui/communication/professional-writing';
import { IconRenderer } from '../../../shared/utils/icon-renderer';
import { VoiceInputDialog } from '@/gradian-ui/communication/voice/components/VoiceInputDialog';
import { Mic } from 'lucide-react';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

export const MarkdownInput = forwardRef<FormElementRef, TextareaProps>(
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
      canCopy = false,
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
    const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
    const defaultLang = getDefaultLanguage();

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

    const textareaClasses = cn(
      'w-full direction-auto px-3 py-2 border rounded-lg border-gray-300 bg-white text-sm text-gray-900 ring-offset-background placeholder:text-gray-400 transition-colors',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-300 focus-visible:ring-offset-1 focus-visible:border-violet-400',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-500',
      'dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder:text-gray-400 dark:ring-offset-gray-900 dark:focus-visible:ring-violet-500 dark:focus-visible:border-violet-500 dark:disabled:bg-gray-800/30 dark:disabled:text-gray-300',
      error
        ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500'
        : '',
      resize === 'none' && 'resize-none',
      resize === 'horizontal' && 'resize-x',
      resize === 'vertical' && 'resize-y',
      resize === 'both' && 'resize',
      aiAgentId && 'pe-11',
      enableVoiceInput && 'pb-11',
      'font-mono',
      className
    );

    return (
      <div className="w-full">
        {(config.label || (canCopy && value)) && (
          <div className="flex items-center justify-between mb-1">
            {config.label ? (
              <label
                htmlFor={config.name}
                dir="auto"
                className={getLabelClasses({ error: Boolean(error), required })}
              >
                {config.label}
              </label>
            ) : (
              <div></div>
            )}
            {canCopy && value && (
              <CopyContent content={value} />
            )}
          </div>
        )}
        <div className="relative">
        <textarea
          ref={textareaRef}
          id={config.name}
          name={config.name}
          value={value ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={config.placeholder || getT(TRANSLATION_KEYS.PLACEHOLDER_ENTER_MARKDOWN, language, defaultLang)}
          rows={rows}
          cols={cols}
          maxLength={maxLength || config.validation?.maxLength}
          minLength={config.validation?.minLength}
          required={required ?? config.validation?.required ?? false}
          disabled={disabled}
          className={textareaClasses}
          dir="auto"
          {...props}
        />
          <div className="absolute right-3 top-2 flex items-center gap-1">
            {aiAgentId && value && value.trim() && (
              <button
                type="button"
                onClick={handleAiAgentClick}
                disabled={disabled}
                className={cn(
                  'h-8 w-8 rounded-full border border-violet-200/70 bg-white/80 text-violet-600 shadow-sm transition-all',
                  'flex items-center justify-center',
                  'hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 hover:shadow-md',
                  'dark:border-violet-500/50 dark:bg-gray-900/80 dark:text-violet-200 dark:hover:bg-violet-500/10',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-violet-200/70 disabled:hover:bg-white/80',
                  'focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700'
                )}
                title="Enhance with AI"
              >
                <IconRenderer iconName="Sparkles" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {enableVoiceInput && (
            <div className="absolute right-3 bottom-4 flex items-center gap-1">
              <button
                type="button"
                onClick={handleVoiceInputClick}
                disabled={disabled}
                className={cn(
                  'h-8 w-8 rounded-full border border-violet-200/70 bg-white/80 text-violet-600 shadow-sm transition-all',
                  'flex items-center justify-center',
                  'hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 hover:shadow-md',
                  'dark:border-violet-500/50 dark:bg-gray-900/80 dark:text-violet-200 dark:hover:bg-violet-500/10',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-violet-200/70 disabled:hover:bg-white/80',
                  'focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700'
                )}
                title="Voice Input"
              >
                <Mic className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {config.validation?.maxLength && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-end">
            {value.length}/{config.validation.maxLength}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Markdown formatting is supported. Use standard markdown syntax for headings, lists, tables, code blocks, and more.
        </p>
        {aiAgentId && (
          <ProfessionalWritingModal
            isOpen={isModalOpen}
            onOpenChange={setIsModalOpen}
            initialText={value || ''}
            onApply={handleApplyEnhancedText}
          />
        )}
        {enableVoiceInput && (
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

MarkdownInput.displayName = 'MarkdownInput';

