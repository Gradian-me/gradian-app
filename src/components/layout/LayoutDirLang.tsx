'use client';

import { useEffect } from 'react';
import { useLanguageStore } from '@/stores/language.store';
import { getDefaultLanguage, isRTL } from '@/gradian-ui/shared/utils/translation-utils';

/**
 * Syncs document dir and lang with the current language (for RTL and accessibility).
 * Renders nothing; only sets document.documentElement.dir and .lang in useEffect.
 */
export function LayoutDirLang() {
  const language = useLanguageStore((state) => state.language);
  const defaultLang = getDefaultLanguage();
  const lang = language || defaultLang;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('dir', isRTL(lang) ? 'rtl' : 'ltr');
    root.setAttribute('lang', lang);
  }, [lang]);

  return null;
}
