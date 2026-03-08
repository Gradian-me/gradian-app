/**
 * Login embed origin checks. Embedding and camera/microphone are allowed for any subdomain
 * of NEXT_PUBLIC_DEFAULT_DOMAIN (e.g. *.cinnagen.com). Middleware sets CSP/Permissions-Policy
 * per request using Referer; client uses this for postMessage validation.
 *
 * Env: NEXT_PUBLIC_DEFAULT_DOMAIN (e.g. "cinnagen.com") — base host; any subdomain is allowed.
 */

const BASE_HOST =
  typeof process.env.NEXT_PUBLIC_DEFAULT_DOMAIN === 'string'
    ? process.env.NEXT_PUBLIC_DEFAULT_DOMAIN.trim().toLowerCase()
    : '';

function isSubdomainOfBaseHost(hostname: string): boolean {
  if (!BASE_HOST) return false;
  const h = hostname.toLowerCase();
  return h === BASE_HOST || h.endsWith('.' + BASE_HOST);
}

/** Returns true if origin is allowed to embed the login modal (wildcard: any subdomain of DEFAULT_DOMAIN, or localhost in dev). */
export function isOriginAllowedForLoginEmbed(origin: string | null | undefined): boolean {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    const hostname = u.hostname.toLowerCase();
    if (isSubdomainOfBaseHost(hostname)) return true;
    if (process.env.NODE_ENV !== 'production' && (hostname === 'localhost' || hostname === '127.0.0.1')) return true;
    return false;
  } catch {
    return false;
  }
}

/** Builds a list of allowed origins for callers that need an array (e.g. validateMessageOrigin). Only explicit list + localhost in dev; for wildcard use isOriginAllowedForLoginEmbed. */
export function getLoginEmbedAllowedOrigins(): string[] {
  const list: string[] = [];
  if (BASE_HOST) {
    list.push(`https://${BASE_HOST}`, `http://${BASE_HOST}`);
  }
  if (process.env.NODE_ENV !== 'production') {
    list.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }
  return list;
}
