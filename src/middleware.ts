import { NextRequest, NextResponse } from 'next/server';
import { encryptReturnUrl } from '@/gradian-ui/shared/utils/url-encryption.util';
import { extractTokenFromCookiesEdge } from '@/gradian-ui/shared/utils/edge-token-validation.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';
import { decryptSkipKey } from '@/gradian-ui/shared/utils/decrypt-skip-key';

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

  const tenantDomainHeader = request.headers.get('x-tenant-domain');
  if (tenantDomainHeader) {
    headers['x-tenant-domain'] = tenantDomainHeader;
  }

  return headers;
}

// Import constants from application-variables (Edge-compatible)
// REQUIRE_LOGIN comes from environment variable for Edge Runtime compatibility
import { 
  EXCLUDED_LOGIN_ROUTES, 
  LOGIN_LOCALLY, 
  AUTH_CONFIG,
  FORBIDDEN_ROUTES_PRODUCTION
} from '@/gradian-ui/shared/constants/application-variables';

// Get REQUIRE_LOGIN from environment variable (Edge-compatible)
const REQUIRE_LOGIN = process.env.REQUIRE_LOGIN === 'true' || false;

/**
 * Check if a path should be excluded from authentication
 */
function isExcludedPath(pathname: string, excludedRoutes: string[]): boolean {
  // Check exact matches
  if (excludedRoutes.includes(pathname)) {
    return true;
  }

  // Check prefix matches
  for (const route of excludedRoutes) {
    if (pathname.startsWith(route)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if path should be excluded from middleware (static files, Next.js internals, API routes)
 */
function shouldSkipMiddleware(pathname: string): boolean {
  // Skip Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/static/')
  ) {
    return true;
  }

  // Skip all static file extensions (images, fonts, stylesheets, scripts, etc.)
  const staticFileExtensions = [
    // Images
    'ico', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif', 'bmp', 'tiff',
    // Fonts
    'woff', 'woff2', 'ttf', 'eot', 'otf',
    // Stylesheets
    'css',
    // Scripts
    'js', 'mjs', 'cjs',
    // Documents
    'pdf', 'json', 'xml', 'txt', 'csv',
    // Media
    'mp3', 'mp4', 'webm', 'ogg', 'wav',
    // Archives
    'zip', 'tar', 'gz',
    // Other
    'map', 'webmanifest', 'manifest'
  ];
  
  const staticFilePattern = new RegExp(`\\.(${staticFileExtensions.join('|')})(\\?.*)?$`, 'i');
  if (staticFilePattern.test(pathname)) {
    return true;
  }

  // Skip common static asset paths
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
): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  try {
    if (loginLocally) {
      // Use local refresh endpoint
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
        };
      }

      loggingCustom(LogType.LOGIN_LOG, 'warn', '========== REFRESH TOKEN FAILED (LOCAL) ==========');
      return {
        success: false,
        error: data.error || 'Token refresh failed',
      };
    } else {
      // Use external authentication service
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
          // Don't log full cookie header for security
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
        loggingCustom(LogType.LOGIN_LOG, 'info', `Response received: ${JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          responseTime: `${responseTime}ms`,
          headers: Object.fromEntries(response.headers.entries()),
        })}`);

        const data = await response.json();
        loggingCustom(LogType.LOGIN_LOG, 'info', `Response data: ${JSON.stringify({
          success: data.success,
          hasAccessToken: data.hasAccessToken,
          accessToken: !!data.accessToken,
          error: data.error,
          message: data.message,
        })}`);

        // Handle different response formats from external auth service
        // Format 1: { success: true, accessToken: "..." }
        // Format 2: { hasAccessToken: true } - indicates user already has valid token
        if (response.ok) {
          if (data.success && data.accessToken) {
            // New access token provided
            loggingCustom(LogType.LOGIN_LOG, 'info', '========== REFRESH TOKEN SUCCESS (EXTERNAL) - New token provided ==========');
            return {
              success: true,
              accessToken: data.accessToken,
            };
          } else if (data.hasAccessToken === true) {
            // User already has valid access token (might be in cookies from external service)
            loggingCustom(LogType.LOGIN_LOG, 'info', '========== REFRESH TOKEN SUCCESS (EXTERNAL) - Access token already valid ==========');
            return {
              success: true,
              accessToken: undefined, // Token already exists, no need to set new one
            };
          }
        }

        loggingCustom(LogType.LOGIN_LOG, 'warn', '========== REFRESH TOKEN FAILED (EXTERNAL) ==========');
        loggingCustom(LogType.LOGIN_LOG, 'warn', `Failure reason: ${JSON.stringify({
          responseOk: response.ok,
          hasSuccess: !!data.success,
          hasAccessToken: data.hasAccessToken,
          hasAccessTokenField: !!data.accessToken,
          error: data.error,
          message: data.message,
        })}`);
        return {
          success: false,
          error: data.error || data.message || 'Token refresh failed',
        };
      } catch (error) {
        // If URL_AUTHENTICATION is not configured, buildAuthServiceUrl will throw
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
 * For GET requests: Decrypts encrypted skip_key query parameter and rewrites the request URL
 * For POST/PUT/PATCH requests: Decrypts skip_key in request body (body modification requires route handler)
 * Note: Middleware cannot modify request body, so POST requests with skip_key in body are handled in route handler
 */
async function handleSkipKeyDecryption(request: NextRequest): Promise<NextResponse | null> {
  const { pathname, searchParams } = request.nextUrl;
  
  // Only process API routes that have skip_key parameter
  if (!pathname.startsWith('/api/')) {
    return null;
  }
  
  // For GET requests, handle skip_key in query parameters
  if (request.method === 'GET' || request.method === 'DELETE') {
    const encryptedSkipKey = searchParams.get('skip_key');
    if (!encryptedSkipKey) {
      return null;
    }
    
    try {
      // Decrypt the skip key
      const decryptedSkipKey = await decryptSkipKey(encryptedSkipKey);
      if (!decryptedSkipKey) {
        console.warn('[middleware] Failed to decrypt skip_key, leaving encrypted value');
        return null;
      }
      
      // Create new URL with decrypted skip_key
      const newUrl = new URL(request.url);
      newUrl.searchParams.set('skip_key', decryptedSkipKey);
      
      // Use NextResponse.rewrite() to rewrite the URL with decrypted skip_key
      return NextResponse.rewrite(newUrl);
    } catch (error) {
      console.error('[middleware] Error decrypting skip_key:', error);
      return null;
    }
  }
  
  // For POST/PUT/PATCH requests, skip_key should be in body
  // Middleware cannot modify request body, so decryption will happen in route handler
  // Return null to let the request proceed normally
  return null;
}

export async function middleware(request: NextRequest) {
  // Handle skip_key decryption for API routes before other middleware logic
  const skipKeyResponse = await handleSkipKeyDecryption(request);
  if (skipKeyResponse) {
    // Return the rewritten response with decrypted skip_key
    return skipKeyResponse;
  }
  
  const { pathname } = request.nextUrl;
  
  loggingCustom(LogType.LOGIN_LOG, 'info', '========== MIDDLEWARE CALLED ==========');
  loggingCustom(LogType.LOGIN_LOG, 'info', `Pathname: ${pathname}`);
  loggingCustom(LogType.LOGIN_LOG, 'info', `URL: ${request.url}`);
  loggingCustom(LogType.LOGIN_LOG, 'info', `Method: ${request.method}`);

  // Check if pathname is in FORBIDDEN_ROUTES_PRODUCTION and redirect if not in development
  const forbiddenRoutes = FORBIDDEN_ROUTES_PRODUCTION ?? [];
  if (forbiddenRoutes.length > 0) {
    const nodeEnv = process.env.NODE_ENV || 'production';
    if (nodeEnv !== 'development') {
      // Check if pathname matches any forbidden route (exact match or prefix match)
      const isForbidden = forbiddenRoutes.some((route: string) => 
        pathname === route || pathname.startsWith(route)
      );
      
      if (isForbidden) {
        loggingCustom(LogType.LOGIN_LOG, 'warn', `Access to ${pathname} denied - NODE_ENV is ${nodeEnv}, route is in FORBIDDEN_ROUTES_PRODUCTION`);
        return NextResponse.redirect(new URL('/forbidden', request.url));
      }
    }
  }

  // Skip middleware for static files, Next.js internals, and API routes
  if (shouldSkipMiddleware(pathname)) {
    loggingCustom(LogType.LOGIN_LOG, 'debug', `Skipping middleware for path: ${pathname}`);
    return NextResponse.next();
  }

  // Skip authentication/login pages to prevent redirect loops
  if (pathname.startsWith('/authentication/')) {
    loggingCustom(LogType.LOGIN_LOG, 'debug', `Skipping authentication pages: ${pathname}`);
    return NextResponse.next();
  }

  try {
    // Use constants directly from application-variables (loaded at build time)
    loggingCustom(LogType.LOGIN_LOG, 'debug', 'Loading application variables...');
    const requireLogin = REQUIRE_LOGIN ?? false;
    const excludedRoutes = EXCLUDED_LOGIN_ROUTES ?? [];
    const loginLocally = LOGIN_LOCALLY ?? false;
    const ACCESS_TOKEN_COOKIE = AUTH_CONFIG?.ACCESS_TOKEN_COOKIE || 'access_token';
    const REFRESH_TOKEN_COOKIE = AUTH_CONFIG?.REFRESH_TOKEN_COOKIE || 'refresh_token';
    const ACCESS_TOKEN_EXPIRY = AUTH_CONFIG?.ACCESS_TOKEN_EXPIRY || 3600;

    loggingCustom(LogType.LOGIN_LOG, 'debug', `Application variables: ${JSON.stringify({
      REQUIRE_LOGIN: requireLogin,
      EXCLUDED_LOGIN_ROUTES: excludedRoutes,
      LOGIN_LOCALLY: loginLocally,
    })}`);

    // If login is not required, allow all requests
    if (!requireLogin) {
      loggingCustom(LogType.LOGIN_LOG, 'debug', 'REQUIRE_LOGIN is false, allowing request');
      return NextResponse.next();
    }

    loggingCustom(LogType.LOGIN_LOG, 'info', 'REQUIRE_LOGIN is true, checking authentication...');

    // Check if path is in excluded routes
    if (isExcludedPath(pathname, excludedRoutes)) {
      loggingCustom(LogType.LOGIN_LOG, 'debug', 'Path is in excluded routes, allowing request');
      return NextResponse.next();
    }

    // Get access token from cookies
    const cookies = request.headers.get('cookie');
    loggingCustom(LogType.LOGIN_LOG, 'debug', `Cookies: ${cookies ? 'Present' : 'Missing'}`);
    loggingCustom(LogType.LOGIN_LOG, 'debug', `Cookie name: ${ACCESS_TOKEN_COOKIE}`);
    
    // Log all cookie names for debugging
    if (cookies) {
      const cookieNames = cookies.split(';').map(c => c.trim().split('=')[0]);
      loggingCustom(LogType.LOGIN_LOG, 'debug', `Available cookie names: ${cookieNames.join(', ')}`);
    }
    
    const accessToken = extractTokenFromCookiesEdge(cookies, ACCESS_TOKEN_COOKIE);
    loggingCustom(LogType.LOGIN_LOG, 'debug', `Access token: ${accessToken ? `${accessToken.substring(0, 20)}...` : 'Missing'}`);

    // Check if access token exists and is not expired
    let accessTokenValid = false;
    if (accessToken) {
      // Check if token is expired by decoding it (Edge-compatible)
      try {
        const parts = accessToken.split('.');
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
            accessTokenValid = parsed.exp > now;
            loggingCustom(LogType.LOGIN_LOG, 'debug', `Access token expiration check: ${JSON.stringify({
              exp: parsed.exp,
              now,
              valid: accessTokenValid,
            })}`);
          } else {
            // No expiration claim, consider it valid (let API routes handle validation)
            accessTokenValid = true;
            loggingCustom(LogType.LOGIN_LOG, 'debug', 'Access token has no expiration claim, considering valid');
          }
        } else {
          loggingCustom(LogType.LOGIN_LOG, 'warn', 'Access token has invalid format');
        }
      } catch (error) {
        loggingCustom(LogType.LOGIN_LOG, 'warn', `Failed to decode access token: ${error instanceof Error ? error.message : String(error)}`);
        // If we can't decode it, consider it invalid and try to refresh
        accessTokenValid = false;
      }
    }

    // If access token is missing or expired, try to refresh
    if (!accessToken || !accessTokenValid) {
      loggingCustom(LogType.LOGIN_LOG, 'info', 'Access token missing or expired, checking for refresh token...');
      const refreshToken = getRefreshTokenFromCookies(cookies, REFRESH_TOKEN_COOKIE);
      loggingCustom(LogType.LOGIN_LOG, 'debug', `Refresh token: ${refreshToken ? `${refreshToken.substring(0, 20)}...` : 'Missing'}`);

      if (!refreshToken) {
        // No refresh token, redirect to login
        // But don't redirect if we're already being redirected from login (prevent loop)
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

      // Check if refresh token is expired
      let refreshTokenValid = false;
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
            refreshTokenValid = parsed.exp > now;
            loggingCustom(LogType.LOGIN_LOG, 'debug', `Refresh token expiration check: ${JSON.stringify({
              exp: parsed.exp,
              now,
              valid: refreshTokenValid,
            })}`);
          } else {
            // No expiration claim, consider it valid (let API routes handle validation)
            refreshTokenValid = true;
            loggingCustom(LogType.LOGIN_LOG, 'debug', 'Refresh token has no expiration claim, considering valid');
          }
        } else {
          loggingCustom(LogType.LOGIN_LOG, 'warn', 'Refresh token has invalid format');
        }
      } catch (error) {
        loggingCustom(LogType.LOGIN_LOG, 'warn', `Failed to decode refresh token: ${error instanceof Error ? error.message : String(error)}`);
        refreshTokenValid = false;
      }

      if (!refreshTokenValid) {
        // Refresh token is expired, redirect to login
        const referer = request.headers.get('referer');
        if (referer && referer.includes('/authentication/login')) {
          loggingCustom(LogType.LOGIN_LOG, 'warn', 'Already redirected from login, allowing request to prevent loop');
          return NextResponse.next();
        }
        loggingCustom(LogType.LOGIN_LOG, 'info', 'Refresh token expired, redirecting to login');
        const loginUrl = new URL('/authentication/login', request.url);
        const encryptedReturnUrl = encryptReturnUrl(pathname);
        loginUrl.searchParams.set('returnUrl', encryptedReturnUrl);
        loggingCustom(LogType.LOGIN_LOG, 'info', `Redirect URL: ${loginUrl.toString()}`);
        return NextResponse.redirect(loginUrl);
      }

      // Refresh token is valid, attempt to refresh access token
      loggingCustom(LogType.LOGIN_LOG, 'info', 'Refresh token is valid, attempting to refresh access token...');
      const refreshResult = await attemptTokenRefresh(refreshToken, loginLocally, request);

      if (refreshResult.success) {
        if (refreshResult.accessToken) {
          // New access token provided, set it in cookie
          loggingCustom(LogType.LOGIN_LOG, 'info', 'Token refresh successful, setting new access token');
          const response = NextResponse.next();
          response.cookies.set(ACCESS_TOKEN_COOKIE, refreshResult.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: ACCESS_TOKEN_EXPIRY,
            path: '/',
          });
          loggingCustom(LogType.LOGIN_LOG, 'info', 'New access token cookie set, allowing request');
          return response;
        } else {
          // hasAccessToken: true - external service confirms token already exists and is valid
          // Allow request to proceed (token might be in cookies with different name or already set)
          loggingCustom(LogType.LOGIN_LOG, 'info', 'External service confirmed access token is valid, allowing request');
          return NextResponse.next();
        }
      } else {
        // Refresh failed, redirect to login
        // But don't redirect if we're already being redirected from login (prevent loop)
        const referer = request.headers.get('referer');
        if (referer && referer.includes('/authentication/login')) {
          loggingCustom(LogType.LOGIN_LOG, 'warn', 'Already redirected from login, allowing request to prevent loop');
          return NextResponse.next();
        }
        loggingCustom(LogType.LOGIN_LOG, 'warn', `Token refresh failed: ${refreshResult.error || 'Unknown error'}`);
        loggingCustom(LogType.LOGIN_LOG, 'info', 'Redirecting to login');
        const loginUrl = new URL('/authentication/login', request.url);
        const encryptedReturnUrl = encryptReturnUrl(pathname);
        loginUrl.searchParams.set('returnUrl', encryptedReturnUrl);
        loggingCustom(LogType.LOGIN_LOG, 'info', `Redirect URL: ${loginUrl.toString()}`);
        return NextResponse.redirect(loginUrl);
      }
    }

    // Access token exists and is valid, allow request
    loggingCustom(LogType.LOGIN_LOG, 'info', 'Access token is valid, allowing request');
    loggingCustom(LogType.LOGIN_LOG, 'info', '========== MIDDLEWARE COMPLETED SUCCESSFULLY ==========');
    return NextResponse.next();
  } catch (error) {
    loggingCustom(LogType.LOGIN_LOG, 'error', '========== MIDDLEWARE ERROR ==========');
    loggingCustom(LogType.LOGIN_LOG, 'error', `Error details: ${JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })}`);
    // On error, allow request to proceed (fail open)
    // In production, you might want to fail closed instead
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

