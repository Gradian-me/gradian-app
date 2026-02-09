'use client';

import { useEffect } from 'react';
import { useLanguageStore } from '@/stores/language.store';
import { getDefaultLanguage, getT, isRTL } from '@/gradian-ui/shared/utils/translation-utils';
import { setGlobalTranslator } from '@/gradian-ui/shared/utils/global-translator';

const LANGUAGE_STORAGE_KEY = 'language-store';

/**
 * Syncs document dir and lang with the current language (for RTL and accessibility).
 * Also sets the global translator so validateField and other utils show translated messages.
 * Listens for storage events so language changes in other tabs apply without refresh.
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

  // Cross-tab sync: when another tab changes language (writes to localStorage), rehydrate so this tab updates
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY && event.newValue != null) {
        useLanguageStore.persist.rehydrate();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return null;
}
