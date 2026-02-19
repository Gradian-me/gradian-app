// Search Bar Component
'use client';

import React from 'react';
import { SearchBarProps } from '../types';
import { cn } from '../../shared/utils';
import { SearchInput } from '../../form-builder/form-elements/components/SearchInput';
import { Button } from '@/components/ui/button';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder,
  value,
  onChange,
  onSearch,
  showSearchButton = false,
  className,
  ...props
}) => {
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const resolvedPlaceholder = placeholder ?? getT(TRANSLATION_KEYS.PLACEHOLDER_SEARCH, language, defaultLang);
  const searchBarClasses = cn(
    'relative flex items-center',
    className
  );

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(value || '');
    }
  };

  const handleChange = (newValue: string) => {
    onChange?.(newValue);
  };

  const handleClear = () => {
    onChange?.('');
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <div className={searchBarClasses} {...props}>
      <div className="relative flex-1">
        <SearchInput
          config={{ name: 'search-bar', placeholder: resolvedPlaceholder }}
          value={value || ''}
          onChange={handleChange}
          onClear={handleClear}
          className="[&_label]:hidden"
          onKeyDown={handleKeyPress}
        />
      </div>
      {showSearchButton && (
        <Button
          variant="default"
          size="default"
          onClick={() => onSearch?.(value || '')}
          className="ms-2"
        >
          Search
        </Button>
      )}
    </div>
  );
};

SearchBar.displayName = 'SearchBar';
