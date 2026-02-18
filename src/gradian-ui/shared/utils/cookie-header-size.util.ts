/**
 * Reduces Cookie header size when forwarding to backends to avoid "400 header or cookies too long".
 * If the full cookie string is under the limit, it is returned as-is. Otherwise returns only
 * cookies needed for auth and app (avoids large/optional cookies like some SSO session cookies).
 */

import { AUTH_CONFIG } from '../configs/auth-config';

/** Default max Cookie header size (bytes). Many servers use 8KB; we trim when over 6KB to stay safe. */
const DEFAULT_MAX_COOKIE_HEADER_BYTES = 6144;

/** Cookie names to keep when trimming (auth and minimal app state). */
const COOKIE_NAMES_TO_KEEP = new Set([
  AUTH_CONFIG.REFRESH_TOKEN_COOKIE,
  AUTH_CONFIG.SESSION_TOKEN_COOKIE,
  AUTH_CONFIG.USER_SESSION_ID_COOKIE,
  'x-fingerprint',
  'selectedCompanyId',
  // SSO / external auth (lowercase for comparison)
  'sso_session',
]);

/**
 * Parse a Cookie header string into a Map of name -> value.
 */
function parseCookieHeader(cookieHeader: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!cookieHeader || !cookieHeader.trim()) return map;
  cookieHeader.split(';').forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) return;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) return;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (name) map.set(name, value);
  });
  return map;
}

/**
 * Build a Cookie header string from a map (name=value; name2=value2).
 */
function buildCookieHeader(map: Map<string, string>): string {
  return Array.from(map.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

/**
 * Returns a cookie header string safe for request size limits.
 * If fullCookieHeader is under maxBytes, returns it unchanged.
 * Otherwise returns only cookies needed for auth/app (smaller header).
 */
export function getCookieHeaderWithinLimit(
  fullCookieHeader: string | undefined | null,
  maxBytes: number = DEFAULT_MAX_COOKIE_HEADER_BYTES
): string | undefined {
  if (!fullCookieHeader || !fullCookieHeader.trim()) return undefined;
  const full = fullCookieHeader.trim();
  if (Buffer.byteLength(full, 'utf8') <= maxBytes) return full;

  const parsed = parseCookieHeader(full);
  const kept = new Map<string, string>();
  const keepLower = (name: string) =>
    COOKIE_NAMES_TO_KEEP.has(name) || COOKIE_NAMES_TO_KEEP.has(name.toLowerCase());
  parsed.forEach((value, name) => {
    if (keepLower(name)) kept.set(name, value);
  });
  const result = buildCookieHeader(kept);
  return result || undefined;
}
