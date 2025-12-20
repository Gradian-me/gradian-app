// POST /api/auth/token/refresh
// Refreshes an access token using a refresh token from HttpOnly cookie
// Supports both local (demo mode) and external authentication

import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken, extractTokenFromHeader, extractTokenFromCookies } from '@/domains/auth';
import { AUTH_CONFIG } from '@/gradian-ui/shared/configs/auth-config';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { REQUIRE_LOGIN } from '@/gradian-ui/shared/configs/env-config';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import {
  isServerDemoMode,
  buildAuthServiceUrl,
  buildProxyHeaders,
} from '@/app/api/auth/helpers/external-auth.util';
import { storeAccessToken, updateTokenOnRefresh } from '@/app/api/auth/helpers/server-token-cache';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  loggingCustom(LogType.LOGIN_LOG, 'log', `[REFRESH_API] POST /api/auth/token/refresh - request received ${JSON.stringify({
    timestamp: new Date().toISOString(),
    hasBody: !!request.body,
  })}`);

  // If REQUIRE_LOGIN is false, skip refresh token handling
  const requireLogin = REQUIRE_LOGIN ?? false;
  
  if (!requireLogin) {
    loggingCustom(LogType.LOGIN_LOG, 'log', `[REFRESH_API] REQUIRE_LOGIN is false, skipping refresh token handling ${JSON.stringify({
      requireLogin: false,
      action: 'Returning success without token refresh',
    })}`);
    return NextResponse.json(
      {
        success: true,
        message: 'Login not required - refresh token handling skipped',
      },
      { status: 200 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { refreshToken } = body;

    // Try to get refresh token from body, header, or cookies
    let tokenToUse = refreshToken;
    let tokenSource = 'body';

    if (!tokenToUse) {
      // Try Authorization header
      const authHeader = request.headers.get('authorization');
      tokenToUse = extractTokenFromHeader(authHeader);
      if (tokenToUse) tokenSource = 'header';
    }

    if (!tokenToUse) {
      // Try cookies (refresh token should be in HttpOnly cookie)
      const cookies = request.headers.get('cookie');
      tokenToUse = extractTokenFromCookies(cookies, AUTH_CONFIG.REFRESH_TOKEN_COOKIE);
      if (tokenToUse) tokenSource = 'cookie';
    }

    loggingCustom(LogType.LOGIN_LOG, 'log', `[REFRESH_API] Refresh token source ${JSON.stringify({
      hasToken: !!tokenToUse,
      source: tokenToUse ? tokenSource : 'none',
      tokenPreview: tokenToUse ? `${tokenToUse.substring(0, 20)}...` : null,
    })}`);

    if (!tokenToUse) {
      loggingCustom(LogType.LOGIN_LOG, 'warn', `[REFRESH_API] No refresh token found ${JSON.stringify({
        checkedBody: true,
        checkedHeader: true,
        checkedCookies: true,
      })}`);
      return NextResponse.json(
        {
          success: false,
          error: AUTH_CONFIG.ERROR_MESSAGES.MISSING_TOKEN,
        },
        { status: 400 }
      );
    }

    const useDemoMode = isServerDemoMode();

    if (useDemoMode) {
      loggingCustom(LogType.LOGIN_LOG, 'log', '[REFRESH_API] Using local authentication (demo mode)');
      // Local authentication - refresh using local token service
      const result = refreshAccessToken(tokenToUse);

      if (!result.success) {
        loggingCustom(LogType.LOGIN_LOG, 'error', `[REFRESH_API] Local refresh failed ${JSON.stringify({
          error: result.error,
        })}`);
        return NextResponse.json(
          {
            success: false,
            error: result.error || AUTH_CONFIG.ERROR_MESSAGES.INVALID_TOKEN,
          },
          { status: 401 }
        );
      }

      const duration = Date.now() - startTime;
      
      // Store access token in server memory, keyed by refresh token
      if (result.accessToken && tokenToUse) {
        const expiresIn = AUTH_CONFIG.ACCESS_TOKEN_EXPIRY;
        storeAccessToken(tokenToUse, result.accessToken, expiresIn);
        loggingCustom(LogType.LOGIN_LOG, 'log', `[REFRESH_API] Stored access token in server memory`);
      }
      
      loggingCustom(LogType.LOGIN_LOG, 'log', `[REFRESH_API] Local refresh SUCCESS ${JSON.stringify({
        hasAccessToken: !!result.accessToken,
        tokenLength: result.accessToken?.length || 0,
        expiresIn: AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
        duration: `${duration}ms`,
        responseFormat: 'accessToken in body (NOT in cookie)',
        storage: 'SERVER MEMORY (keyed by refresh_token)',
      })}`);

      // Return access token in response body (for backward compatibility, though client doesn't need to store it)
      // Access token is now stored in server memory
      return NextResponse.json(
        {
          success: true,
          accessToken: result.accessToken,
          expiresIn: AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
          message: 'Token refreshed successfully',
        },
        { status: 200 }
      );
    } else {
      loggingCustom(LogType.LOGIN_LOG, 'log', '[REFRESH_API] Using external authentication service');
      // External authentication - proxy to external auth service
      const refreshUrl = buildAuthServiceUrl('/refresh');
      const headers = buildProxyHeaders(request);

      // Log request details
      const headersForLog = headers as Record<string, string>;
      loggingCustom(LogType.LOGIN_LOG, 'log', `[REFRESH_API] Calling external auth service ${JSON.stringify({
        url: refreshUrl,
        hasRefreshToken: !!tokenToUse,
        tokenPreview: tokenToUse ? `${tokenToUse.substring(0, 20)}...` : null,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          hasCookies: !!headersForLog.cookie,
          hasFingerprint: !!headersForLog['x-fingerprint'],
          hasTenantDomain: !!headersForLog['x-tenant-domain'],
        },
      })}`);

      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: tokenToUse }),
      });

      const fetchDuration = Date.now() - startTime;
      loggingCustom(LogType.LOGIN_LOG, 'log', `[REFRESH_API] External auth service response ${JSON.stringify({
        status: response.status,
        ok: response.ok,
        duration: `${fetchDuration}ms`,
        contentType: response.headers.get('content-type'),
      })}`);

      if (!response.ok) {
        // Try to parse error response
        let errorData: any = { error: 'Token refresh failed' };
        try {
          const responseText = await response.text();
          if (responseText) {
            try {
              errorData = JSON.parse(responseText);
            } catch (parseError) {
              // Not JSON, use text as error message
              errorData = { error: responseText || 'Token refresh failed' };
            }
          }
        } catch (readError) {
          loggingCustom(LogType.LOGIN_LOG, 'warn', `[REFRESH_API] Failed to read error response: ${readError instanceof Error ? readError.message : String(readError)}`);
        }
        
        loggingCustom(LogType.LOGIN_LOG, 'error', `[REFRESH_API] External refresh failed ${JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          error: errorData.error || errorData.message,
          errorData,
        })}`);
        return NextResponse.json(
          {
            success: false,
            error: errorData.error || errorData.message || 'Token refresh failed',
          },
          { status: response.status }
        );
      }

      // Parse successful response with error handling
      let data: any;
      try {
        const responseText = await response.text();
        if (responseText) {
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            loggingCustom(LogType.LOGIN_LOG, 'error', `[REFRESH_API] Failed to parse response as JSON ${JSON.stringify({
              error: parseError instanceof Error ? parseError.message : String(parseError),
              responsePreview: responseText.substring(0, 200),
            })}`);
            return NextResponse.json(
              {
                success: false,
                error: 'Invalid response format from external auth service',
              },
              { status: 500 }
            );
          }
        } else {
          loggingCustom(LogType.LOGIN_LOG, 'warn', `[REFRESH_API] Empty response body from external auth service`);
          data = {};
        }
      } catch (readError) {
        loggingCustom(LogType.LOGIN_LOG, 'error', `[REFRESH_API] Failed to read response: ${readError instanceof Error ? readError.message : String(readError)}`);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to read response from external auth service',
          },
          { status: 500 }
        );
      }
      
      // Handle both nested (tokens.accessToken) and flat (accessToken) response formats
      const accessToken = data?.tokens?.accessToken || data?.accessToken;
      const refreshToken = data?.tokens?.refreshToken || data?.refreshToken;
      const expiresIn = data?.tokens?.expiresIn || data?.expiresIn || AUTH_CONFIG.ACCESS_TOKEN_EXPIRY;
      const refreshTokenExpiresIn = data?.tokens?.refreshTokenExpiresIn || data?.refreshTokenExpiresIn || AUTH_CONFIG.REFRESH_TOKEN_EXPIRY;

      if (!accessToken) {
        loggingCustom(LogType.LOGIN_LOG, 'error', `[REFRESH_API] No access token in external response ${JSON.stringify({
          hasTokens: !!data?.tokens,
          hasAccessToken: !!data?.accessToken,
        })}`);
        return NextResponse.json(
          {
            success: false,
            error: 'No access token in refresh response',
          },
          { status: 500 }
        );
      }

      const totalDuration = Date.now() - startTime;
      
      // Store access token in server memory
      // If refresh token was rotated, update the cache entry
      if (accessToken) {
        if (refreshToken && refreshToken !== tokenToUse) {
          // Refresh token was rotated - update cache with new refresh token
          updateTokenOnRefresh(tokenToUse, refreshToken, accessToken, expiresIn);
          loggingCustom(LogType.LOGIN_LOG, 'log', `[REFRESH_API] Updated access token in server memory (refresh token rotated)`);
        } else if (tokenToUse) {
          // Same refresh token - just update access token
          storeAccessToken(tokenToUse, accessToken, expiresIn);
          loggingCustom(LogType.LOGIN_LOG, 'log', `[REFRESH_API] Stored access token in server memory`);
        }
      }
      
      loggingCustom(LogType.LOGIN_LOG, 'log', `[REFRESH_API] External refresh SUCCESS ${JSON.stringify({
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        tokenLength: accessToken.length,
        refreshTokenLength: refreshToken?.length || 0,
        expiresIn,
        refreshTokenExpiresIn,
        duration: `${totalDuration}ms`,
        responseFormat: 'accessToken in body (NOT in cookie)',
        storage: 'SERVER MEMORY (keyed by refresh_token)',
      })}`);

      // Return access token in response body (for backward compatibility, though client doesn't need to store it)
      // Access token is now stored in server memory
      const nextResponse = NextResponse.json(
        {
          success: true,
          accessToken,
          expiresIn,
          message: 'Token refreshed successfully',
        },
        { status: 200 }
      );

      // CRITICAL: Set refresh token cookie from response body
      // External service may rotate refresh tokens (one-time use)
      // We MUST set the new refresh token cookie so it's available on next request/page reload
      // We set it manually to ensure correct domain/path attributes for our app
      if (refreshToken) {
        loggingCustom(LogType.LOGIN_LOG, 'log', `[REFRESH_API] Setting refresh token cookie from response body ${JSON.stringify({
          tokenLength: refreshToken.length,
          cookieName: AUTH_CONFIG.REFRESH_TOKEN_COOKIE,
          maxAge: refreshTokenExpiresIn,
        })}`);
        
        nextResponse.cookies.set(AUTH_CONFIG.REFRESH_TOKEN_COOKIE, refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: refreshTokenExpiresIn,
          path: '/',
          // Don't set Domain - let browser use current domain (works for localhost and production)
        });
        
        loggingCustom(LogType.LOGIN_LOG, 'log', `[REFRESH_API] Refresh token cookie set successfully ${JSON.stringify({
          cookieName: AUTH_CONFIG.REFRESH_TOKEN_COOKIE,
          maxAge: refreshTokenExpiresIn,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        })}`);
      } else {
        loggingCustom(LogType.LOGIN_LOG, 'warn', `[REFRESH_API] WARNING: No refresh token in response body ${JSON.stringify({
          hasTokens: !!data?.tokens,
          hasRefreshToken: !!data?.refreshToken,
          responseKeys: Object.keys(data || {}),
        })}`);
      }

      // Also forward Set-Cookie headers from external service as fallback
      // This ensures compatibility if external service sets additional cookies
      const setCookieHeaders = response.headers.getSetCookie?.() || [];
      
      // Also try alternative methods to get Set-Cookie headers (for compatibility)
      let allSetCookies = setCookieHeaders;
      if (allSetCookies.length === 0) {
        // Try alternative method
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
          allSetCookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        }
      }
      
      loggingCustom(LogType.LOGIN_LOG, 'log', `[REFRESH_API] Forwarding Set-Cookie headers from external service (fallback) ${JSON.stringify({
        count: allSetCookies.length,
        method: setCookieHeaders.length > 0 ? 'getSetCookie()' : 'get(set-cookie)',
        note: 'Refresh token already set from response body above',
        headers: allSetCookies.map(c => {
          if (!c) return { name: 'null', preview: 'null' };
          // Extract cookie name for logging
          const cookieName = c.split('=')[0];
          const isRefreshToken = cookieName.toLowerCase().includes('refresh') || 
                                cookieName.toLowerCase() === AUTH_CONFIG.REFRESH_TOKEN_COOKIE.toLowerCase();
          return {
            name: cookieName,
            isRefreshToken,
            preview: c.substring(0, 100) + '...',
          };
        }),
      })}`);
      
      // Forward other cookies (not refresh_token, as we set it manually above)
      allSetCookies.forEach((cookie) => {
        if (!cookie) return;
        
        const cookieName = cookie.split('=')[0];
        const isRefreshTokenCookie = cookieName.toLowerCase() === AUTH_CONFIG.REFRESH_TOKEN_COOKIE.toLowerCase();
        
        // Skip refresh_token cookie - we set it manually from response body with correct attributes
        if (isRefreshTokenCookie) {
          loggingCustom(LogType.LOGIN_LOG, 'log', `[REFRESH_API] Skipping refresh_token from Set-Cookie (already set from response body) ${JSON.stringify({
            reason: 'Manually set with correct domain/path attributes',
          })}`);
          return;
        }
        
        // Filter out cookie deletion headers
        const isDeletion = cookie.includes('Max-Age=0') || 
                          cookie.includes('Expires=Thu, 01 Jan 1970') ||
                          cookie.match(/^[^=]+=\s*;\s*Expires=/);
        
        if (isDeletion) {
          loggingCustom(LogType.LOGIN_LOG, 'log', '[REFRESH_API] Skipping cookie deletion header');
          return;
        }
        
        // Forward other cookies (session tokens, etc.)
        nextResponse.headers.append('set-cookie', cookie);
        loggingCustom(LogType.LOGIN_LOG, 'log', `[REFRESH_API] Forwarded Set-Cookie header (non-refresh-token) ${JSON.stringify({
          cookieName,
        })}`);
      });

      return nextResponse;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    loggingCustom(LogType.LOGIN_LOG, 'error', `[REFRESH_API] Error during token refresh ${JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      duration: `${duration}ms`,
      stack: error instanceof Error ? error.stack : undefined,
    })}`);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      },
      { status: 500 }
    );
  }
}

