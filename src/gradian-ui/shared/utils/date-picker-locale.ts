/**
 * Resolves app language code to react-day-picker locale, dir, and optional Jalali dateLib.
 * Use in DatePickerCalendar and any calendar that should follow the app's selected language.
 * When language has calendar: 'jalali' (e.g. Persian), returns dateLib and numerals for Jalali.
 */
import type { Locale as DayPickerLocale } from 'react-day-picker';
import { enUS, ar, es, fr, de, it, ru, faIR } from 'react-day-picker/locale';
import { faIR as faIRJalali, getDateLib } from 'react-day-picker/persian';
import { getSupportedLocaleByCode } from './language-availables';

const DAY_PICKER_LOCALE_MAP: Record<string, DayPickerLocale> = {
  en: enUS,
  ar,
  es,
  fr,
  de,
  it,
  ru,
  fa: faIR, // Gregorian fallback; overridden when calendar is jalali
};

let cachedJalaliDateLib: ReturnType<typeof getDateLib> | null = null;
function getJalaliDateLib(): ReturnType<typeof getDateLib> {
  if (!cachedJalaliDateLib) cachedJalaliDateLib = getDateLib();
  return cachedJalaliDateLib;
}

export type DayPickerLocaleOptions = {
  locale: DayPickerLocale;
  dir: 'ltr' | 'rtl';
  dateLib?: ReturnType<typeof getDateLib>;
  numerals?: 'arabext';
};

/**
 * Returns react-day-picker locale, dir, and when calendar is Jalali also dateLib and numerals.
 * Uses SUPPORTED_LOCALES from language-availables for isRTL and calendar type.
 */
export function getDayPickerLocaleAndDir(
  code: string | undefined | null
): DayPickerLocaleOptions {
  const normalized = code?.split('-')[0]?.toLowerCase() ?? 'en';
  const supported = getSupportedLocaleByCode(normalized);
  const dir = supported?.isRTL ? 'rtl' : 'ltr';

  if (supported?.calendar === 'jalali') {
    return {
      locale: faIRJalali,
      dir: 'rtl',
      dateLib: getJalaliDateLib(),
      numerals: 'arabext',
    };
  }

  const locale = DAY_PICKER_LOCALE_MAP[normalized] ?? enUS;
  return { locale, dir };
}
