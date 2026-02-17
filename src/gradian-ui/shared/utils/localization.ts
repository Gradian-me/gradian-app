import { LocalizedField } from '@/types';

const isRecord = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Normalize API values that come as array of single-key objects into a single Record.
 * e.g. [{ "en": "Mahyar" }, { "fa": "مهیار" }] → { en: "Mahyar", fa: "مهیار" }
 */
function normalizedToRecord(value: unknown): Record<string, string> | null {
  if (!value) return null;
  if (typeof value === 'string') return null; // handled separately in resolveLocalizedField
  if (Array.isArray(value)) {
    const merged: Record<string, string> = {};
    for (const item of value) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        for (const [lang, val] of Object.entries(item)) {
          if (typeof val === 'string' && lang) merged[lang] = val;
        }
      }
    }
    return Object.keys(merged).length > 0 ? merged : null;
  }
  if (isRecord(value)) return value;
  return null;
}

/**
 * Normalize API name/lastname (string, Record, or array of locale objects) to LocalizedField for storage.
 * Use when setting user in store so stored shape is always string | Record<string, string>.
 */
export function normalizeLocalizedFieldForStorage(value: unknown): LocalizedField | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  const record = normalizedToRecord(value);
  return record ?? undefined;
}

/**
 * Resolve either a plain string, a localized dictionary, or an array of locale objects into a displayable string.
 * Supports API format: name/lastname as [{ "en": "Mahyar" }, { "fa": "مهیار" }].
 */
export const resolveLocalizedField = (
  value: LocalizedField | unknown[] | null | undefined,
  language: string = 'en',
  fallbackLanguage: string = 'en'
): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  const record = normalizedToRecord(value) ?? (isRecord(value) ? value : null);
  if (!record) return '';

  const primary = record[language];
  if (typeof primary === 'string' && primary.trim()) {
    return primary;
  }

  if (fallbackLanguage && fallbackLanguage !== language) {
    const fallback = record[fallbackLanguage];
    if (typeof fallback === 'string' && fallback.trim()) {
      return fallback;
    }
  }

  const firstNonEmpty = Object.values(record).find((entry) => typeof entry === 'string' && entry.trim());
  return (typeof firstNonEmpty === 'string' ? firstNonEmpty.trim() : null) ?? '';
};

/** Keys used by APIs for first/given name (in priority order). */
const NAME_KEYS = ['name', 'firstName', 'first_name'] as const;
/** Keys used by APIs for last/family name (in priority order). */
const LASTNAME_KEYS = ['lastname', 'lastName', 'last_name'] as const;

/**
 * Get display name fields from a user-like object, supporting multiple API shapes
 * (name/lastname, firstName/lastName, first_name/last_name) so the UI shows
 * the user's name based on selected language instead of falling back to email.
 */
export function getDisplayNameFields(
  user: Record<string, unknown> | null | undefined
): { name: LocalizedField | null | undefined; lastname: LocalizedField | null | undefined } {
  if (!user || typeof user !== 'object') {
    return { name: undefined, lastname: undefined };
  }
  const name = NAME_KEYS.map((k) => user[k]).find(
    (v) => v != null && (typeof v === 'string' || (typeof v === 'object' && v !== null))
  ) as LocalizedField | undefined;
  const lastname = LASTNAME_KEYS.map((k) => user[k]).find(
    (v) => v != null && (typeof v === 'string' || (typeof v === 'object' && v !== null))
  ) as LocalizedField | undefined;
  return { name: name ?? undefined, lastname: lastname ?? undefined };
}


