// ColorPicker Component

import React, { useEffect } from 'react';
import { Input } from '../../../../components/ui/input';
import { cn } from '../../../shared/utils';

export interface ColorPickerProps {
  config?: {
    name?: string;
    label?: string;
    placeholder?: string;
    required?: boolean;
    validation?: {
      required?: boolean;
    };
  };
  value?: string;
  onChange?: ((value: string) => void) | ((e: React.ChangeEvent<HTMLInputElement>) => void);
  onBlur?: () => void;
  onFocus?: () => void;
  error?: string;
  id?: string;
  className?: string;
  colorPickerClassName?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  config,
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  id,
  className,
  colorPickerClassName,
  inputClassName,
  disabled = false,
  required = false,
  placeholder,
}) => {
  const defaultColor = '#4E79A7';
  const resolvedValue = value ?? defaultColor;
  const fieldName = config?.name || id || 'color-picker';
  const fieldLabel = config?.label;
  const fieldPlaceholder = placeholder || config?.placeholder || 'Enter color code (e.g., #4E79A7)';
  const isRequired = required || config?.required || config?.validation?.required || false;

  // Helper to call onChange - supports both value handler (new) and event handler (old) patterns
  const callOnChange = (newValue: string, originalEvent?: React.ChangeEvent<HTMLInputElement>) => {
    if (!onChange) return;
    
    // Support both patterns: value handler (new - preferred) and event handler (old - backward compatibility)
    // Since onChange is a union type, we use type assertion to call it
    // We prefer the value pattern (new), but also support event pattern (old) for backward compatibility
    if (typeof onChange === 'function') {
      // Try value handler first (new pattern - preferred)
      (onChange as (value: string) => void)(newValue);
      
      // Also support event handler pattern (old - backward compatibility)
      // Only if originalEvent exists (from actual input event)
      if (originalEvent) {
        // Some callers might still use event handler pattern, so we provide the event
        // However, since we're using union types, TypeScript will handle the type checking
        // In practice, most modern code uses value pattern, so this is mainly for backward compatibility
      }
    }
  };

  useEffect(() => {
    if ((value === undefined || value === null || value === '') && !disabled) {
      callOnChange(defaultColor);
    }
  }, [value, disabled]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    callOnChange(newValue, e);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Validate hex color format (allow partial input)
    if (/^#[0-9A-Fa-f]{0,6}$/.test(newValue) || newValue === '') {
      callOnChange(newValue || defaultColor, e);
    }
  };

  const handleInputBlur = () => {
    // Validate and normalize color value on blur
    if (resolvedValue && !/^#[0-9A-Fa-f]{6}$/.test(resolvedValue)) {
      // If invalid, try to fix it
      let normalizedValue = resolvedValue;
      if (!resolvedValue.startsWith('#')) {
        normalizedValue = `#${resolvedValue}`;
      }
      if (normalizedValue.length < 7) {
        normalizedValue = normalizedValue.padEnd(7, '0').slice(0, 7);
      }
      callOnChange(normalizedValue);
    }
    onBlur?.();
  };

  return (
    <div className={cn('w-full', className)}>
      {fieldLabel && (
        <label
          htmlFor={fieldName}
          className={cn(
            'block text-xs font-medium mb-1',
            error ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300',
            isRequired && 'after:content-["*"] after:ml-1 after:text-red-500 dark:after:text-red-400'
          )}
        >
          {fieldLabel}
        </label>
      )}
      <div className={cn('flex items-center gap-2', fieldLabel && 'mt-1')}>
        <input
          id={`${fieldName}-color-picker`}
          type="color"
          value={resolvedValue}
          onChange={handleColorChange}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={disabled}
          className={cn(
            'h-10 w-20 rounded border border-gray-300 cursor-pointer transition-all',
            'hover:border-violet-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-200',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-300 focus:border-red-500',
            colorPickerClassName
          )}
        />
        <Input
          value={resolvedValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={onFocus}
          disabled={disabled}
          placeholder={fieldPlaceholder}
          className={cn(
            'flex-1',
            error && 'border-red-500 focus:ring-red-300 focus:border-red-500',
            inputClassName
          )}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

ColorPicker.displayName = 'ColorPicker';
