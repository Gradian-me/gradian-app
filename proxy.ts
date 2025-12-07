import { NextRequest, NextResponse } from 'next/server';
import { loadApplicationVariables } from '@/gradian-ui/shared/utils/application-variables-loader';
import { validateToken, extractTokenFromCookies } from '@/domains/auth';
import { AUTH_CONFIG } from '@/gradian-ui/shared/constants/application-variables';
import { buildAuthServiceUrl, buildProxyHeaders } from '@/app/api/auth/helpers/external-auth.util';

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
    pathname === '/favicon.ico' ||
    pathname.startsWith('/static/') ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return true;
  }

  return false;
}

/**
 * Extract refresh token from cookies
 */
function getRefreshTokenFromCookies(cookies: string | null): string | null {
  if (!cookies) {
    return null;
  }
  return extractTokenFromCookies(cookies, AUTH_CONFIG.REFRESH_TOKEN_COOKIE);
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

      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.accessToken) {
        return {
          success: true,
          accessToken: data.accessToken,
        };
      }

      return {
        success: false,
        error: data.error || 'Token refresh failed',
      };
    } else {
      // Use external authentication service
      try {
        const refreshUrl = buildAuthServiceUrl('/refresh');
        const headers = buildProxyHeaders(request);

        const response = await fetch(refreshUrl, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        const data = await response.json();

        if (response.ok && data.success && data.accessToken) {
          return {
            success: true,
            accessToken: data.accessToken,
          };
        }

        return {
          success: false,
          error: data.error || 'Token refresh failed',
        };
      } catch (error) {
        // If URL_AUTHENTICATION is not configured, buildAuthServiceUrl will throw
        return {
          success: false,
          error: error instanceof Error ? error.message : 'External authentication service not configured',
        };
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token refresh failed',
    };
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('[PROXY] ========== PROXY CALLED ==========');
  console.log('[PROXY] Pathname:', pathname);
  console.log('[PROXY] URL:', request.url);
  console.log('[PROXY] Method:', request.method);

  // Skip middleware for static files, Next.js internals, and API routes
  if (shouldSkipMiddleware(pathname)) {
    console.log('[PROXY] Skipping middleware for path:', pathname);
    return NextResponse.next();
  }

  try {
    // Load application variables
    console.log('[PROXY] Loading application variables...');
    const vars = loadApplicationVariables();
    const requireLogin = vars.REQUIRE_LOGIN ?? false;
    const excludedRoutes = vars.EXCLUDED_LOGIN_ROUTES ?? [];
    const loginLocally = vars.LOGIN_LOCALLY ?? false;

    console.log('[PROXY] Application variables:', {
      REQUIRE_LOGIN: requireLogin,
      EXCLUDED_LOGIN_ROUTES: excludedRoutes,
      LOGIN_LOCALLY: loginLocally,
    });

    // If login is not required, allow all requests
    if (!requireLogin) {
      console.log('[PROXY] REQUIRE_LOGIN is false, allowing request');
      return NextResponse.next();
    }

    console.log('[PROXY] REQUIRE_LOGIN is true, checking authentication...');

    // Check if path is in excluded routes
    if (isExcludedPath(pathname, excludedRoutes)) {
      console.log('[PROXY] Path is in excluded routes, allowing request');
      return NextResponse.next();
    }

    // Get access token from cookies
    const cookies = request.headers.get('cookie');
    console.log('[PROXY] Cookies:', cookies ? 'Present' : 'Missing');
    console.log('[PROXY] Cookie name:', AUTH_CONFIG.ACCESS_TOKEN_COOKIE);
    const accessToken = extractTokenFromCookies(cookies, AUTH_CONFIG.ACCESS_TOKEN_COOKIE);
    console.log('[PROXY] Access token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'Missing');

    // If no access token, try to refresh
    if (!accessToken) {
      console.log('[PROXY] No access token found, checking for refresh token...');
      const refreshToken = getRefreshTokenFromCookies(cookies);
      console.log('[PROXY] Refresh token:', refreshToken ? `${refreshToken.substring(0, 20)}...` : 'Missing');

      if (!refreshToken) {
        // No tokens available, redirect to login
        console.log('[PROXY] No tokens available, redirecting to login');
        const loginUrl = new URL('/authentication/login', request.url);
        loginUrl.searchParams.set('returnUrl', pathname);
        console.log('[PROXY] Redirect URL:', loginUrl.toString());
        return NextResponse.redirect(loginUrl);
      }

      // Attempt to refresh token
      const refreshResult = await attemptTokenRefresh(refreshToken, loginLocally, request);

      if (refreshResult.success && refreshResult.accessToken) {
        // Create response and set new access token cookie
        const response = NextResponse.next();
        response.cookies.set(AUTH_CONFIG.ACCESS_TOKEN_COOKIE, refreshResult.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
          path: '/',
        });
        return response;
      } else {
        // Refresh failed, redirect to login
        const loginUrl = new URL('/authentication/login', request.url);
        loginUrl.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // Validate access token
    console.log('[PROXY] Validating access token...');
    const validationResult = validateToken(accessToken);
    console.log('[PROXY] Token validation result:', {
      valid: validationResult.valid,
      error: validationResult.error,
    });

    if (!validationResult.valid) {
      console.log('[PROXY] Access token is invalid, trying to refresh...');
      // Token is invalid, try to refresh
      const refreshToken = getRefreshTokenFromCookies(cookies);
      console.log('[PROXY] Refresh token:', refreshToken ? `${refreshToken.substring(0, 20)}...` : 'Missing');

      if (!refreshToken) {
        // No refresh token, redirect to login
        const loginUrl = new URL('/authentication/login', request.url);
        loginUrl.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Attempt to refresh token
      const refreshResult = await attemptTokenRefresh(refreshToken, loginLocally, request);

      if (refreshResult.success && refreshResult.accessToken) {
        // Create response and set new access token cookie
        const response = NextResponse.next();
        response.cookies.set(AUTH_CONFIG.ACCESS_TOKEN_COOKIE, refreshResult.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
          path: '/',
        });
        return response;
      } else {
        // Refresh failed, redirect to login
        const loginUrl = new URL('/authentication/login', request.url);
        loginUrl.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // Token is valid, allow request to proceed
    console.log('[PROXY] Token is valid, allowing request to proceed');
    console.log('[PROXY] ========== PROXY COMPLETED SUCCESSFULLY ==========');
    return NextResponse.next();
  } catch (error) {
    console.error('[PROXY] ========== PROXY ERROR ==========');
    console.error('[PROXY] Error details:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // On error, allow request to proceed (fail open)
    // In production, you might want to fail closed instead
    console.log('[PROXY] Allowing request to proceed due to error (fail open)');
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

