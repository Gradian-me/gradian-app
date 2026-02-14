/**
 * Utilities for resolving engagement createdBy and user display info
 * Handles both string (userId) and backend object format.
 * Supports localized firstName/lastName: string, or [{ en: "x" }, { fa: "y" }], or { en: "x", fa: "y" }.
 */

import type { EngagementCreatedByUser } from '@/domains/engagements/types';
import { resolveFromTranslationsArray } from '@/gradian-ui/shared/utils/translation-utils';

export interface ResolvedUserInfo {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  username?: string | null;
}

type LocalizedValue = string | Array<Record<string, string>> | Record<string, string> | null | undefined;

/** Extract string from localized value (lang → defaultLang → first). */
function getLocalizedString(
  value: LocalizedValue,
  lang: string,
  defaultLang: string
): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return resolveFromTranslationsArray(value, lang, defaultLang);
  if (typeof value === 'object') {
    const merged: Record<string, string> = {};
    for (const [l, v] of Object.entries(value)) {
      if (v != null && String(v).trim() !== '') merged[l] = String(v).trim();
    }
    return merged[lang] ?? merged[defaultLang] ?? (Object.values(merged)[0] ?? '');
  }
  return '';
}

/**
 * Resolve createdBy (string or object) to display info.
 * @param language - Current UI language (e.g. 'en', 'fa'). Default 'en'.
 * @param defaultLang - Fallback language. Default 'en'.
 */
export function resolveCreatedBy(
  createdBy: string | EngagementCreatedByUser | undefined | null,
  language = 'en',
  defaultLang = 'en'
): ResolvedUserInfo | null {
  if (!createdBy) return null;

  if (typeof createdBy === 'string') {
    return { userId: createdBy, displayName: createdBy, avatarUrl: null };
  }

  const user = createdBy as unknown as Record<string, unknown>;
  const userId = (user.userId ?? '') as string;
  if (!userId) return null;

  const firstName = getLocalizedString(user.firstName as LocalizedValue, language, defaultLang);
  const lastName = getLocalizedString(user.lastName as LocalizedValue, language, defaultLang);
  const parts = [firstName, lastName].filter(Boolean);
  const fullName = parts.join(' ').trim();
  const displayName = fullName || (user.username as string) || userId;

  return {
    userId,
    displayName,
    avatarUrl: (user.avatarUrl as string | null | undefined) ?? null,
    username: (user.username as string | null | undefined) ?? null,
  };
}
