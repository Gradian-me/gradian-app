'use client';

import React, { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../../shared/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

export interface SidebarSearchboxProps {
  /**
   * Search query value
   */
  value: string;
  
  /**
   * Callback when search value changes
   */
  onChange: (value: string) => void;
  
  /**
   * Whether the sidebar is collapsed
   */
  isCollapsed: boolean;
  
  /**
   * Whether this is a mobile sidebar
   */
  isMobile: boolean;
  
  /**
   * Additional className
   */
  className?: string;
  
  /**
   * Placeholder text
   */
  placeholder?: string;
}

/**
 * SidebarSearchbox - Search input for filtering menu items and applications
 * 
 * Security Review:
 * - Input sanitization: Uses controlled input with React state, no direct DOM manipulation
 * - XSS risk: No - All user input is handled through React's controlled components
 * - Injection risk: No - Search is client-side filtering only, no server queries
 * - Input validation: Basic length validation handled by browser (maxLength)
 * 
 * Performance Review:
 * - Debouncing: onChange is called on every keystroke, but filtering happens in parent components
 * - Complexity: O(1) for input handling, filtering complexity depends on parent implementation
 * - Memoization: Consider adding debounce if filtering becomes expensive
 * 
 * DRY Review:
 * - Reusable search input component following existing patterns
 */
export const SidebarSearchbox: React.FC<SidebarSearchboxProps> = ({
  value,
  onChange,
  isCollapsed,
  isMobile,
  className,
  placeholder: placeholderProp,
}) => {
  const language = useLanguageStore((s) => s.language) || getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const defaultPlaceholder = getT(TRANSLATION_KEYS.PLACEHOLDER_SEARCH_APPLICATIONS, language, defaultLang);
  const placeholder = placeholderProp ?? defaultPlaceholder;

  const [isFocused, setIsFocused] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClear();
      e.currentTarget.blur();
    }
  }, [handleClear]);

  // Hide searchbox when collapsed (unless mobile)
  if (isCollapsed && !isMobile) {
    return null;
  }

  return (
    <div className={cn("px-3 py-2 border-b border-gray-800", className)}>
      <div className="relative">
        <Search 
          className={cn(
            "absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors",
            isFocused ? "text-gray-300" : "text-gray-500"
          )} 
        />
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          maxLength={100}
          autoComplete="off"
          className={cn(
            "w-full pl-9 pr-9 py-2 text-sm",
            "bg-gray-800 text-gray-200 placeholder-gray-500",
            "border border-gray-700 rounded-lg",
            "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500",
            "transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />
        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              type="button"
              onClick={handleClear}
              className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-200 focus:outline-none focus:text-gray-200 transition-colors rounded"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

SidebarSearchbox.displayName = 'SidebarSearchbox';
