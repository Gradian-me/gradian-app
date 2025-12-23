// Tag Input Component
// Tag input that displays entered values as badges

import React, { forwardRef, useImperativeHandle, useRef, useState, KeyboardEvent } from 'react';
import { TextInputProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export interface TagInputProps extends Omit<TextInputProps, 'value' | 'onChange'> {
  value?: string[] | string;
  onChange?: (value: string[]) => void;
  validateEmail?: boolean; // If true, validate each tag as an email
  separator?: string; // Character(s) that separate tags (default: comma, space, enter)
  maxTags?: number; // Maximum number of tags allowed
}

export const TagInput = forwardRef<FormElementRef, TagInputProps>(
  (
    {
      config,
      value = [],
      onChange,
      onBlur,
      onFocus,
      error,
      disabled = false,
      required = false,
      placeholder,
      className,
      touched,
      validateEmail = false,
      separator,
      maxTags,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);

    // Normalize value to array
    const tags = Array.isArray(value) ? value : (typeof value === 'string' && value.trim() ? [value] : []);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      validate: () => {
        if (!config?.validation) return true;
        const result = validateField(tags, config.validation);
        return result.isValid;
      },
      reset: () => onChange?.([]),
      getValue: () => tags,
      setValue: (newValue) => onChange?.(Array.isArray(newValue) ? newValue : []),
    }));

    const validateEmailFormat = (email: string): boolean => {
      if (!validateEmail) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    const addTag = (tag: string) => {
      const trimmedTag = tag.trim();
      if (!trimmedTag) {
        setValidationError(null);
        return;
      }

      // Validate email if required
      if (validateEmail && !validateEmailFormat(trimmedTag)) {
        setValidationError('Please enter a valid email address');
        return; // Don't add invalid email
      }

      // Check if tag already exists
      if (tags.includes(trimmedTag)) {
        setValidationError('This email address has already been added');
        return;
      }

      // Check max tags limit
      if (maxTags && tags.length >= maxTags) {
        setValidationError(`Maximum ${maxTags} email address${maxTags > 1 ? 'es' : ''} allowed`);
        return;
      }

      // Success - add tag and clear errors
      onChange?.([...tags, trimmedTag]);
      setInputValue('');
      setValidationError(null);
    };

    const removeTag = (tagToRemove: string) => {
      onChange?.(tags.filter((tag) => tag !== tagToRemove));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      // Clear validation error when user starts typing
      if (validationError) {
        setValidationError(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === 'Tab' || (separator && e.key === separator)) {
        e.preventDefault();
        if (inputValue.trim()) {
          addTag(inputValue);
        }
      } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
        // Remove last tag when backspace is pressed on empty input
        e.preventDefault();
        removeTag(tags[tags.length - 1]);
      } else if (e.key === ',' || e.key === ' ') {
        // Add tag on comma or space if input has value
        if (inputValue.trim()) {
          e.preventDefault();
          addTag(inputValue);
        }
      }
    };

    const handleBlur = () => {
      // Add tag when input loses focus if there's a value
      if (inputValue.trim()) {
        addTag(inputValue);
      }
      onBlur?.();
    };

    const handleFocus = () => {
      onFocus?.();
    };

    const inputClasses = cn(
      'w-full direction-auto px-3 py-2 border rounded-lg border-gray-300 bg-white text-sm text-gray-900 ring-offset-background placeholder:text-gray-400 transition-colors',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-300 focus-visible:ring-offset-1 focus-visible:border-violet-400',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-500',
      'dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder:text-gray-400 dark:ring-offset-gray-900 dark:focus-visible:ring-violet-500 dark:focus-visible:border-violet-500 dark:disabled:bg-gray-800/30 dark:disabled:text-gray-300',
      error
        ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500'
        : '',
      className
    );

    const fieldName = config?.name || 'unknown';
    const fieldLabel = config?.label;
    const fieldPlaceholder = placeholder || config?.placeholder || 'Enter tags...';

    return (
      <div className="w-full">
        {fieldLabel && (
          <label
            htmlFor={fieldName}
            className={cn(
              'block text-xs font-medium mb-2',
              error ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300',
              required && 'after:content-["*"] after:ms-1 after:text-red-500 dark:after:text-red-400'
            )}
          >
            {fieldLabel}
          </label>
        )}
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 min-h-[42px] px-3 py-2 border rounded-lg border-gray-300 bg-white transition-colors',
            'focus-within:outline-none focus-within:ring-1 focus-within:ring-violet-300 focus-within:ring-offset-1 focus-within:border-violet-400',
            'dark:border-gray-600 dark:bg-gray-800/50 dark:ring-offset-gray-900 dark:focus-within:ring-violet-500 dark:focus-within:border-violet-500',
            (error || validationError)
              ? 'border-red-500 focus-within:ring-red-300 focus-within:border-red-500 dark:border-red-500 dark:focus-within:ring-red-400 dark:focus-within:border-red-500'
              : '',
            disabled && 'cursor-not-allowed opacity-50 bg-gray-100 dark:bg-gray-800/30'
          )}
        >
          {tags.map((tag, index) => (
            <Badge
              key={`${tag}-${index}`}
              variant="default"
              className="flex items-center gap-1 px-2 py-0.5 text-xs bg-violet-200 text-violet-800 border-violet-300 hover:bg-violet-300 dark:bg-violet-800 dark:text-violet-200 dark:border-violet-700"
            >
              <span>{tag}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ms-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          <input
            ref={inputRef}
            id={fieldName}
            name={fieldName}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={tags.length === 0 ? fieldPlaceholder : ''}
            disabled={disabled}
            required={required ?? config.validation?.required ?? false}
            className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
            {...props}
          />
        </div>
        {(error || validationError) && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error || validationError}</p>
        )}
        {maxTags && !error && !validationError && (
          <p className="mt-1 text-xs text-muted-foreground">
            {tags.length} / {maxTags} tags
          </p>
        )}
      </div>
    );
  }
);

TagInput.displayName = 'TagInput';

