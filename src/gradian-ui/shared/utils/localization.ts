import { LocalizedField } from '@/types';

const isRecord = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Resolve either a plain string or a localized dictionary into a displayable string.
 */
export const resolveLocalizedField = (
  value: LocalizedField | null | undefined,
  language: string = 'en',
  fallbackLanguage: string = 'en'
): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return '';

  const primary = value[language];
  if (typeof primary === 'string' && primary.trim()) {
    return primary;
  }

  if (fallbackLanguage && fallbackLanguage !== language) {
    const fallback = value[fallbackLanguage];
    if (typeof fallback === 'string' && fallback.trim()) {
      return fallback;
    }
  }

  const firstNonEmpty = Object.values(value).find((entry) => typeof entry === 'string' && entry.trim());
  return (typeof firstNonEmpty === 'string' ? firstNonEmpty.trim() : null) ?? '';
};


