'use client';

import { useEffect } from 'react';
import { useLanguageStore } from '@/stores/language.store';
import { getDefaultLanguage, getT, isRTL } from '@/gradian-ui/shared/utils/translation-utils';
import { setGlobalTranslator } from '@/gradian-ui/shared/utils/global-translator';

/**
 * Syncs document dir and lang with the current language (for RTL and accessibility).
 * Also sets the global translator so validateField and other utils show translated messages.
 * Renders nothing; only runs effects.
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

  useEffect(() => {
    setGlobalTranslator((key) => getT(key, lang, defaultLang));
    return () => setGlobalTranslator(null);
  }, [lang, defaultLang]);

  return null;
}
