// ColorPicker Component - Now uses Select with predefined Tailwind colors
'use client';

import React from 'react';
import { Select, SelectOption } from './Select';
import { cn } from '../../../shared/utils';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

export interface ColorPickerProps {
  config?: {
    name?: string;
    label?: string;
    placeholder?: string;
    required?: boolean;
    defaultValue?: string;
    options?: SelectOption[];
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

// Tailwind color options with visual representation (reversed order)
const TAILWIND_COLOR_OPTIONS: SelectOption[] = [
  { id: 'rose', label: 'Rose', color: 'bg-rose-500' },
  { id: 'pink', label: 'Pink', color: 'bg-pink-500' },
  { id: 'fuchsia', label: 'Fuchsia', color: 'bg-fuchsia-500' },
  { id: 'purple', label: 'Purple', color: 'bg-purple-500' },
  { id: 'violet', label: 'Violet', color: 'bg-violet-500' },
  { id: 'indigo', label: 'Indigo', color: 'bg-indigo-500' },
  { id: 'blue', label: 'Blue', color: 'bg-blue-500' },
  { id: 'sky', label: 'Sky', color: 'bg-sky-500' },
  { id: 'cyan', label: 'Cyan', color: 'bg-cyan-500' },
  { id: 'teal', label: 'Teal', color: 'bg-teal-500' },
  { id: 'emerald', label: 'Emerald', color: 'bg-emerald-500' },
  { id: 'green', label: 'Green', color: 'bg-green-500' },
  { id: 'lime', label: 'Lime', color: 'bg-lime-500' },
  { id: 'yellow', label: 'Yellow', color: 'bg-yellow-500' },
  { id: 'amber', label: 'Amber', color: 'bg-amber-500' },
  { id: 'orange', label: 'Orange', color: 'bg-orange-500' },
  { id: 'red', label: 'Red', color: 'bg-red-500' },
  { id: 'stone', label: 'Stone', color: 'bg-stone-500' },
  { id: 'neutral', label: 'Neutral', color: 'bg-neutral-500' },
  { id: 'zinc', label: 'Zinc', color: 'bg-zinc-500' },
  { id: 'gray', label: 'Gray', color: 'bg-gray-500' },
  { id: 'slate', label: 'Slate', color: 'bg-slate-500' },
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  config,
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  id,
  className,
  disabled = false,
  required = false,
  placeholder,
}) => {
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const fieldName = config?.name || id || 'color-picker';
  const fieldLabel = config?.label;
  const fieldPlaceholder = placeholder || config?.placeholder || getT(TRANSLATION_KEYS.PLACEHOLDER_SELECT_COLOR, language, defaultLang);
  const isRequired = required || config?.required || config?.validation?.required || false;

  // Use options from config if provided, otherwise use default Tailwind colors
  const colorOptions = config?.options && config.options.length > 0
    ? config.options.map((opt: any) => {
      const colorId = String(opt.id || opt.value || opt);
      const colorName = opt.color || colorId;
      // If color already starts with 'bg-', use it as-is, otherwise prepend 'bg-' and append '-500'
      const colorClass = colorName.startsWith('bg-')
        ? colorName
        : `bg-${colorName}-500`;
      return {
        id: colorId,
        label: opt.label || colorId,
        color: colorClass,
      };
    })
    : TAILWIND_COLOR_OPTIONS;

  // Use defaultValue from config if value is not provided
  const resolvedValue = value ?? config?.defaultValue ?? undefined;

  // Handle value change from Select component
  const handleValueChange = (selectedValue: string) => {
    if (!onChange) return;

    // Support both value handler (new - preferred) and event handler (old - backward compatibility)
    if (typeof onChange === 'function') {
      // Try value handler first (new pattern - preferred)
      (onChange as (value: string) => void)(selectedValue);
    }
    // Trigger onBlur after value change to maintain compatibility
    onBlur?.();
  };

  return (
    <div className={cn('w-full', className)}>
      <Select
        config={{
          name: fieldName,
          label: fieldLabel,
          placeholder: fieldPlaceholder,
          required: isRequired,
          validation: config?.validation,
        }}
        options={colorOptions}
        value={resolvedValue}
        onValueChange={handleValueChange}
        error={error}
        disabled={disabled}
        required={isRequired}
        sortAtoZ={false}
        className={className}
      />
    </div>
  );
};

ColorPicker.displayName = 'ColorPicker';
