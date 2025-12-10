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
  loggingCustom(LogType.LOGIN_LOG, 'info', '========== LOGIN API CALLED ==========');
  loggingCustom(LogType.LOGIN_LOG, 'info', `Request received at: ${new Date().toISOString()}`);
  try {
    loggingCustom(LogType.LOGIN_LOG, 'info', 'POST /api/auth/login - Request received');

    let body: any;
    try {
      body = await request.json();
    } catch (parseError) {
      loggingCustom(LogType.LOGIN_LOG, 'warn', `Invalid JSON body: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      return NextResponse.json(
        { success: false, error: 'Invalid request payload' },
        { status: 400 }
      );
    }
    
    const emailOrUsername = body.emailOrUsername || body.email;
    const password = body.password;
    const deviceFingerprint = body.deviceFingerprint || body.fingerprint;

    // Validate input
    if (!emailOrUsername || !password) {
      loggingCustom(LogType.LOGIN_LOG, 'warn', 'Validation failed - missing email or password');
      const errorResponse = {
        success: false,
        error: 'Email and password are required',
      };
      loggingCustom(LogType.LOGIN_LOG, 'warn', `Response (400): ${JSON.stringify(errorResponse, null, 2)}`);
      return NextResponse.json(errorResponse, { status: 400 });
    }
    loggingCustom(LogType.LOGIN_LOG, 'debug', 'Input validation passed');

    const useDemoMode = isServerDemoMode();
    loggingCustom(LogType.LOGIN_LOG, 'debug', `Demo mode: ${useDemoMode}`);
    loggingCustom(LogType.LOGIN_LOG, 'debug', `Login locally: ${useDemoMode}`);

    if (useDemoMode) {
      loggingCustom(LogType.LOGIN_LOG, 'info', 'Using local authentication (demo mode)');
      // Authenticate against local data
      loggingCustom(LogType.LOGIN_LOG, 'debug', 'Calling authenticateUser...');
      const result = await authenticateUser({ email: emailOrUsername, password });
      loggingCustom(LogType.LOGIN_LOG, 'debug', `authenticateUser result: ${JSON.stringify({
        success: result.success,
        hasUser: !!result.user,
        hasTokens: !!result.tokens,
        error: result.error,
        message: result.message,
      })}`);

      if (!result.success) {
        loggingCustom(LogType.LOGIN_LOG, 'error', `Authentication failed: ${result.error}`);
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

      loggingCustom(LogType.LOGIN_LOG, 'debug', 'Applying token cookies...');
      applyTokenCookies(response, result.tokens);
      loggingCustom(LogType.LOGIN_LOG, 'debug', 'Token cookies applied');
      loggingCustom(LogType.LOGIN_LOG, 'info', '========== LOGIN API COMPLETED SUCCESSFULLY (DEMO MODE) ==========');
      return response;
    }

    // Proxy authentication request to external service
    loggingCustom(LogType.LOGIN_LOG, 'info', 'Using external authentication service');
    const proxyBody = {
      emailOrUsername,
      password,
      appId: getAuthServiceAppId(),
      deviceFingerprint: deviceFingerprint ?? '',
    };
    loggingCustom(LogType.LOGIN_LOG, 'debug', `Proxy body prepared: ${JSON.stringify({
      ...proxyBody,
      password: '***MASKED***',
      appId: proxyBody.appId,
    })}`);

    // Build proxy headers and URL
    let proxyHeaders: HeadersInit;
    let authServiceUrl: string;
    try {
      loggingCustom(LogType.LOGIN_LOG, 'debug', 'Building proxy headers and URL...');
      proxyHeaders = buildProxyHeaders(request);
      authServiceUrl = buildAuthServiceUrl('/login');
      
      loggingCustom(LogType.LOGIN_LOG, 'debug', `External auth service details: ${JSON.stringify({
        url: authServiceUrl,
        headers: proxyHeaders,
      })}`);
      
      // Log the external service URL and headers being sent
      loggingCustom(LogType.LOGIN_LOG, 'info', `Forwarding to external auth service: ${authServiceUrl}`);
      loggingCustom(LogType.LOGIN_LOG, 'debug', `Proxy Headers: ${JSON.stringify(proxyHeaders, null, 2)}`);
      loggingCustom(LogType.LOGIN_LOG, 'debug', `Proxy Body: ${JSON.stringify({ ...proxyBody, password: '***MASKED***' }, null, 2)}`);
    } catch (urlError) {
      loggingCustom(LogType.LOGIN_LOG, 'error', `Failed to build auth service URL: ${urlError instanceof Error ? urlError.message : String(urlError)}`);
      throw urlError;
    }

    loggingCustom(LogType.LOGIN_LOG, 'info', 'Sending request to external auth service...');
    const fetchStartTime = Date.now();
    const upstreamResponse = await fetch(authServiceUrl, {
      method: 'POST',
      headers: proxyHeaders,
      body: JSON.stringify(proxyBody),
    });
    const fetchDuration = Date.now() - fetchStartTime;
    loggingCustom(LogType.LOGIN_LOG, 'info', `External auth service response: ${JSON.stringify({
      duration: `${fetchDuration}ms`,
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      ok: upstreamResponse.ok,
      headers: Object.fromEntries(upstreamResponse.headers.entries()),
    })}`);

    loggingCustom(LogType.LOGIN_LOG, 'debug', 'Parsing external auth service response...');
    const upstreamJson = await upstreamResponse.json().catch(() => null);
    loggingCustom(LogType.LOGIN_LOG, 'debug', `External auth service response data: ${JSON.stringify({
      success: upstreamJson?.success,
      hasUser: !!upstreamJson?.user,
      hasTokens: !!upstreamJson?.tokens,
      error: upstreamJson?.error,
      message: upstreamJson?.message,
      fullData: JSON.stringify(upstreamJson, null, 2),
    })}`);

    if (!upstreamResponse.ok) {
      loggingCustom(LogType.LOGIN_LOG, 'error', `External auth service returned error: ${JSON.stringify({
        status: upstreamResponse.status,
        error: upstreamJson?.error,
        message: upstreamJson?.message,
      })}`);
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
    loggingCustom(LogType.LOGIN_LOG, 'debug', 'Applying token cookies from external auth...');
    applyTokenCookies(response, upstreamJson?.tokens);
    loggingCustom(LogType.LOGIN_LOG, 'debug', 'Forwarding set-cookie headers from external auth...');
    forwardSetCookieHeaders(upstreamResponse, response);
    loggingCustom(LogType.LOGIN_LOG, 'info', '========== LOGIN API COMPLETED SUCCESSFULLY (EXTERNAL AUTH) ==========');
    return response;
  } catch (error) {
    loggingCustom(LogType.LOGIN_LOG, 'error', '========== LOGIN API ERROR OCCURRED ==========');
    loggingCustom(LogType.LOGIN_LOG, 'error', `Error details: ${JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      cause: error instanceof Error ? error.cause : undefined,
    })}`);

    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    loggingCustom(LogType.LOGIN_LOG, 'error', `Exception caught: ${errorMessage}`);

    if (error instanceof Error && (error.message.includes('URL_AUTHENTICATION') || error.message.includes('APP_ID'))) {
      loggingCustom(LogType.LOGIN_LOG, 'error', 'Configuration error detected');
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
    loggingCustom(LogType.LOGIN_LOG, 'error', '========== LOGIN API ENDED WITH ERROR ==========');
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

