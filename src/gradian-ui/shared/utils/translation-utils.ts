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

/** Label as string or translation array [{en:"..."}, {fa:"..."}]. */
type LabelInput = string | Array<Record<string, string>> | undefined;

/**
 * Resolve field label from field.translations (label) or field.label.
 * Accepts label as string or TranslatableString (translation array).
 */
export function resolveSchemaFieldLabel(
  field: { label?: LabelInput; translations?: Array<Record<string, string>> },
  lang: string,
  defaultLang: string
): string {
  const resolved = resolveFromTranslationsArray(field.translations, lang, defaultLang);
  if (resolved) return resolved;
  if (field.label == null) return '';
  if (typeof field.label === 'string') return field.label;
  if (isTranslationArray(field.label)) return resolveFromTranslationsArray(field.label, lang, defaultLang);
  return '';
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

// --- Translation array value helpers (for allowTranslation fields) ---

/**
 * Resolve application (or any) display name to a string.
 * Accepts the same format as API applications[].name: string or translation array.
 */
export function resolveDisplayName(
  name: string | Array<Record<string, string>> | undefined,
  lang?: string,
  defaultLang?: string
): string {
  if (name == null) return '';
  const l = lang ?? getDefaultLanguage();
  const d = defaultLang ?? getDefaultLanguage();
  if (isTranslationArray(name)) return resolveFromTranslationsArray(name, l, d);
  return typeof name === 'string' ? name : String(name);
}

/**
 * True if value is a non-empty array of single-key records (e.g. [{ en: "x" }, { fa: "y" }]).
 * Used to distinguish translation array from plain string or other arrays.
 */
export function isTranslationArray(value: unknown): value is Array<Record<string, string>> {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every(
    (entry) =>
      typeof entry === 'object' &&
      entry !== null &&
      !Array.isArray(entry) &&
      Object.keys(entry).length === 1 &&
      Object.values(entry).every((v) => typeof v === 'string')
  );
}

/**
 * Flatten translation array to a record for editing in TranslationDialog.
 * e.g. [{ en: "x" }, { fa: "y" }] -> { en: "x", fa: "y" }
 */
export function translationArrayToRecord(
  arr: Array<Record<string, string>> | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!Array.isArray(arr)) return out;
  for (const rec of arr) {
    for (const [lang, value] of Object.entries(rec)) {
      if (value != null && typeof value === 'string') out[lang] = value;
    }
  }
  return out;
}

/**
 * Build translation array from record, including only non-empty values.
 * e.g. { en: "x", fa: "" } -> [{ en: "x" }]
 */
export function recordToTranslationArray(record: Record<string, string>): Array<Record<string, string>> {
  const result: Array<Record<string, string>> = [];
  for (const [lang, value] of Object.entries(record)) {
    if (value != null && String(value).trim() !== '') result.push({ [lang]: String(value).trim() });
  }
  return result;
}

/**
 * Resolve a display label that may be a string or a translation array.
 * Use for option labels, item names, titles, subtitles, etc. so .trim() and string methods never run on arrays.
 * Returns: resolved string (never throws).
 */
export function resolveDisplayLabel(
  value: unknown,
  lang?: string,
  defaultLang?: string
): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  const l = lang ?? getDefaultLanguage();
  const d = defaultLang ?? getDefaultLanguage();
  if (isTranslationArray(value)) return resolveFromTranslationsArray(value, l, d);
  // Single-key object like { en: "Label" } – treat as one-entry translation
  if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
    const entries = Object.entries(value).filter(
      ([, v]) => v != null && typeof v === 'string' && String(v).trim() !== ''
    );
    if (entries.length > 0) {
      const byLang: LangRecord = Object.fromEntries(entries.map(([k, v]) => [k, String(v).trim()]));
      if (byLang[l]) return byLang[l];
      if (byLang[d]) return byLang[d];
      const first = Object.values(byLang).find(Boolean);
      if (first) return first;
    }
  }
  return String(value);
}
