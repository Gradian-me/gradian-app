'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/gradian-ui/shared/utils';
import { Grid3X3, List } from 'lucide-react';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { useLanguageStore } from '@/stores/language.store';

export type PopupViewMode = 'grid' | 'list';

export interface PopupViewSwitcherProps {
  value: PopupViewMode;
  onChange: (mode: PopupViewMode) => void;
  className?: string;
  disabled?: boolean;
}

export const PopupViewSwitcher: React.FC<PopupViewSwitcherProps> = ({
  value,
  onChange,
  className,
  disabled = false,
}) => {
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const ariaGrid = getT(TRANSLATION_KEYS.ARIA_GRID_VIEW, language, defaultLang);
  const ariaList = getT(TRANSLATION_KEYS.ARIA_LIST_VIEW, language, defaultLang);

  return (
    <div className={cn('flex items-center rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50/50 dark:bg-gray-800/50', className)} role="group" aria-label="View mode">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange('grid')}
        disabled={disabled}
        aria-label={ariaGrid}
        aria-pressed={value === 'grid'}
        className={cn(
          'h-8 px-2.5 rounded-md transition-colors',
          value === 'grid'
            ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-600 dark:text-violet-400'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
        )}
      >
        <Grid3X3 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange('list')}
        disabled={disabled}
        aria-label={ariaList}
        aria-pressed={value === 'list'}
        className={cn(
          'h-8 px-2.5 rounded-md transition-colors',
          value === 'list'
            ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-600 dark:text-violet-400'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
        )}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
};

PopupViewSwitcher.displayName = 'PopupViewSwitcher';
