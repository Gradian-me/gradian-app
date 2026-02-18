// POST /api/auth/token/validate
// Validates a JWT token and returns the payload if valid

import { NextRequest, NextResponse } from 'next/server';
import { validateToken, extractTokenFromHeader, extractTokenFromCookies } from '@/domains/auth';
import { AUTH_CONFIG } from '@/gradian-ui/shared/configs/auth-config';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';

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
// Used by AuthGuard: accepts access_token (header or cookie) or refresh_token (cookie) so session check works when only refresh cookie is present
export async function GET(request: NextRequest) {
  try {
    // Try to get token from header or cookies
    let token: string | null = null;
    const cookies = request.headers.get('cookie');

    // Try Authorization header
    const authHeader = request.headers.get('authorization');
    token = extractTokenFromHeader(authHeader);

    if (!token) {
      token = extractTokenFromCookies(cookies, AUTH_CONFIG.ACCESS_TOKEN_COOKIE);
    }

    // If no access token, try refresh token cookie (AuthGuard sends credentials; server may only have refresh_token set)
    if (!token) {
      token = extractTokenFromCookies(cookies, AUTH_CONFIG.REFRESH_TOKEN_COOKIE);
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

    // Validate token
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

