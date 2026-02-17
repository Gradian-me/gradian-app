import { NextRequest, NextResponse } from 'next/server';
import { encryptReturnUrl } from '@/gradian-ui/shared/utils/url-encryption.util';
import { extractTokenFromCookiesEdge } from '@/gradian-ui/shared/utils/edge-token-validation.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { decryptSkipKey } from '@/gradian-ui/shared/utils/decrypt-skip-key';
import { LOGIN_LOCALLY } from '@/gradian-ui/shared/configs/env-config';
import {
  EXCLUDED_LOGIN_ROUTES,
  AUTH_CONFIG,
  FORBIDDEN_ROUTES_PRODUCTION,
  PUBLIC_PAGES,
} from '@/gradian-ui/shared/configs/auth-config';

/**
 * Edge-compatible: Build authentication service URL
 */
function buildAuthServiceUrlEdge(path: string): string {
  const baseUrl = process.env.URL_AUTHENTICATION;
  if (!baseUrl) {
    throw new Error('URL_AUTHENTICATION is not configured');
  }
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
}

/**
 * Edge-compatible: Build proxy headers for external auth requests
 */
function buildProxyHeadersEdge(request: NextRequest): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  const fingerprintHeader = request.headers.get('x-fingerprint');
  if (fingerprintHeader) {
    headers['x-fingerprint'] = fingerprintHeader;
  }

  const authorizationHeader = request.headers.get('authorization');
  if (authorizationHeader) {
    headers.authorization = authorizationHeader;
  }

  // Extract tenant domain for forwarding to external backend
  // Flow:
  // 1. Internal Next.js API requests include x-tenant-domain header
  // 2. External backend proxy gets x-tenant-domain from incoming request header OR extracts from DNS
  // 3. External backend proxy forwards x-tenant-domain to external backend
  //
  // Priority: x-tenant-domain header (from internal request) → extract from host DNS
  const tenantDomainHeader = request.headers.get('x-tenant-domain');
  if (tenantDomainHeader) {
    headers['x-tenant-domain'] = tenantDomainHeader;
  } else {
    // Fallback: Derive from browser/app request hostname (DNS-based multi-tenant)
    // IMPORTANT: Tenant domain comes from browser/app domain, NOT from backend service URLs
    // Prefer x-forwarded-host (from reverse proxy) → host header → nextUrl hostname
    const forwardedHost = request.headers.get('x-forwarded-host');
    const hostHeader = request.headers.get('host');
    const rawHost = forwardedHost || hostHeader || request.nextUrl?.hostname || '';
    const normalizedHost = rawHost.trim().toLowerCase().split(':')[0];
    // Only set if we have a real domain (not localhost/internal)
    // Note: localhost means no tenant context - this is correct
    if (normalizedHost && normalizedHost !== 'localhost' && normalizedHost !== '127.0.0.1') {
      headers['x-tenant-domain'] = normalizedHost;
    }
  }

  // At this point, headers object has x-tenant-domain set (either from incoming header or DNS)
  // This will be forwarded to the external backend

  return headers;
}

// REQUIRE_LOGIN comes from environment variable for Edge Runtime compatibility
const REQUIRE_LOGIN = process.env.REQUIRE_LOGIN === 'true' || false;

/**
 * Check if a path should be excluded from authentication
 * Supports exact matches and wildcard patterns (e.g., /api/auth/*)
 * Matches the logic in api-auth.util.ts for consistency
 */
function isExcludedPath(pathname: string, excludedRoutes: string[]): boolean {
  for (const excludedRoute of excludedRoutes) {
    // Exact match
    if (pathname === excludedRoute) {
      return true;
    }
    
    // Wildcard pattern support (e.g., /api/auth/*)
    if (excludedRoute.endsWith('/*')) {
      const prefix = excludedRoute.slice(0, -2); // Remove '/*'
      if (pathname.startsWith(prefix)) {
        return true;
      }
    }
    
    // Prefix match for routes (e.g., /api/auth matches /api/auth/login)
    if (pathname.startsWith(excludedRoute + '/')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if path should be excluded from proxy (static files, Next.js internals, API routes)
 */
function shouldSkipProxy(pathname: string): boolean {
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/static/')
  ) {
    return true;
  }

  const staticFileExtensions = [
    'ico', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif', 'bmp', 'tiff',
    'woff', 'woff2', 'ttf', 'eot', 'otf',
    'css',
    'js', 'mjs', 'cjs',
    'pdf', 'json', 'xml', 'txt', 'csv',
    'mp3', 'mp4', 'webm', 'ogg', 'wav',
    'zip', 'tar', 'gz',
    'map', 'webmanifest', 'manifest',
  ];

  const staticFilePattern = new RegExp(`\\.(${staticFileExtensions.join('|')})(\\?.*)?$`, 'i');
  if (staticFilePattern.test(pathname)) {
    return true;
  }

  if (
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/logo/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/icons/')
  ) {
    return true;
  }

  return false;
}

/**
 * Check if path is public (no auth required)
 * Matches AuthGuard logic: exact or prefix match
 */
function isPublicPath(pathname: string, publicPages: string[]): boolean {
  for (const publicPage of publicPages) {
    if (pathname === publicPage) return true;
    if (pathname.startsWith(publicPage + '/')) return true;
  }
  return false;
}

/**
 * Extract refresh token from cookies
 */
function getRefreshTokenFromCookies(cookies: string | null, cookieName: string): string | null {
  if (!cookies) {
    return null;
  }
  return extractTokenFromCookiesEdge(cookies, cookieName);
}

/**
 * Attempt to refresh access token
 */
async function attemptTokenRefresh(
  refreshToken: string,
  loginLocally: boolean,
  request: NextRequest
): Promise<{ success: boolean; accessToken?: string; expiresIn?: number; error?: string }> {
  try {
    if (loginLocally) {
      const baseUrl = request.nextUrl.origin;
      const refreshUrl = `${baseUrl}/api/auth/token/refresh`;

      loggingCustom(LogType.LOGIN_LOG, 'info', '========== REFRESH TOKEN REQUEST (LOCAL) ==========');
      loggingCustom(LogType.LOGIN_LOG, 'info', `Refresh URL: ${refreshUrl}`);
      loggingCustom(LogType.LOGIN_LOG, 'info', 'Method: POST');
      loggingCustom(LogType.LOGIN_LOG, 'debug', `Refresh token (first 20 chars): ${refreshToken.substring(0, 20)}...`);
      loggingCustom(LogType.LOGIN_LOG, 'debug', `Request body: ${JSON.stringify({ refreshToken: refreshToken.substring(0, 20) + '...' })}`);

      const requestHeaders = {
        'Content-Type': 'application/json',
      };
      loggingCustom(LogType.LOGIN_LOG, 'debug', `Request headers: ${JSON.stringify(requestHeaders)}`);

      const startTime = Date.now();
      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({ refreshToken }),
      });

      const responseTime = Date.now() - startTime;
      loggingCustom(LogType.LOGIN_LOG, 'info', `Response received: ${JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`,
        headers: Object.fromEntries(response.headers.entries()),
      })}`);

      const data = await response.json();
      loggingCustom(LogType.LOGIN_LOG, 'info', `Response data: ${JSON.stringify({
        success: data.success,
        hasAccessToken: !!data.accessToken,
        error: data.error,
        message: data.message,
      })}`);

      if (response.ok && data.success && data.accessToken) {
        loggingCustom(LogType.LOGIN_LOG, 'info', '========== REFRESH TOKEN SUCCESS (LOCAL) ==========');
        return {
          success: true,
          accessToken: data.accessToken,
          expiresIn: data.expiresIn, // Include expiresIn if provided by refresh endpoint
        };
      }

      loggingCustom(LogType.LOGIN_LOG, 'warn', '========== REFRESH TOKEN FAILED (LOCAL) ==========');
      return {
        success: false,
        error: data.error || 'Token refresh failed',
      };
    } else {
      try {
        const refreshUrl = buildAuthServiceUrlEdge('/refresh');
        const headers = buildProxyHeadersEdge(request);

        loggingCustom(LogType.LOGIN_LOG, 'info', '========== REFRESH TOKEN REQUEST (EXTERNAL) ==========');
        loggingCustom(LogType.LOGIN_LOG, 'info', `Refresh URL: ${refreshUrl}`);
        loggingCustom(LogType.LOGIN_LOG, 'info', 'Method: POST');
        loggingCustom(LogType.LOGIN_LOG, 'debug', `Refresh token (first 20 chars): ${refreshToken.substring(0, 20)}...`);
        loggingCustom(LogType.LOGIN_LOG, 'debug', `Request body: ${JSON.stringify({ refreshToken: refreshToken.substring(0, 20) + '...' })}`);
        const headersForLog = headers as Record<string, string>;
        loggingCustom(LogType.LOGIN_LOG, 'debug', `Request headers: ${JSON.stringify({
          ...headersForLog,
          cookie: headersForLog.cookie ? `${headersForLog.cookie.substring(0, 50)}...` : undefined,
        })}`);

        const requestHeaders = {
          ...headers,
          'Content-Type': 'application/json',
        };

        const startTime = Date.now();
        const response = await fetch(refreshUrl, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify({ refreshToken }),
        });

        const responseTime = Date.now() - startTime;
        
        // Check for Set-Cookie headers that might delete cookies
        const setCookieHeaders = response.headers.get('set-cookie');
        const allSetCookies = response.headers.getSetCookie?.() || [];
        loggingCustom(LogType.LOGIN_LOG, 'info', `Response received: ${JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          responseTime: `${responseTime}ms`,
          hasSetCookieHeader: !!setCookieHeaders,
          setCookieCount: allSetCookies.length,
          setCookieHeaders: allSetCookies.map(c => c.substring(0, 100)), // Log first 100 chars of each
        })}`);

        let data: any = null;
        try {
          const responseText = await response.text();
          loggingCustom(LogType.LOGIN_LOG, 'info', `External refresh response received: status=${response.status}, content-length=${responseText.length}`);
          
          if (responseText) {
            try {
              data = JSON.parse(responseText);
              loggingCustom(LogType.LOGIN_LOG, 'info', `External refresh response parsed successfully`);
            } catch (parseError) {
              loggingCustom(LogType.LOGIN_LOG, 'error', `Failed to parse refresh response as JSON: ${responseText.substring(0, 500)}`);
              data = null;
            }
          }
        } catch (error) {
          loggingCustom(LogType.LOGIN_LOG, 'error', `Failed to read refresh response: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Handle both nested (tokens.accessToken) and flat (accessToken) response formats
        const accessToken = data?.tokens?.accessToken || data?.accessToken;
        const expiresIn = data?.tokens?.expiresIn || data?.expiresIn;
        const hasAccessToken = data?.hasAccessToken !== undefined ? data.hasAccessToken : (!!accessToken);
        
        loggingCustom(LogType.LOGIN_LOG, 'info', `Response data: ${JSON.stringify({
          success: data?.success,
          hasAccessToken: hasAccessToken,
          accessToken: !!accessToken,
          hasNestedTokens: !!data?.tokens,
          expiresIn: expiresIn,
          error: data?.error,
          message: data?.message,
        })}`);

        if (response.ok) {
          if (data.success && accessToken) {
            loggingCustom(LogType.LOGIN_LOG, 'info', '========== REFRESH TOKEN SUCCESS (EXTERNAL) - New token provided ==========');
            return {
              success: true,
              accessToken: accessToken,
              expiresIn: expiresIn, // Include expiresIn if provided by external service
            };
          } else if (hasAccessToken === true) {
            loggingCustom(LogType.LOGIN_LOG, 'info', '========== REFRESH TOKEN SUCCESS (EXTERNAL) - Access token already valid ==========');
            return {
              success: true,
              accessToken: undefined,
            };
          }
        }

        loggingCustom(LogType.LOGIN_LOG, 'error', '========== REFRESH TOKEN FAILED (EXTERNAL) ==========');
        loggingCustom(LogType.LOGIN_LOG, 'error', `Failure reason: ${JSON.stringify({
          responseOk: response.ok,
          responseStatus: response.status,
          responseStatusText: response.statusText,
          hasSuccess: !!data?.success,
          hasAccessToken: hasAccessToken,
          hasAccessTokenField: !!accessToken,
          hasNestedTokens: !!data?.tokens,
          error: data?.error,
          message: data?.message,
          fullResponse: data ? JSON.stringify(data, null, 2) : 'null',
        })}`);
        loggingCustom(LogType.LOGIN_LOG, 'error', `Refresh URL: ${refreshUrl}`);
        loggingCustom(LogType.LOGIN_LOG, 'error', `Refresh token (first 20 chars): ${refreshToken.substring(0, 20)}...`);
        
        // Log Set-Cookie headers from failed response to debug cookie deletion
        if (allSetCookies.length > 0) {
          loggingCustom(LogType.LOGIN_LOG, 'warn', `WARNING: External service sent ${allSetCookies.length} Set-Cookie headers on refresh failure. These will NOT be forwarded to browser.`);
          allSetCookies.forEach((cookie, idx) => {
            const isDeletion = cookie.includes('Max-Age=0') || 
                               cookie.includes('Expires=Thu, 01 Jan 1970') ||
                               cookie.match(/^[^=]+=\s*;\s*Expires=/);
            loggingCustom(LogType.LOGIN_LOG, 'warn', `Set-Cookie ${idx + 1}: ${isDeletion ? 'DELETION' : 'SET'} - ${cookie.substring(0, 150)}`);
          });
        }
        
        // Return failure WITHOUT forwarding any Set-Cookie headers
        // This ensures cookies are NOT deleted even if external service sends deletion headers
        return {
          success: false,
          error: data.error || data.message || 'Token refresh failed',
        };
      } catch (error) {
        loggingCustom(LogType.LOGIN_LOG, 'error', '========== REFRESH TOKEN ERROR (EXTERNAL) ==========');
        loggingCustom(LogType.LOGIN_LOG, 'error', `Error details: ${JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })}`);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'External authentication service not configured',
        };
      }
    }
  } catch (error) {
    loggingCustom(LogType.LOGIN_LOG, 'error', '========== REFRESH TOKEN ERROR ==========');
    loggingCustom(LogType.LOGIN_LOG, 'error', `Error details: ${JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token refresh failed',
    };
  }
}

/**
 * Handle skip_key decryption for API routes
 */
async function handleSkipKeyDecryption(request: NextRequest): Promise<NextResponse | null> {
  const { pathname, searchParams } = request.nextUrl;

  if (!pathname.startsWith('/api/')) {
    return null;
  }

  if (request.method === 'GET' || request.method === 'DELETE') {
    const encryptedSkipKey = searchParams.get('skip_key');
    if (!encryptedSkipKey) {
      return null;
    }

    try {
      const decryptedSkipKey = await decryptSkipKey(encryptedSkipKey);
      if (!decryptedSkipKey) {
        console.warn('[proxy] Failed to decrypt skip_key, leaving encrypted value');
        return null;
      }

      const newUrl = new URL(request.url);
      newUrl.searchParams.set('skip_key', decryptedSkipKey);
      return NextResponse.rewrite(newUrl);
    } catch (error) {
      console.error('[proxy] Error decrypting skip_key:', error);
      return null;
    }
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const skipKeyResponse = await handleSkipKeyDecryption(request);
  if (skipKeyResponse) {
    return skipKeyResponse;
  }

  const { pathname } = request.nextUrl;

  loggingCustom(LogType.LOGIN_LOG, 'info', '========== PROXY CALLED ==========');
  loggingCustom(LogType.LOGIN_LOG, 'info', `Pathname: ${pathname}`);
  loggingCustom(LogType.LOGIN_LOG, 'info', `URL: ${request.url}`);
  loggingCustom(LogType.LOGIN_LOG, 'info', `Method: ${request.method}`);

  const forbiddenRoutes = FORBIDDEN_ROUTES_PRODUCTION ?? [];
  if (forbiddenRoutes.length > 0) {
    const nodeEnv = process.env.NODE_ENV || 'production';
    if (nodeEnv !== 'development') {
      const isForbidden = forbiddenRoutes.some((route: string) =>
        pathname === route || pathname.startsWith(route)
      );

      if (isForbidden) {
        loggingCustom(LogType.LOGIN_LOG, 'warn', `Access to ${pathname} denied - NODE_ENV is ${nodeEnv}, route is in FORBIDDEN_ROUTES_PRODUCTION`);
        return NextResponse.redirect(new URL('/forbidden', request.url));
      }
    }
  }

  if (shouldSkipProxy(pathname)) {
    loggingCustom(LogType.LOGIN_LOG, 'debug', `Skipping proxy for path: ${pathname}`);
    return NextResponse.next();
  }

  if (pathname.startsWith('/authentication/')) {
    loggingCustom(LogType.LOGIN_LOG, 'debug', `Skipping authentication pages: ${pathname}`);
    return NextResponse.next();
  }

  if (isPublicPath(pathname, PUBLIC_PAGES ?? [])) {
    loggingCustom(LogType.LOGIN_LOG, 'debug', `Skipping public path: ${pathname}`);
    return NextResponse.next();
  }

  try {
    const requireLogin = REQUIRE_LOGIN ?? false;
    const excludedRoutes = EXCLUDED_LOGIN_ROUTES ?? [];
    const REFRESH_TOKEN_COOKIE = AUTH_CONFIG?.REFRESH_TOKEN_COOKIE || 'refresh_token';

    loggingCustom(LogType.LOGIN_LOG, 'debug', `Application variables: ${JSON.stringify({
      REQUIRE_LOGIN: requireLogin,
      EXCLUDED_LOGIN_ROUTES: excludedRoutes,
    })}`);

    if (!requireLogin) {
      loggingCustom(LogType.LOGIN_LOG, 'debug', 'REQUIRE_LOGIN is false, allowing request');
      return NextResponse.next();
    }

    loggingCustom(LogType.LOGIN_LOG, 'info', 'REQUIRE_LOGIN is true, checking authentication...');

    if (isExcludedPath(pathname, excludedRoutes)) {
      loggingCustom(LogType.LOGIN_LOG, 'debug', 'Path is in excluded routes, allowing request');
      return NextResponse.next();
    }

    // Middleware only handles route protection - token refresh is handled client-side
    // Check if refresh token exists in HttpOnly cookie
    const cookies = request.headers.get('cookie');
    loggingCustom(LogType.LOGIN_LOG, 'debug', `Cookies: ${cookies ? 'Present' : 'Missing'}`);

    if (cookies) {
      const cookieNames = cookies.split(';').map(c => c.trim().split('=')[0]);
      loggingCustom(LogType.LOGIN_LOG, 'debug', `Available cookie names: ${cookieNames.join(', ')}`);
      // Check if refresh_token cookie exists (case-insensitive)
      const hasRefreshTokenCookie = cookieNames.some(name => name.toLowerCase() === REFRESH_TOKEN_COOKIE.toLowerCase());
      loggingCustom(LogType.LOGIN_LOG, 'debug', `Refresh token cookie check: ${JSON.stringify({
        lookingFor: REFRESH_TOKEN_COOKIE,
        found: hasRefreshTokenCookie,
        allCookies: cookieNames,
      })}`);
    }

    const refreshToken = getRefreshTokenFromCookies(cookies, REFRESH_TOKEN_COOKIE);
    loggingCustom(LogType.LOGIN_LOG, 'debug', `Refresh token: ${refreshToken ? `${refreshToken.substring(0, 20)}...` : 'Missing'} ${JSON.stringify({
      cookieName: REFRESH_TOKEN_COOKIE,
      hasCookies: !!cookies,
      cookiesLength: cookies?.length || 0,
    })}`);

    if (!refreshToken) {
      // For API routes, allow them to handle authentication themselves (return 401)
      // This allows client-side token refresh to work properly
      if (pathname.startsWith('/api/')) {
        loggingCustom(LogType.LOGIN_LOG, 'info', 'No refresh token available for API route, allowing request to proceed (API route will return 401)');
        return NextResponse.next();
      }
      
      const referer = request.headers.get('referer');
      if (referer && referer.includes('/authentication/login')) {
        loggingCustom(LogType.LOGIN_LOG, 'warn', 'Already redirected from login, allowing request to prevent loop');
        return NextResponse.next();
      }
      loggingCustom(LogType.LOGIN_LOG, 'info', 'No refresh token available, redirecting to login');
      const loginUrl = new URL('/authentication/login', request.url);
      const encryptedReturnUrl = encryptReturnUrl(pathname);
      loginUrl.searchParams.set('returnUrl', encryptedReturnUrl);
      loggingCustom(LogType.LOGIN_LOG, 'info', `Redirect URL: ${loginUrl.toString()}`);
      return NextResponse.redirect(loginUrl);
    }

    // Check refresh token expiration for logging only
    // IMPORTANT: We don't reject expired tokens here because:
    // 1. External services may rotate refresh tokens (one-time use)
    // 2. New refresh token might be in Set-Cookie but not yet in browser cookies
    // 3. Client-side will handle refresh token validation and refresh
    let refreshTokenExpired = false;
    try {
      const parts = refreshToken.split('.');
      if (parts.length === 3) {
        const payload = parts[1];
        let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
          base64 += '=';
        }
        const decoded = atob(base64);
        const parsed = JSON.parse(decoded) as { exp?: number };

        if (parsed.exp) {
          const now = Math.floor(Date.now() / 1000);
          refreshTokenExpired = parsed.exp < now;
          loggingCustom(LogType.LOGIN_LOG, 'debug', `Refresh token expiration check: ${JSON.stringify({
            exp: parsed.exp,
            now,
            expired: refreshTokenExpired,
            note: 'Allowing request even if expired - client will handle refresh',
          })}`);
        } else {
          loggingCustom(LogType.LOGIN_LOG, 'debug', 'Refresh token has no expiration claim');
        }
      } else {
        loggingCustom(LogType.LOGIN_LOG, 'warn', 'Refresh token has invalid format, but allowing request (client will validate)');
      }
    } catch (error) {
      loggingCustom(LogType.LOGIN_LOG, 'warn', `Failed to decode refresh token: ${error instanceof Error ? error.message : String(error)}, but allowing request (client will validate)`);
    }

    // Refresh token exists but is expired: redirect to login before sending the page.
    // This prevents the "flash" of protected content then redirect (unprofessional UX).
    if (refreshTokenExpired) {
      loggingCustom(LogType.LOGIN_LOG, 'info', 'Refresh token expired - redirecting to login before sending page');
      const loginUrl = new URL('/authentication/login', request.url);
      const encryptedReturnUrl = encryptReturnUrl(pathname);
      loginUrl.searchParams.set('returnUrl', encryptedReturnUrl);
      return NextResponse.redirect(loginUrl);
    }

    loggingCustom(LogType.LOGIN_LOG, 'info', 'Refresh token exists and appears valid - allowing request');
    loggingCustom(LogType.LOGIN_LOG, 'info', '========== PROXY COMPLETED SUCCESSFULLY ==========');
    return NextResponse.next();
  } catch (error) {
    loggingCustom(LogType.LOGIN_LOG, 'error', '========== PROXY ERROR ==========');
    loggingCustom(LogType.LOGIN_LOG, 'error', `Error details: ${JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })}`);
    loggingCustom(LogType.LOGIN_LOG, 'warn', 'Allowing request to proceed due to error (fail open)');
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Note: API routes are included to handle skip_key decryption
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

