// Search Bar Component

import React from 'react';
import { SearchBarProps } from '../types';
import { cn } from '../../shared/utils';
import { SearchInput } from '../../form-builder/form-elements/components/SearchInput';
import { Button } from '@/components/ui/button';

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search...',
  value,
  onChange,
  onSearch,
  showSearchButton = false,
  className,
  ...props
}) => {
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
          config={{ name: 'search-bar', placeholder }}
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
