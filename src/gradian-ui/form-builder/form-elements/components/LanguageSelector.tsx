// LanguageSelector Component
'use client';

import React from 'react';
import { FormElementProps } from '../types';
import { Select, SelectOption } from './Select';
import { getDefaultLanguage, getT } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { useLanguageStore } from '@/stores/language.store';
import { SUPPORTED_LOCALES } from '@/gradian-ui/shared/utils/date-utils';

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

// Default language options from date-utils (each option includes locale e.g. 'en-US' for formatting)
const DEFAULT_LANGUAGES: SelectOption[] = SUPPORTED_LOCALES.map(({ code, label, isRTL, locale }) => ({
  id: code,
  value: code,
  label,
  icon: 'Languages',
  color: 'default',
  isRTL,
  locale,
}));

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
  defaultLanguage,
  ...props
}) => {
  const defaultLang = defaultLanguage ?? getDefaultLanguage();
  const language = useLanguageStore((s) => s.language) || defaultLang;
  const defaultLabel = getT(TRANSLATION_KEYS.LABEL_LANGUAGE, language, defaultLang);
  const defaultPlaceholder = getT(TRANSLATION_KEYS.PLACEHOLDER_SELECT_LANGUAGE, language, defaultLang);

  // Get languages from config or use defaults
  const languages = config?.options || DEFAULT_LANGUAGES;

  // Get field configuration
  const fieldName = config?.name || config?.id || 'language';
  // Use label from config if provided and not empty, otherwise default to translated 'Language'
  // Empty string means explicitly hide the label (when form builder renders its own)
  const fieldLabel = config?.label === '' ? '' : (config?.label || defaultLabel);
  const fieldPlaceholder = placeholder || config?.placeholder || defaultPlaceholder;
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
  const currentValue = value || (config?.defaultValue !== undefined ? config.defaultValue : defaultLang);

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

