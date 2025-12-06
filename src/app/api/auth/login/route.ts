// POST /api/auth/login
// Authenticates user and returns JWT tokens

import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/domains/auth';
import { AUTH_CONFIG, LogType } from '@/gradian-ui/shared/constants/application-variables';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
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
    // Log route being called
    loggingCustom(LogType.LOGIN_LOG, 'info', `POST /api/auth/login - Request received`);

    // Log headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    loggingCustom(LogType.LOGIN_LOG, 'debug', `Headers: ${JSON.stringify(headers, null, 2)}`);

    const body = await request.json();
    const emailOrUsername = body.emailOrUsername || body.email;
    const password = body.password;
    const deviceFingerprint = body.deviceFingerprint || body.fingerprint;

    // Log body (mask password for security)
    const sanitizedBody = { ...body };
    if (sanitizedBody.password) {
      sanitizedBody.password = '***MASKED***';
    }
    loggingCustom(LogType.LOGIN_LOG, 'debug', `Request Body: ${JSON.stringify(sanitizedBody, null, 2)}`);

    // Validate input
    if (!emailOrUsername || !password) {
      const errorResponse = {
        success: false,
        error: 'Email and password are required',
      };
      loggingCustom(LogType.LOGIN_LOG, 'warn', `Response (400): ${JSON.stringify(errorResponse, null, 2)}`);
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const useDemoMode = isServerDemoMode();
    loggingCustom(LogType.LOGIN_LOG, 'debug', `Demo mode: ${useDemoMode}`);

    if (useDemoMode) {
      // Authenticate against local data
      const result = await authenticateUser({ email: emailOrUsername, password });

      if (!result.success) {
        console.error('Authentication failed:', result.error);
        const errorResponse = {
          success: false,
          error: result.error || AUTH_CONFIG.ERROR_MESSAGES.UNAUTHORIZED,
        };
        loggingCustom(LogType.LOGIN_LOG, 'error', `Response (401): ${JSON.stringify(errorResponse, null, 2)}`);
        return NextResponse.json(errorResponse, { status: 401 });
      }

      // Create response with user data and tokens
      const responseData = {
        success: true,
        user: result.user,
        tokens: result.tokens ? { ...result.tokens, accessToken: '***MASKED***', refreshToken: '***MASKED***' } : undefined,
        message: result.message || 'Login successful',
      };
      loggingCustom(LogType.LOGIN_LOG, 'info', `Response (200 - Demo Mode): ${JSON.stringify(responseData, null, 2)}`);

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

    // Build proxy headers and URL
    let proxyHeaders: HeadersInit;
    let authServiceUrl: string;
    try {
      proxyHeaders = buildProxyHeaders(request);
      authServiceUrl = buildAuthServiceUrl('/login');
      
      // Log the external service URL and headers being sent
      loggingCustom(LogType.LOGIN_LOG, 'info', `Forwarding to external auth service: ${authServiceUrl}`);
      loggingCustom(LogType.LOGIN_LOG, 'debug', `Proxy Headers: ${JSON.stringify(proxyHeaders, null, 2)}`);
      loggingCustom(LogType.LOGIN_LOG, 'debug', `Proxy Body: ${JSON.stringify({ ...proxyBody, password: '***MASKED***' }, null, 2)}`);
    } catch (urlError) {
      loggingCustom(LogType.LOGIN_LOG, 'error', `Failed to build auth service URL: ${urlError instanceof Error ? urlError.message : String(urlError)}`);
      throw urlError;
    }

    const upstreamResponse = await fetch(authServiceUrl, {
      method: 'POST',
      headers: proxyHeaders,
      body: JSON.stringify(proxyBody),
    });

    const upstreamJson = await upstreamResponse.json().catch(() => null);

    if (!upstreamResponse.ok) {
      const errorResponse = {
        success: false,
        error:
          upstreamJson?.error ||
          upstreamJson?.message ||
          `Authentication service responded with status ${upstreamResponse.status}`,
      };
      loggingCustom(LogType.LOGIN_LOG, 'error', `Response (${upstreamResponse.status} - External Auth): ${JSON.stringify(errorResponse, null, 2)}`);
      return NextResponse.json(errorResponse, { status: upstreamResponse.status });
    }

    // Log response (mask tokens for security)
    const sanitizedResponse = upstreamJson ? {
      ...upstreamJson,
      tokens: upstreamJson.tokens ? {
        ...upstreamJson.tokens,
        accessToken: '***MASKED***',
        refreshToken: '***MASKED***',
      } : undefined,
    } : { success: true };
    loggingCustom(LogType.LOGIN_LOG, 'info', `Response (${upstreamResponse.status} - External Auth): ${JSON.stringify(sanitizedResponse, null, 2)}`);

    const response = NextResponse.json(upstreamJson ?? { success: true }, { status: upstreamResponse.status });
    applyTokenCookies(response, upstreamJson?.tokens);
    forwardSetCookieHeaders(upstreamResponse, response);
    return response;
  } catch (error) {
    console.error('Login API error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    loggingCustom(LogType.LOGIN_LOG, 'error', `Exception caught: ${errorMessage}`);

    if (error instanceof Error && (error.message.includes('URL_AUTHENTICATION') || error.message.includes('APP_ID'))) {
      const errorResponse = {
        success: false,
        error: error.message,
      };
      loggingCustom(LogType.LOGIN_LOG, 'error', `Response (500): ${JSON.stringify(errorResponse, null, 2)}`);
      return NextResponse.json(errorResponse, { status: 500 });
    }
    const errorResponse = {
      success: false,
      error: errorMessage,
    };
    loggingCustom(LogType.LOGIN_LOG, 'error', `Response (500): ${JSON.stringify(errorResponse, null, 2)}`);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

