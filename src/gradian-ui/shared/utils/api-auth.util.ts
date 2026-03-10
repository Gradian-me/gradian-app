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
import { validateToken, extractTokenFromHeader, extractTokenFromCookies, refreshAccessToken } from '@/domains/auth';
import { AUTH_CONFIG, EXCLUDED_LOGIN_ROUTES } from '@/gradian-ui/shared/configs/auth-config';
import { REQUIRE_LOGIN, DEMO_MODE } from '@/gradian-ui/shared/configs/env-config';
import { loggingCustom } from './logging-custom';
import { LogType } from '../configs/log-config';
import { getAccessToken, storeAccessToken, updateTokenOnRefresh } from '@/app/api/auth/helpers/server-token-cache';
import { isServerDemoMode, buildAuthServiceUrl, buildProxyHeaders } from '@/app/api/auth/helpers/external-auth.util';
import { enqueueServerRefresh } from '@/app/api/auth/helpers/server-refresh-cache';

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
 * Refresh access token using refresh token from cookies
 * Handles both demo mode and external auth
 * Uses server refresh coordinator to prevent race conditions
 */
async function refreshTokenFromRequest(request: NextRequest, refreshToken: string): Promise<string | null> {
  const useDemoMode = isServerDemoMode();
  
  // Use server refresh coordinator to prevent race conditions
  const refreshResult = await enqueueServerRefresh(refreshToken, async () => {
    if (useDemoMode) {
      // Local authentication - refresh using local token service
      loggingCustom(
        LogType.LOGIN_LOG,
        'debug',
        `[API_AUTH] Refreshing token using local authentication (demo mode)`
      );
      
      const result = refreshAccessToken(refreshToken);
      
      if (!result.success || !result.accessToken) {
        loggingCustom(
          LogType.LOGIN_LOG,
          'warn',
          `[API_AUTH] Local refresh failed ${JSON.stringify({
            error: result.error,
          })}`
        );
        return {
          accessToken: null,
          setCookieHeaders: [],
        };
      }
      
      // Store access token in server memory
      const expiresIn = AUTH_CONFIG.ACCESS_TOKEN_EXPIRY;
      storeAccessToken(refreshToken, result.accessToken, expiresIn);
      
      loggingCustom(
        LogType.LOGIN_LOG,
        'debug',
        `[API_AUTH] ✅ Local refresh successful, stored in server cache`
      );
      
      return {
        accessToken: result.accessToken,
        setCookieHeaders: [],
        expiresIn,
      };
    } else {
      // External authentication - proxy to external auth service
      loggingCustom(
        LogType.LOGIN_LOG,
        'debug',
        `[API_AUTH] Refreshing token using external authentication service`
      );
      
      const refreshUrl = buildAuthServiceUrl('/refresh');
      const headers = buildProxyHeaders(request);
      
      try {
        const response = await fetch(refreshUrl, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });
        
        if (!response.ok) {
          let errorData: any = { error: 'Token refresh failed' };
          try {
            const responseText = await response.text();
            if (responseText) {
              try {
                errorData = JSON.parse(responseText);
              } catch {
                errorData = { error: responseText || 'Token refresh failed' };
              }
            }
          } catch {
            // Ignore parse errors
          }
          
          loggingCustom(
            LogType.LOGIN_LOG,
            'warn',
            `[API_AUTH] External refresh failed ${JSON.stringify({
              status: response.status,
              error: errorData.error || errorData.message,
            })}`
          );
          
          return {
            accessToken: null,
            setCookieHeaders: [],
          };
        }
        
        // Parse successful response
        let data: any;
        try {
          const responseText = await response.text();
          if (responseText) {
            data = JSON.parse(responseText);
          } else {
            data = {};
          }
        } catch (parseError) {
          loggingCustom(
            LogType.LOGIN_LOG,
            'error',
            `[API_AUTH] Failed to parse external refresh response: ${parseError instanceof Error ? parseError.message : String(parseError)}`
          );
          return {
            accessToken: null,
            setCookieHeaders: [],
          };
        }
        
        // Handle both nested (tokens.accessToken) and flat (accessToken) response formats
        const accessToken = data?.tokens?.accessToken || data?.accessToken;
        const newRefreshToken = data?.tokens?.refreshToken || data?.refreshToken;
        const expiresIn = data?.tokens?.expiresIn || data?.expiresIn || AUTH_CONFIG.ACCESS_TOKEN_EXPIRY;
        
        if (!accessToken) {
          loggingCustom(
            LogType.LOGIN_LOG,
            'error',
            `[API_AUTH] No access token in external refresh response`
          );
          return {
            accessToken: null,
            setCookieHeaders: [],
          };
        }
        
        // Store access token in server memory
        if (newRefreshToken && newRefreshToken !== refreshToken) {
          // Refresh token was rotated - update cache with new refresh token
          updateTokenOnRefresh(refreshToken, newRefreshToken, accessToken, expiresIn);
          loggingCustom(
            LogType.LOGIN_LOG,
            'debug',
            `[API_AUTH] ✅ External refresh successful, stored in server cache (refresh token rotated)`
          );
        } else {
          // Same refresh token - just update access token
          storeAccessToken(refreshToken, accessToken, expiresIn);
          loggingCustom(
            LogType.LOGIN_LOG,
            'debug',
            `[API_AUTH] ✅ External refresh successful, stored in server cache`
          );
        }
        
        // Extract Set-Cookie headers from response
        const setCookieHeaders: string[] = [];
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
          setCookieHeaders.push(setCookieHeader);
        }
        const getSetCookie = (response.headers as any).getSetCookie;
        if (typeof getSetCookie === 'function') {
          try {
            const cookies = getSetCookie();
            if (Array.isArray(cookies)) {
              setCookieHeaders.push(...cookies);
            }
          } catch {
            // Ignore errors
          }
        }
        
        return {
          accessToken,
          setCookieHeaders,
          newRefreshToken,
          expiresIn,
        };
      } catch (error) {
        loggingCustom(
          LogType.LOGIN_LOG,
          'error',
          `[API_AUTH] Error during external refresh: ${error instanceof Error ? error.message : String(error)}`
        );
        return {
          accessToken: null,
          setCookieHeaders: [],
        };
      }
    }
  });
  
  return refreshResult.accessToken || null;
}

/**
 * Resolve access token for the request (header → cookie → server cache → refresh).
 * Returns raw access token or null.
 */
async function getResolvedToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  let token = extractTokenFromHeader(authHeader);
  if (!token) {
    const cookies = request.headers.get('cookie');
    token = extractTokenFromCookies(cookies, AUTH_CONFIG.ACCESS_TOKEN_COOKIE);
  }
  if (!token) {
    const cookies = request.headers.get('cookie');
    let refreshToken = extractTokenFromCookies(cookies, AUTH_CONFIG.REFRESH_TOKEN_COOKIE);
    if (refreshToken) {
      refreshToken = refreshToken.trim();
      const serverToken = getAccessToken(refreshToken);
      if (serverToken) {
        token = serverToken;
      } else {
        token = await refreshTokenFromRequest(request, refreshToken);
      }
    }
  }
  return token || null;
}

/**
 * Get Authorization header value for proxied requests (e.g. lookup service).
 * Resolves token from: header → cookie → server cache → automatic refresh.
 * Returns "Bearer <token>" or null.
 */
export async function getResolvedAccessTokenForProxy(request: NextRequest): Promise<string | null> {
  const token = await getResolvedToken(request);
  if (!token) return null;
  return token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
}

/**
 * Extract and validate user ID from request
 * Returns userId if valid, null otherwise
 * 
 * Checks in this order:
 * 1. Authorization header (Bearer token)
 * 2. Access token cookie
 * 3. Server-side token cache (using refresh token from cookies)
 * 4. Automatic refresh if refresh token exists but access token is missing
 */
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const token = await getResolvedToken(request);

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
export async function requireApiAuth(request: NextRequest): Promise<{ userId: string } | NextResponse> {
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
  
  const userId = await getUserIdFromRequest(request);
  
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

