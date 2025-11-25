// POST /api/auth/login
// Authenticates user and returns JWT tokens

import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/domains/auth';
import { AUTH_CONFIG } from '@/gradian-ui/shared/constants/application-variables';
import {
  buildAuthServiceUrl,
  buildProxyHeaders,
  forwardSetCookieHeaders,
  getAuthServiceAppId,
  isServerDemoMode,
} from '@/app/api/auth/helpers/external-auth.util';

const getCookieBaseOptions = (maxAge?: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: maxAge ?? AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
});

const applyTokenCookies = (response: NextResponse, tokens?: any): void => {
  if (!tokens) return;

  const baseOptions = getCookieBaseOptions(typeof tokens.expiresIn === 'number' ? tokens.expiresIn : undefined);

  if (tokens.accessToken) {
    response.cookies.set(AUTH_CONFIG.ACCESS_TOKEN_COOKIE, tokens.accessToken, baseOptions);
  }

  if (tokens.refreshToken) {
    response.cookies.set(AUTH_CONFIG.REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...baseOptions,
      maxAge: AUTH_CONFIG.REFRESH_TOKEN_EXPIRY,
    });
  }

  if (tokens.sessionToken) {
    response.cookies.set(AUTH_CONFIG.SESSION_TOKEN_COOKIE ?? 'session_token', tokens.sessionToken, baseOptions);
  }

  if (tokens.userSessionId) {
    response.cookies.set(
      AUTH_CONFIG.USER_SESSION_ID_COOKIE ?? 'user_session_id',
      tokens.userSessionId,
      baseOptions
    );
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const emailOrUsername = body.emailOrUsername || body.email;
    const password = body.password;
    const deviceFingerprint = body.deviceFingerprint || body.fingerprint;

    // Validate input
    if (!emailOrUsername || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and password are required',
        },
        { status: 400 }
      );
    }

    const useDemoMode = isServerDemoMode();

    if (useDemoMode) {
      // Authenticate against local data
      const result = await authenticateUser({ email: emailOrUsername, password });

      if (!result.success) {
        console.error('Authentication failed:', result.error);
        return NextResponse.json(
          {
            success: false,
            error: result.error || AUTH_CONFIG.ERROR_MESSAGES.UNAUTHORIZED,
          },
          { status: 401 }
        );
      }

      // Create response with user data and tokens
      const response = NextResponse.json(
        {
          success: true,
          user: result.user,
          tokens: result.tokens,
          message: result.message || 'Login successful',
        },
        { status: 200 }
      );

      applyTokenCookies(response, result.tokens);

      return response;
    }

    // Proxy authentication request to external service
    const proxyBody = {
      emailOrUsername,
      password,
      appId: getAuthServiceAppId(),
      deviceFingerprint: deviceFingerprint ?? '',
    };

    const upstreamResponse = await fetch(buildAuthServiceUrl('/login'), {
      method: 'POST',
      headers: buildProxyHeaders(request),
      body: JSON.stringify(proxyBody),
    });

    const upstreamJson = await upstreamResponse.json().catch(() => null);

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            upstreamJson?.error ||
            upstreamJson?.message ||
            `Authentication service responded with status ${upstreamResponse.status}`,
        },
        { status: upstreamResponse.status }
      );
    }

    const response = NextResponse.json(upstreamJson ?? { success: true }, { status: upstreamResponse.status });
    applyTokenCookies(response, upstreamJson?.tokens);
    forwardSetCookieHeaders(upstreamResponse, response);
    return response;
  } catch (error) {
    console.error('Login API error:', error);

    if (error instanceof Error && (error.message.includes('URL_AUTHENTICATION') || error.message.includes('APP_ID'))) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      },
      { status: 500 }
    );
  }
}

