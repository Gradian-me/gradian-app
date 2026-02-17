import { formatDistanceToNow, format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { faIR } from 'date-fns/locale/fa-IR';
import { ar } from 'date-fns/locale/ar';
import { es } from 'date-fns/locale/es';
import { fr } from 'date-fns/locale/fr';
import { de } from 'date-fns/locale/de';
import { it } from 'date-fns/locale/it';
import { ru } from 'date-fns/locale/ru';
import type { Locale } from 'date-fns';
import { isRTL } from './translation-utils';
import { format as formatJalali, formatDistanceToNow as formatDistanceToNowJalali } from 'date-fns-jalali';
import { faIR as faIRJalali } from 'date-fns-jalali/locale/fa-IR';

export { SUPPORTED_LOCALES } from './language-availables';

const LOCALE_MAP: Record<string, Locale> = {
  en: enUS,
  fa: faIR,
  ar,
  es,
  fr,
  de,
  it,
  ru,
};

/** True when locale is Persian (fa) – use Shamsi/Jalali calendar for formatting. */
function isPersianLocale(localeCode?: string | null): boolean {
  if (!localeCode) return false;
  return localeCode.split('-')[0].toLowerCase() === 'fa';
}

/** Resolves a locale code (e.g. "en", "en-US") to a date-fns Locale. */
export function getLocale(localeCode?: string | null): Locale {
  if (!localeCode) return enUS;
  const normalized = localeCode.split('-')[0].toLowerCase();
  return LOCALE_MAP[normalized] ?? enUS;
}

/**
 * Returns whether the given locale is RTL (e.g. Arabic, Persian).
 * Use when rendering date/time tooltips so the tooltip content has dir="rtl".
 */
export function isLocaleRTL(localeCode?: string | null): boolean {
  if (!localeCode) return false;
  const lang = localeCode.split('-')[0];
  return isRTL(lang);
}

/**
 * Formats a date as a relative time (e.g., "11 months ago", "حدود ۴ ساعت پیش" in fa)
 * @param date - The date to format
 * @param options - Optional: addSuffix (default true), localeCode (e.g. 'en', 'fa', 'ar') for translation
 * @returns Formatted relative time string
 */
export function formatRelativeTime(
  date: Date | string,
  options?: { addSuffix?: boolean; localeCode?: string | null }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isPersianLocale(options?.localeCode)) {
    return formatDistanceToNowJalali(dateObj, {
      addSuffix: options?.addSuffix ?? true,
      locale: faIRJalali,
    });
  }
  const locale = getLocale(options?.localeCode);
  return formatDistanceToNow(dateObj, {
    addSuffix: options?.addSuffix ?? true,
    locale,
  });
}

/**
 * Formats a date in a readable format (e.g., "December 10, 2024 at 11:00 AM")
 * @param date - The date to format
 * @param localeCode - Optional language code (e.g. 'en', 'fa') for localized output
 */
export function formatFullDate(date: Date | string, localeCode?: string | null): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isPersianLocale(localeCode)) {
    return formatJalali(dateObj, 'PPpp', { locale: faIRJalali });
  }
  return format(dateObj, 'PPpp', { locale: getLocale(localeCode) });
}

/**
 * Formats a date in a short format (e.g., "Dec 10, 2024 11:00 AM")
 */
export function formatShortDate(date: Date | string, localeCode?: string | null): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isPersianLocale(localeCode)) {
    return formatJalali(dateObj, 'MMM dd, yyyy HH:mm', { locale: faIRJalali });
  }
  return format(dateObj, 'MMM dd, yyyy HH:mm', { locale: getLocale(localeCode) });
}

/**
 * Formats a date with date and time (e.g., "Dec 10, 2024 11:00 AM", or Jalali for fa)
 */
export function formatDateTime(date: Date | string, localeCode?: string | null): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isPersianLocale(localeCode)) {
    return formatJalali(dateObj, 'MMM dd, yyyy HH:mm', { locale: faIRJalali });
  }
  return format(dateObj, 'MMM dd, yyyy HH:mm', { locale: getLocale(localeCode) });
}

/**
 * Formats a date for display (e.g., "December 10, 2024")
 */
export function formatDate(date: Date | string, localeCode?: string | null): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isPersianLocale(localeCode)) {
    return formatJalali(dateObj, 'PPP', { locale: faIRJalali });
  }
  return format(dateObj, 'PPP', { locale: getLocale(localeCode) });
}

/**
 * Formats a date with time only (e.g., "11:00 AM")
 */
export function formatTime(date: Date | string, localeCode?: string | null): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'p', { locale: getLocale(localeCode) });
}

/**
 * Creates a formatted "Created" label with relative time and full date for tooltip
 * @param date - The date to format
 * @param localeCode - Optional language code (e.g. 'en', 'fa') for localized output
 * @returns Object with display text and tooltip text
 */
export function formatCreatedLabel(date: Date | string, localeCode?: string | null): {
  display: string;
  tooltip: string;
  /** @deprecated Use `tooltip` instead. Kept for backward compatibility. */
  title: string;
} {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const tooltipText = formatFullDate(dateObj, localeCode);
  return {
    display: formatRelativeTime(dateObj, { addSuffix: true, localeCode }),
    tooltip: tooltipText,
    title: tooltipText,
  };
}

/**
 * Formats a date with custom format string
 */
export function formatCustom(
  date: Date | string,
  formatString: string,
  localeCode?: string | null
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isPersianLocale(localeCode)) {
    return formatJalali(dateObj, formatString, { locale: faIRJalali });
  }
  return format(dateObj, formatString, { locale: getLocale(localeCode) });
}

/**
 * Formats a date with date and time, with fallback for null/empty values
 * @param dateString - The date string to format (can be null or empty)
 * @param fallback - Fallback text when date is null/empty (default: 'Never')
 * @returns Formatted date string or fallback
 * 
 * @example
 * formatDateTimeWithFallback('2024-12-10T10:30:00Z') // "Dec 10, 2024 10:30 AM"
 * formatDateTimeWithFallback(null) // "Never"
 * formatDateTimeWithFallback(null, 'Not set') // "Not set"
 */
export function formatDateTimeWithFallback(
  dateString: string | null | undefined,
  fallback: string = 'Never'
): string {
  if (!dateString) return fallback;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return fallback;
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  } catch {
    return fallback;
  }
}

/**
 * Gets the current date and time in format: yyyy-MM-dd HH:mm:ss.ms
 * Useful for AI prompts and time-related analytics
 * @returns Formatted date/time string (e.g., "2025-01-22 14:30:45.123")
 */
export function getCurrentDateTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

