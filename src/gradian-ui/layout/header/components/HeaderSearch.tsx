// Header Search Component

import React, { useState } from 'react';
import { HeaderSearchProps } from '../types';
import { cn } from '../../../shared/utils';

export const HeaderSearch: React.FC<HeaderSearchProps> = ({
  placeholder = 'Search...',
  onSearch,
  onClear,
  value = '',
  className,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [searchValue, setSearchValue] = useState(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    onSearch?.(newValue);
  };

  const handleClear = () => {
    setSearchValue('');
    onClear?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  const searchClasses = cn(
    'relative',
    className
  );

  const inputClasses = cn(
    'w-64 ps-10 pe-10 py-2 border border-gray-300 rounded-md text-sm',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    'placeholder-gray-500',
    isFocused && 'w-80',
    'transition-all duration-200'
  );

  return (
    <div className={searchClasses} {...props}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 ps-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        
        <input
          type="text"
          value={searchValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={inputClasses}
        />
        
        {searchValue && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pe-3 flex items-center"
            aria-label="Clear search"
          >
            <svg
              className="h-5 w-5 text-gray-400 hover:text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

HeaderSearch.displayName = 'HeaderSearch';
