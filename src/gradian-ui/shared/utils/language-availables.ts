/**
 * Supported app locales/languages.
 * Use in LanguageSelector, TranslationDialog, and anywhere a locale list is needed.
 * When NEXT_PUBLIC_AVAILABLE_LANGUAGES is set (e.g. "en,fa,ar"), only those codes are shown.
 * When unset or empty, all supported locales are shown.
 */

import { getAvailableLanguageCodes } from '@/gradian-ui/shared/configs/env-config';

export type SupportedLocale = {
  code: string;
  label: string;
  isRTL: boolean;
  locale: string;
  /** ISO 3166-1 alpha-2 country code for flag-icons (e.g. 'us', 'ir'). When set, LanguageSelector shows flag instead of icon. */
  flag?: string;
};

const ALL_SUPPORTED_LOCALES: SupportedLocale[] = [
  { code: 'en', label: 'English', isRTL: false, locale: 'en-US', flag: 'gb' },
  { code: 'fa', label: 'فارسی', isRTL: true, locale: 'fa-IR', flag: 'ir' },
  { code: 'ar', label: 'العربية', isRTL: true, locale: 'ar', flag: 'sa' },
  { code: 'es', label: 'Español', isRTL: false, locale: 'es', flag: 'es' },
  { code: 'fr', label: 'Français', isRTL: false, locale: 'fr', flag: 'fr' },
  { code: 'de', label: 'Deutsch', isRTL: false, locale: 'de', flag: 'de' },
  { code: 'it', label: 'Italiano', isRTL: false, locale: 'it', flag: 'it' },
  { code: 'ru', label: 'Русский', isRTL: false, locale: 'ru', flag: 'ru' },
];

const availableCodes = getAvailableLanguageCodes();
const filterByEnv = availableCodes.length > 0;

/** Locales available in the app. All when AVAILABLE_LANGUAGES is unset; otherwise only env-listed codes. */
export const SUPPORTED_LOCALES: SupportedLocale[] = filterByEnv
  ? ALL_SUPPORTED_LOCALES.filter((item) => availableCodes.includes(item.code))
  : [...ALL_SUPPORTED_LOCALES];
