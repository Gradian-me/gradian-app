/**
 * Unified API Authentication Utility
 * Provides server-side authentication for API routes
 * 
 * This utility:
 * - Checks EXCLUDED_LOGIN_ROUTES from auth-config.ts
 * - Respects REQUIRE_LOGIN environment variable
 * - Validates tokens from Authorization header or cookies
 * - Returns 401 (not 200) for unauthenticated requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateToken, extractTokenFromHeader, extractTokenFromCookies } from '@/domains/auth';
import { AUTH_CONFIG, EXCLUDED_LOGIN_ROUTES } from '@/gradian-ui/shared/configs/auth-config';
import { REQUIRE_LOGIN, DEMO_MODE } from '@/gradian-ui/shared/configs/env-config';
import { loggingCustom } from './logging-custom';
import { LogType } from '../configs/log-config';
import { getAccessToken } from '@/app/api/auth/helpers/server-token-cache';
import { isServerDemoMode, buildAuthServiceUrl } from '@/app/api/auth/helpers/external-auth.util';

/**
 * Check if a route path matches any excluded login route
 * Supports exact matches and wildcard patterns (e.g., /api/auth/*)
 * Also excludes /api/data/tenants in demo mode
 */
function isExcludedRoute(pathname: string): boolean {
  // Special case: exclude /api/data/tenants in demo mode
  if (DEMO_MODE && pathname === '/api/data/tenants') {
    loggingCustom(
      LogType.LOGIN_LOG,
      'debug',
      `[API_AUTH] Route excluded in demo mode: ${pathname}`
    );
    return true;
  }
  
  for (const excludedRoute of EXCLUDED_LOGIN_ROUTES) {
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
    
    // Prefix match for API routes (e.g., /api/auth matches /api/auth/login)
    if (pathname.startsWith(excludedRoute + '/')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extract and validate user ID from request
 * Returns userId if valid, null otherwise
 * 
 * Checks in this order:
 * 1. Authorization header (Bearer token)
 * 2. Access token cookie
 * 3. Server-side token cache (using refresh token from cookies)
 */
function getUserIdFromRequest(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  let token = extractTokenFromHeader(authHeader);

  // If not in header, try access token cookie
  if (!token) {
    const cookies = request.headers.get('cookie');
    token = extractTokenFromCookies(cookies, AUTH_CONFIG.ACCESS_TOKEN_COOKIE);
  }

  // If still no token, try server-side token cache using refresh token
  if (!token) {
    const cookies = request.headers.get('cookie');
    let refreshToken = extractTokenFromCookies(cookies, AUTH_CONFIG.REFRESH_TOKEN_COOKIE);
    
    if (refreshToken) {
      // Normalize refresh token (trim whitespace)
      refreshToken = refreshToken.trim();
      
      // Log refresh token preview for debugging
      loggingCustom(
        LogType.LOGIN_LOG,
        'debug',
        `[API_AUTH] Attempting to retrieve access token from server-side cache ${JSON.stringify({
          refreshTokenPreview: `${refreshToken.substring(0, 30)}...`,
          refreshTokenLength: refreshToken.length,
          cookieName: AUTH_CONFIG.REFRESH_TOKEN_COOKIE,
        })}`
      );
      
      // Determine refresh route URL for logging
      const useDemoMode = isServerDemoMode();
      const refreshRoute = useDemoMode 
        ? '/api/auth/token/refresh' 
        : buildAuthServiceUrl('/refresh');
      
      // Look up access token from server memory using refresh token as key
      const serverToken = getAccessToken(refreshToken);
      if (serverToken) {
        loggingCustom(
          LogType.LOGIN_LOG,
          'debug',
          `[API_AUTH] ✅ Retrieved access token from server-side cache using refresh token ${JSON.stringify({
            refreshRoute,
            refreshTokenPreview: `${refreshToken.substring(0, 30)}...`,
            accessTokenLength: serverToken.length,
            expiresIn: '668s',
            cacheSize: 1,
            usingGlobalCache: true,
          })}`
        );
        token = serverToken;
      } else {
        loggingCustom(
          LogType.LOGIN_LOG,
          'warn',
          `[API_AUTH] ❌ Refresh token found in cookies but no access token in server-side cache ${JSON.stringify({
            refreshTokenPreview: `${refreshToken.substring(0, 30)}...`,
            refreshTokenLength: refreshToken.length,
            cookieName: AUTH_CONFIG.REFRESH_TOKEN_COOKIE,
            possibleCauses: [
              'Token not yet stored in cache',
              'Refresh token mismatch (cookie value differs from stored key)',
              'Token expired and cleaned up',
              'Cache cleared or server restarted',
            ],
          })}`
        );
      }
    } else {
      loggingCustom(
        LogType.LOGIN_LOG,
        'debug',
        `[API_AUTH] No refresh token found in cookies ${JSON.stringify({
          cookieName: AUTH_CONFIG.REFRESH_TOKEN_COOKIE,
          hasCookies: !!cookies,
        })}`
      );
    }
  }

  if (!token) {
    loggingCustom(
      LogType.LOGIN_LOG,
      'debug',
      `[API_AUTH] No token found after all checks`
    );
    return null;
  }

  loggingCustom(
    LogType.LOGIN_LOG,
    'debug',
    `[API_AUTH] Validating token ${JSON.stringify({
      tokenPreview: `${token.substring(0, 30)}...`,
      tokenLength: token.length,
    })}`
  );

  try {
    const result = validateToken(token);
    loggingCustom(
      LogType.LOGIN_LOG,
      'debug',
      `[API_AUTH] Token validation result ${JSON.stringify({
        valid: result.valid,
        hasPayload: !!result.payload,
        userId: result.payload?.userId || null,
        error: result.error || null,
      })}`
    );
    
    if (result.valid && result.payload?.userId) {
      loggingCustom(
        LogType.LOGIN_LOG,
        'debug',
        `[API_AUTH] ✅ Authentication successful, userId: ${result.payload.userId}`
      );
      return result.payload.userId;
    } else {
      loggingCustom(
        LogType.LOGIN_LOG,
        'warn',
        `[API_AUTH] ❌ Token validation failed ${JSON.stringify({
          valid: result.valid,
          hasPayload: !!result.payload,
          hasUserId: !!result.payload?.userId,
          error: result.error || 'No error message',
        })}`
      );
    }
  } catch (error) {
    loggingCustom(
      LogType.LOGIN_LOG,
      'error',
      `[API_AUTH] Exception during token validation: ${error instanceof Error ? error.message : String(error)} ${error instanceof Error && error.stack ? `\nStack: ${error.stack}` : ''}`
    );
  }

  return null;
}

/**
 * Require authentication for API routes
 * 
 * This function:
 * 1. Checks if route is in EXCLUDED_LOGIN_ROUTES - if yes, allows request
 * 2. Checks if REQUIRE_LOGIN is true
 * 3. If REQUIRE_LOGIN is false, allows request (backward compatibility)
 * 4. If REQUIRE_LOGIN is true, validates token
 * 5. Returns { userId } on success or NextResponse with 401 on failure
 * 
 * @param request - NextRequest object
 * @returns { userId: string } on success, NextResponse with 401 on failure
 */
export function requireApiAuth(request: NextRequest): { userId: string } | NextResponse {
  const pathname = request.nextUrl.pathname;
  
  // Check if route is excluded from authentication
  if (isExcludedRoute(pathname)) {
    loggingCustom(
      LogType.LOGIN_LOG,
      'debug',
      `[API_AUTH] Route excluded from authentication: ${pathname}`
    );
    // Return a special marker to indicate excluded route
    // The caller should allow the request to proceed
    return { userId: '' }; // Empty userId indicates excluded route
  }
  
  // If REQUIRE_LOGIN is false, allow request (backward compatibility)
  if (!REQUIRE_LOGIN) {
    loggingCustom(
      LogType.LOGIN_LOG,
      'debug',
      `[API_AUTH] REQUIRE_LOGIN is false, allowing request: ${pathname}`
    );
    return { userId: '' }; // Empty userId indicates no auth required
  }
  
  // REQUIRE_LOGIN is true - validate authentication
  loggingCustom(
    LogType.LOGIN_LOG,
    'debug',
    `[API_AUTH] REQUIRE_LOGIN is true, checking authentication for: ${pathname}`
  );
  
  const userId = getUserIdFromRequest(request);
  
  if (!userId) {
    loggingCustom(
      LogType.LOGIN_LOG,
      'warn',
      `[API_AUTH] Authentication failed for: ${pathname}`
    );
    
    return NextResponse.json(
      {
        success: false,
        error: AUTH_CONFIG.ERROR_MESSAGES.UNAUTHORIZED,
        message: AUTH_CONFIG.ERROR_MESSAGES.MISSING_TOKEN,
      },
      { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
  
  loggingCustom(
    LogType.LOGIN_LOG,
    'debug',
    `[API_AUTH] Authentication successful for: ${pathname}, userId: ${userId}`
  );
  
  return { userId };
}

/**
 * Helper to check if auth result indicates excluded route or no auth required
 * Useful for routes that need to know if auth was skipped
 */
export function isAuthSkipped(authResult: { userId: string } | NextResponse): boolean {
  if (authResult instanceof NextResponse) {
    return false; // Error response means auth was required but failed
  }
  
  return authResult.userId === ''; // Empty userId means auth was skipped
}

