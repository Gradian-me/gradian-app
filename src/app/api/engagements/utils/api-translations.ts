/**
 * Locale and message translation for engagement API routes.
 * Reads Accept-Language or ?locale= and returns translated messages with optional {{param}} replacement.
 */

import { NextRequest } from 'next/server';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

const DEFAULT_LANG = getDefaultLanguage();

/**
 * Parse Accept-Language and return the first preferred language code (e.g. "en", "fa").
 */
function getLangFromAcceptLanguage(header: string | null): string {
  if (!header || !header.trim()) return DEFAULT_LANG;
  const parts = header.split(',').map((p) => p.trim().split(';')[0]);
  const first = parts[0];
  if (!first) return DEFAULT_LANG;
  return first.includes('-') ? first.slice(0, first.indexOf('-')) : first;
}

/**
 * Get { lang, defaultLang } from request: ?locale=, Accept-Language, or default.
 */
export function getLocaleFromRequest(request: NextRequest): {
  lang: string;
  defaultLang: string;
} {
  const { searchParams } = new URL(request.url);
  const localeParam = searchParams.get('locale')?.trim().toLowerCase();
  if (localeParam) {
    const lang = localeParam.includes('-') ? localeParam.slice(0, localeParam.indexOf('-')) : localeParam;
    return { lang, defaultLang: DEFAULT_LANG };
  }
  const acceptLanguage = request.headers.get('accept-language');
  const lang = getLangFromAcceptLanguage(acceptLanguage);
  return { lang, defaultLang: DEFAULT_LANG };
}

/**
 * Get translated message for a key, then replace {{param}} placeholders.
 */
export function getApiMessage(
  request: NextRequest,
  key: string,
  params?: Record<string, string>,
): string {
  const { lang, defaultLang } = getLocaleFromRequest(request);
  let msg = getT(key, lang, defaultLang);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
    }
  }
  return msg;
}

export { TRANSLATION_KEYS };
