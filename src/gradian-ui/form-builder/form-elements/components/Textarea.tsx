// Textarea Component

import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { TextareaProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { getLabelClasses, errorTextClasses } from '../utils/field-styles';
import { CopyContent } from './CopyContent';
import { ProfessionalWritingModal } from '@/gradian-ui/communication/professional-writing';
import { VoiceInputDialog } from '@/gradian-ui/communication/voice/components/VoiceInputDialog';
import { TextareaAiEnhanceButton } from './TextareaAiEnhanceButton';
import { TextareaVoiceInputButton } from './TextareaVoiceInputButton';
import { scrollInputIntoView } from '@/gradian-ui/shared/utils/dom-utils';

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

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      // Scroll textarea into view when focused (especially important on mobile when keyboard opens)
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

    const textareaClasses = cn(
      'w-full direction-auto px-3 py-2 border rounded-lg border-gray-300 bg-white text-xs text-gray-900 ring-offset-background placeholder:text-gray-400 transition-colors',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-300 focus-visible:ring-offset-1 focus-visible:border-violet-400',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-500',
      'dark:border-gray-600 dark:bg-gray-900/60 dark:text-gray-400 dark:placeholder:text-gray-400 dark:ring-offset-gray-900 dark:focus-visible:ring-violet-500 dark:focus-visible:border-violet-500 dark:disabled:bg-gray-800/30 dark:disabled:text-gray-300',
      error
        ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500'
        : '',
      resize === 'none' && 'resize-none',
      resize === 'horizontal' && 'resize-x',
      resize === 'vertical' && 'resize-y',
      resize === 'both' && 'resize',
      (aiAgentId || enableVoiceInput) && 'pr-12',
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
          value={value ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={config.placeholder}
          rows={rows}
          cols={cols}
          maxLength={maxLength || config.validation?.maxLength}
          minLength={config.validation?.minLength}
          required={required ?? config.validation?.required ?? false}
          disabled={disabled}
          className={textareaClasses}
          style={(aiAgentId || enableVoiceInput) ? { paddingRight: '3rem' } : undefined}
          {...props}
        />
          <div className="absolute right-3 top-2 flex items-center gap-1">
            {canCopy && value && (
              <CopyContent content={value} />
            )}
            {aiAgentId && value && value.trim() && (
              <TextareaAiEnhanceButton
                onClick={handleAiAgentClick}
                disabled={disabled}
              />
            )}
          </div>
          {enableVoiceInput && (
            <div className="absolute right-3 bottom-4 flex items-center gap-1">
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
        {config.validation?.maxLength && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-end">
            {value.length}/{config.validation.maxLength}
          </p>
        )}
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

Textarea.displayName = 'Textarea';
