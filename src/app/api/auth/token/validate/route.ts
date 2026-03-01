// POST /api/auth/token/validate
// Validates a JWT token and returns the payload if valid

import { NextRequest, NextResponse } from 'next/server';
import { validateToken, extractTokenFromHeader, extractTokenFromCookies } from '@/domains/auth';
import { AUTH_CONFIG } from '@/gradian-ui/shared/configs/auth-config';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { getAccessToken } from '@/app/api/auth/helpers/server-token-cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    // Try to get token from body, header, or cookies
    let tokenToValidate = token;

    if (!tokenToValidate) {
      // Try Authorization header
      const authHeader = request.headers.get('authorization');
      tokenToValidate = extractTokenFromHeader(authHeader);
    }

    if (!tokenToValidate) {
      // Try cookies
      const cookies = request.headers.get('cookie');
      tokenToValidate = extractTokenFromCookies(cookies, AUTH_CONFIG.ACCESS_TOKEN_COOKIE);
    }

    if (!tokenToValidate) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: AUTH_CONFIG.ERROR_MESSAGES.MISSING_TOKEN,
        },
        { status: 400 }
      );
    }

    // Validate token
    const result = validateToken(tokenToValidate);

    if (!result.valid) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: result.error || AUTH_CONFIG.ERROR_MESSAGES.INVALID_TOKEN,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        valid: true,
        payload: result.payload,
      },
      { status: 200 }
    );
  } catch (error) {
    loggingCustom(
      LogType.LOGIN_LOG,
      'error',
      `Token validation API error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        valid: false,
        error: error instanceof Error ? error.message : 'Token validation failed',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for convenience (reads from cookies/header)
// Used by AuthGuard: accepts access_token (header or cookie) or refresh_token (cookie) so session check works when only refresh cookie is present.
// When only refresh_token is present: if ServerTokenCache has a valid access token for it, we consider the session valid (consistent with proxy/RSC flows).
export async function GET(request: NextRequest) {
  try {
    // Try to get token from header or cookies
    let token: string | null = null;
    let usedRefreshTokenOnly = false;
    const cookies = request.headers.get('cookie');

    // Try Authorization header
    const authHeader = request.headers.get('authorization');
    token = extractTokenFromHeader(authHeader);

    if (!token) {
      token = extractTokenFromCookies(cookies, AUTH_CONFIG.ACCESS_TOKEN_COOKIE);
    }

    if (!token) {
      token = extractTokenFromCookies(cookies, AUTH_CONFIG.REFRESH_TOKEN_COOKIE);
      usedRefreshTokenOnly = !!token;
    }

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: AUTH_CONFIG.ERROR_MESSAGES.MISSING_TOKEN,
        },
        { status: 400 }
      );
    }

    // When we only have refresh token: if server has a valid access token in cache for this refresh token, session is valid (avoids kicking user out when RSC/proxy already succeeded with same cookie)
    if (usedRefreshTokenOnly) {
      const cachedAccess = getAccessToken(token);
      if (cachedAccess) {
        const accessResult = validateToken(cachedAccess);
        if (accessResult.valid) {
          loggingCustom(
            LogType.LOGIN_LOG,
            'debug',
            '[VALIDATE] Session valid via ServerTokenCache (refresh token had cached access token)',
          );
          return NextResponse.json(
            {
              success: true,
              valid: true,
              payload: accessResult.payload,
            },
            { status: 200 }
          );
        }
      }
      // Fall through to validate refresh token JWT as fallback (e.g. first request, or cache miss)
    }

    // Validate token (access or refresh JWT)
    const result = validateToken(token);

    if (!result.valid) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: result.error || AUTH_CONFIG.ERROR_MESSAGES.INVALID_TOKEN,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        valid: true,
        payload: result.payload,
      },
      { status: 200 }
    );
  } catch (error) {
    loggingCustom(
      LogType.LOGIN_LOG,
      'error',
      `Token validation API error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        valid: false,
        error: error instanceof Error ? error.message : 'Token validation failed',
      },
      { status: 500 }
    );
  }
}

