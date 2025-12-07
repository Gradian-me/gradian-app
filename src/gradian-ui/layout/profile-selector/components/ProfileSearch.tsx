// Profile Search Component

import React from 'react';
import { ProfileSearchProps } from '../types';
import { cn } from '../../../shared/utils';

export const ProfileSearch: React.FC<ProfileSearchProps> = ({
  onSearch,
  placeholder = 'Search profiles...',
  value = '',
  className,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch?.(e.target.value);
  };

  const searchClasses = cn(
    'relative',
    className
  );

  const inputClasses = cn(
    'w-full ps-10 pe-4 py-2 border border-gray-300 rounded-md text-sm',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    'placeholder-gray-500'
  );

  return (
    <div className={searchClasses} {...props}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 ps-3 flex items-center pointer-events-none">
          <svg
            className="h-4 w-4 text-gray-400"
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
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={inputClasses}
        />
      </div>
    </div>
  );
};

ProfileSearch.displayName = 'ProfileSearch';
