import { NextRequest, NextResponse } from 'next/server';
import { proxy } from './proxy';

/** Base host for login embed wildcard (e.g. cinnagen.com). Any subdomain is allowed. */
const LOGIN_EMBED_BASE_HOST = process.env.NEXT_PUBLIC_DEFAULT_DOMAIN?.trim() ?? '';

function isSubdomainOfBaseHost(hostname: string): boolean {
  if (!LOGIN_EMBED_BASE_HOST) return false;
  return hostname === LOGIN_EMBED_BASE_HOST || hostname.endsWith('.' + LOGIN_EMBED_BASE_HOST);
}

/** If Referer is present and its origin is allowed (subdomain of DEFAULT_DOMAIN or localhost in dev), return that origin. */
function getRefererOriginIfAllowed(request: NextRequest): string | null {
  const referer = request.headers.get('referer');
  if (!referer) return null;
  try {
    const u = new URL(referer);
    const hostname = u.hostname.toLowerCase();
    if (isSubdomainOfBaseHost(hostname)) return u.origin;
    if (process.env.NODE_ENV !== 'production' && (hostname === 'localhost' || hostname === '127.0.0.1')) return u.origin;
    return null;
  } catch {
    return null;
  }
}

/** Permissions-Policy: allow camera/microphone for same origin (barcode scanner, etc.). Set in middleware so it is not stripped by reverse proxies. */
const PERMISSIONS_POLICY = 'camera=(self), microphone=(self), geolocation=(self), interest-cohort=()';

/** CSP including connect-src for ZXing WASM (cdn.jsdelivr.net). Set in middleware so production/proxy cannot strip it and block barcode scanner. */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' blob: https://*.cinnagen.com https://cg-gr-app.cinnagen.com:5001 https://www.gstatic.com https://cdn.jsdelivr.net https://fastly.jsdelivr.net",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "media-src 'self' https: blob:",
  "worker-src 'self' blob:",
].join('; ');

const LOGIN_MODAL_CSP_BASE = [
  "default-src 'self'",
  "base-uri 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' blob: https://*.cinnagen.com https://cg-gr-app.cinnagen.com:5001 https://www.gstatic.com https://cdn.jsdelivr.net https://fastly.jsdelivr.net",
  "object-src 'none'",
  "media-src 'self' https: blob:",
  "worker-src 'self' blob:",
];

/** Shared security header values so next.config does not duplicate (single source in middleware). */
const SECURITY_HEADERS: [string, string][] = [
  ['X-DNS-Prefetch-Control', 'on'],
  ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'],
  ['X-Frame-Options', 'SAMEORIGIN'],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-XSS-Protection', '1; mode=block'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
];

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('Permissions-Policy', PERMISSIONS_POLICY);
  response.headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  for (const [key, value] of SECURITY_HEADERS) {
    response.headers.set(key, value);
  }
  return response;
}

function withLoginModalHeaders(response: NextResponse, refererOrigin: string | null): NextResponse {
  const frameAncestors = refererOrigin ? `'self' ${refererOrigin}` : "'self'";
  const csp = [...LOGIN_MODAL_CSP_BASE, `frame-ancestors ${frameAncestors}`].join('; ');
  response.headers.set('Content-Security-Policy', csp);
  const permPolicy = refererOrigin
    ? `camera=(self "${refererOrigin}"), microphone=(self "${refererOrigin}"), geolocation=(self), interest-cohort=()`
    : 'camera=(self), microphone=(self), geolocation=(self), interest-cohort=()';
  response.headers.set('Permissions-Policy', permPolicy);
  for (const [key, value] of SECURITY_HEADERS) {
    response.headers.set(key, value);
  }
  return response;
}

// Next.js middleware must be exported as default with name 'middleware'
export default async function middleware(request: NextRequest) {
  // Add immediate logging to verify middleware is running
  // Use both console.log and console.error to ensure visibility
  const pathname = request.nextUrl.pathname;
  console.error('[MIDDLEWARE] ========== MIDDLEWARE CALLED ==========');
  console.error('[MIDDLEWARE] Pathname:', pathname);
  console.error('[MIDDLEWARE] URL:', request.url);
  console.error('[MIDDLEWARE] Method:', request.method);
  
  // Log cookies to verify they're being passed
  const cookies = request.headers.get('cookie');
  console.error('[MIDDLEWARE] Cookies present:', !!cookies);
  if (cookies) {
    const cookieNames = cookies.split(';').map(c => c.trim().split('=')[0]);
    console.error('[MIDDLEWARE] Cookie names:', cookieNames.join(', '));
  }
  
  const response = await proxy(request);

  if (pathname === '/authentication/login-modal') {
    const refererOrigin = getRefererOriginIfAllowed(request);
    return withLoginModalHeaders(response, refererOrigin);
  }

  return withSecurityHeaders(response);
}

// Middleware config - must be defined directly, not re-exported
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - enc.js (webpack-obfuscator encoding helper)
     * Note: API routes are included to handle token refresh
     */
    '/((?!_next/static|_next/image|favicon.ico|enc.js).*)',
  ],
};

