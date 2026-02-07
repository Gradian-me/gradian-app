/**
 * Translation utilities: key-based app strings and schema field label/placeholder resolution.
 * For user/API localized fields (LocalizedField), use resolveLocalizedField from localization.ts.
 */

import { TRANSLATIONS } from '@/gradian-ui/shared/constants/translations';

type LangRecord = Record<string, string>;

/** Map: translation key -> Record<langCode, string> for O(1) lookup */
let appTranslationsMap: Map<string, LangRecord> | null = null;

function getAppTranslationsMap(): Map<string, LangRecord> {
  if (appTranslationsMap) return appTranslationsMap;
  const map = new Map<string, LangRecord>();
  for (const entry of TRANSLATIONS) {
    const merged: LangRecord = {};
    for (const rec of entry.translations) {
      for (const [lang, value] of Object.entries(rec)) {
        if (value != null && value.trim() !== '') merged[lang] = value;
      }
    }
    map.set(entry.key, merged);
  }
  appTranslationsMap = map;
  return map;
}

/**
 * Resolve a value from an array of single-key records (e.g. [{ en: "Edit" }, { fa: "ویرایش" }]).
 * Fallback order: lang -> defaultLang -> first available.
 */
export function resolveFromTranslationsArray(
  arr: Array<Record<string, string>> | undefined,
  lang: string,
  defaultLang: string
): string {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  const merged: LangRecord = {};
  for (const rec of arr) {
    for (const [l, value] of Object.entries(rec)) {
      if (value != null && String(value).trim() !== '') merged[l] = String(value).trim();
    }
  }
  if (merged[lang]) return merged[lang];
  if (defaultLang && merged[defaultLang]) return merged[defaultLang];
  const first = Object.values(merged).find(Boolean);
  return first ?? '';
}

/**
 * Return default language from env or 'en'.
 * Safe for server and client (NEXT_PUBLIC_* is available on both).
 */
export function getDefaultLanguage(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_DEFAULT_LANGUAGE) {
    const v = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE.trim();
    if (v) return v;
  }
  return 'en';
}

/**
 * Get translated string for a key. Fallback: lang -> defaultLang -> first available.
 */
export function getT(
  key: string,
  lang?: string,
  defaultLang?: string
): string {
  const map = getAppTranslationsMap();
  const rec = map.get(key);
  if (!rec) return key;
  const l = lang ?? getDefaultLanguage();
  const d = defaultLang ?? getDefaultLanguage();
  if (rec[l]) return rec[l];
  if (rec[d]) return rec[d];
  const first = Object.values(rec).find(Boolean);
  return first ?? key;
}

/**
 * Get translations array for a key (e.g. for FormAlert message prop).
 * Returns Array<Record<string, string>> like [{ en: '...' }, { fa: '...' }].
 */
export function getTranslationsArray(key: string): Array<Record<string, string>> {
  const map = getAppTranslationsMap();
  const rec = map.get(key);
  if (!rec) return [];
  return Object.entries(rec).map(([lang, value]) => ({ [lang]: value }));
}

/**
 * Resolve field label from field.translations (label) or field.label.
 */
export function resolveSchemaFieldLabel(
  field: { label?: string; translations?: Array<Record<string, string>> },
  lang: string,
  defaultLang: string
): string {
  const resolved = resolveFromTranslationsArray(field.translations, lang, defaultLang);
  if (resolved) return resolved;
  return typeof field.label === 'string' ? field.label : '';
}

/**
 * Resolve field placeholder from field.placeholderTranslations or field.placeholder.
 */
export function resolveSchemaFieldPlaceholder(
  field: {
    placeholder?: string;
    placeholderTranslations?: Array<Record<string, string>>;
  },
  lang: string,
  defaultLang: string
): string {
  const resolved = resolveFromTranslationsArray(
    field.placeholderTranslations,
    lang,
    defaultLang
  );
  if (resolved) return resolved;
  return typeof field.placeholder === 'string' ? field.placeholder : '';
}

/** RTL language codes (e.g. Arabic, Persian). */
const RTL_LANGS = new Set(['ar', 'fa']);

export function isRTL(lang: string): boolean {
  return RTL_LANGS.has(String(lang).toLowerCase());
}
