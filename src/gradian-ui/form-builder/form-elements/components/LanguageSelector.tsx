// LanguageSelector Component
'use client';

import React from 'react';
import { FormElementProps } from '../types';
import { Select, SelectOption } from './Select';

export interface LanguageSelectorProps extends Omit<FormElementProps, 'config'> {
  config?: any;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  defaultLanguage?: string;
}

// Default language options with icons and colors
const DEFAULT_LANGUAGES: SelectOption[] = [
  {
    id: 'en',
    value: 'en',
    label: 'English',
    icon: 'Languages',
    color: 'default',
  },
  {
    id: 'fa',
    value: 'fa',
    label: 'فارسی',
    icon: 'Languages',
    color: 'default',
  },
  {
    id: 'ar',
    value: 'ar',
    label: 'العربية',
    icon: 'Languages',
    color: 'default',
  },
  {
    id: 'es',
    value: 'es',
    label: 'Español',
    icon: 'Languages',
    color: 'default',
  },
  {
    id: 'fr',
    value: 'fr',
    label: 'Français',
    icon: 'Languages',
    color: 'default',
  },
  {
    id: 'de',
    value: 'de',
    label: 'Deutsch',
    icon: 'Languages',
    color: 'default',
  },
  {
    id: 'it',
    value: 'it',
    label: 'Italiano',
    icon: 'Languages',
    color: 'default',
  },
  {
    id: 'pt',
    value: 'pt',
    label: 'Português',
    icon: 'Languages',
    color: 'default',
  },
  {
    id: 'ru',
    value: 'ru',
    label: 'Русский',
    icon: 'Languages',
    color: 'default',
  },
  {
    id: 'zh',
    value: 'zh',
    label: '中文',
    icon: 'Languages',
    color: 'default',
  },
  {
    id: 'ja',
    value: 'ja',
    label: '日本語',
    icon: 'Languages',
    color: 'default',
  },
  {
    id: 'ko',
    value: 'ko',
    label: '한국어',
    icon: 'Languages',
    color: 'default',
  },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  config,
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  disabled,
  required,
  className,
  placeholder,
  defaultLanguage = 'en',
  ...props
}) => {
  // Get languages from config or use defaults
  const languages = config?.options || DEFAULT_LANGUAGES;
  
  // Get field configuration
  const fieldName = config?.name || config?.id || 'language';
  // Use label from config if provided and not empty, otherwise default to 'Language'
  // Empty string means explicitly hide the label (when form builder renders its own)
  const fieldLabel = config?.label === '' ? '' : (config?.label || 'Language');
  const fieldPlaceholder = placeholder || config?.placeholder || 'Select language...';
  const fieldIcon = config?.icon;
  const fieldColor = config?.color;
  
  // Merge icon and color from config into options if provided
  const optionsWithConfig = languages.map((lang: SelectOption) => ({
    ...lang,
    icon: lang.icon || fieldIcon,
    color: lang.color || fieldColor || 'default',
  }));

  // Handle value change
  const handleValueChange = (selectedValue: string) => {
    if (onChange) {
      onChange(selectedValue);
    }
  };

  // Handle normalized change (from Select component)
  const handleNormalizedChange = (selection: any[]) => {
    if (selection && selection.length > 0 && onChange) {
      const selectedId = selection[0]?.id || selection[0]?.value;
      onChange(selectedId);
    } else if (onChange) {
      onChange('');
    }
  };

  // Use default language if no value is provided
  const currentValue = value || (config?.defaultValue !== undefined ? config.defaultValue : defaultLanguage);

  // Extract onBlur and onFocus from props since Select doesn't support them
  // Note: onBlur and onFocus are separate parameters, not in props
  const { touched, ...restProps } = props;

  return (
    <div className="w-full">
      <Select
        config={{
          ...config,
          name: fieldName,
          label: fieldLabel,
          placeholder: fieldPlaceholder,
        }}
        value={currentValue}
        onValueChange={handleValueChange}
        onNormalizedChange={handleNormalizedChange}
        options={optionsWithConfig}
        disabled={disabled}
        error={error}
        required={required}
        placeholder={fieldPlaceholder}
        className={className}
        {...restProps}
      />
    </div>
  );
};

LanguageSelector.displayName = 'LanguageSelector';

