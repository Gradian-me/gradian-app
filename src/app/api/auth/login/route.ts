// POST /api/auth/login
// Authenticates user and returns JWT tokens

import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/domains/auth';
import { AUTH_CONFIG } from '@/gradian-ui/shared/configs/auth-config';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import {
  buildAuthServiceUrl,
  buildProxyHeaders,
  forwardSetCookieHeadersFromAxios,
  getAuthServiceAppId,
  isServerDemoMode,
} from '@/app/api/auth/helpers/external-auth.util';
import axios from 'axios';
import { storeAccessToken } from '@/app/api/auth/helpers/server-token-cache';

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

  // Access token is NOT stored in cookie - client stores in memory only
  // Only refresh token is stored in HttpOnly cookie for security

  if (tokens.refreshToken) {
    response.cookies.set(AUTH_CONFIG.REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...baseOptions,
      maxAge: AUTH_CONFIG.REFRESH_TOKEN_EXPIRY,
    });
  }

  // Do not set session_token cookie: sso_session (forwarded from auth) has the same value and is used for SSO.

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
      // Access token is returned in response body (client stores in memory)
      // Refresh token is set in HttpOnly cookie (not accessible to JavaScript)
      const responseData = {
        success: true,
        user: result.user,
        tokens: result.tokens ? { 
          ...result.tokens, 
          accessToken: result.tokens.accessToken, // Return access token in body
          refreshToken: '***MASKED***' // Refresh token is in HttpOnly cookie, not in response
        } : undefined,
        message: result.message || 'Login successful',
      };
      loggingCustom(LogType.LOGIN_LOG, 'info', `Response (200 - Demo Mode): ${JSON.stringify(responseData, null, 2)}`);

      const response = NextResponse.json(
        {
          success: true,
          user: result.user,
          tokens: result.tokens ? {
            accessToken: result.tokens.accessToken, // Return access token for client to store in memory
            // refreshToken is NOT returned - it's in HttpOnly cookie
          } : undefined,
          message: result.message || 'Login successful',
        },
        { status: 200 }
      );

      loggingCustom(LogType.LOGIN_LOG, 'debug', 'Applying token cookies (refresh token only)...');
      applyTokenCookies(response, result.tokens);
      loggingCustom(LogType.LOGIN_LOG, 'debug', 'Token cookies applied');
      
      // Store access token in server memory, keyed by refresh token
      if (result.tokens?.accessToken && result.tokens?.refreshToken) {
        const expiresIn = AUTH_CONFIG.ACCESS_TOKEN_EXPIRY;
        storeAccessToken(result.tokens.refreshToken, result.tokens.accessToken, expiresIn);
        loggingCustom(LogType.LOGIN_LOG, 'log', `[LOGIN_API] Stored access token in server memory`);
      }
      
      loggingCustom(LogType.LOGIN_LOG, 'log', `[LOGIN_API] Login successful (Demo Mode) ${JSON.stringify({
        hasAccessToken: !!result.tokens?.accessToken,
        hasRefreshToken: !!result.tokens?.refreshToken,
        accessTokenStorage: 'STORED IN SERVER MEMORY (keyed by refresh_token)',
        refreshTokenStorage: 'SET IN HTTPONLY COOKIE (not accessible to JavaScript)',
        accessTokenLength: result.tokens?.accessToken?.length || 0,
        refreshTokenInCookie: true,
        accessTokenInCookie: false,
      })}`);
      
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
    
    // Validate request body before sending
    if (!proxyBody.emailOrUsername || !proxyBody.password) {
      loggingCustom(LogType.LOGIN_LOG, 'error', 'Invalid proxy body - missing emailOrUsername or password');
      return NextResponse.json(
        { success: false, error: 'Invalid authentication request' },
        { status: 400 }
      );
    }
    
    if (!proxyBody.appId) {
      loggingCustom(LogType.LOGIN_LOG, 'error', 'Invalid proxy body - missing appId');
      return NextResponse.json(
        { success: false, error: 'Authentication service configuration error' },
        { status: 500 }
      );
    }
    
    const fetchStartTime = Date.now();
    let upstreamResponse: { status: number; statusText: string; data: any; headers: Record<string, unknown> };
    try {
      const axiosResponse = await axios.post(authServiceUrl, proxyBody, {
        headers: proxyHeaders as Record<string, string>,
        validateStatus: () => true, // accept any status so we can read body and forward Set-Cookie
        maxRedirects: 0,
      });
      upstreamResponse = {
        status: axiosResponse.status,
        statusText: axiosResponse.statusText,
        data: axiosResponse.data,
        headers: axiosResponse.headers as Record<string, unknown>,
      };
    } catch (fetchError) {
      loggingCustom(LogType.LOGIN_LOG, 'error', `Failed to connect to external auth service: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      return NextResponse.json(
        { success: false, error: 'Unable to connect to authentication service' },
        { status: 503 }
      );
    }
    const fetchDuration = Date.now() - fetchStartTime;
    const headersForLog = { ...upstreamResponse.headers };
    if (headersForLog['set-cookie']) (headersForLog as any)['set-cookie'] = '[REDACTED]';
    loggingCustom(LogType.LOGIN_LOG, 'info', `External auth service response: ${JSON.stringify({
      duration: `${fetchDuration}ms`,
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      ok: upstreamResponse.status >= 200 && upstreamResponse.status < 300,
      headers: headersForLog,
    })}`);

    loggingCustom(LogType.LOGIN_LOG, 'debug', 'Parsing external auth service response...');
    const upstreamJson = upstreamResponse.data ?? null;
    loggingCustom(LogType.LOGIN_LOG, 'debug', `External auth service response data: ${JSON.stringify({
      success: upstreamJson?.success,
      hasUser: !!upstreamJson?.user,
      hasTokens: !!upstreamJson?.tokens,
      error: upstreamJson?.error,
      message: upstreamJson?.message,
      fullData: JSON.stringify(upstreamJson, null, 2),
    })}`);

    if (upstreamResponse.status < 200 || upstreamResponse.status >= 300) {
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

      // Forward cookies even on error responses (external service may set session cookies)
      const errorNextResponse = NextResponse.json(errorResponse, { status: upstreamResponse.status });
      loggingCustom(LogType.LOGIN_LOG, 'debug', 'Forwarding set-cookie headers from external auth (error response)...');
      forwardSetCookieHeadersFromAxios(upstreamResponse.headers, errorNextResponse);

      loggingCustom(LogType.LOGIN_LOG, 'error', `Response (${upstreamResponse.status} - External Auth): ${JSON.stringify(errorResponse, null, 2)}`);
      return errorNextResponse;
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

    // Return access token in response body (client stores in memory)
    // Refresh token is set in HttpOnly cookie via forwardSetCookieHeaders
    const responseData = upstreamJson ? {
      success: upstreamJson.success,
      user: upstreamJson.user,
      tokens: upstreamJson.tokens ? {
        accessToken: upstreamJson.tokens.accessToken, // Return access token for client to store in memory
        // refreshToken is NOT returned - it's in HttpOnly cookie
      } : undefined,
      message: upstreamJson.message,
    } : { success: true };
    
    const response = NextResponse.json(responseData, { status: upstreamResponse.status });

    // Apply our token cookies FIRST (refresh_token, session_token, user_session_id).
    // NextResponse.cookies.set() can replace/clear manually appended Set-Cookie headers,
    // so we must append upstream cookies (sso_session) AFTER calling cookies.set().
    loggingCustom(LogType.LOGIN_LOG, 'debug', 'Applying token cookies from external auth (refresh token only)...');
    applyTokenCookies(response, upstreamJson?.tokens);

    // THEN forward external auth Set-Cookie headers (including sso_session).
    // Order matters: if we did this before cookies.set(), the latter would overwrite and drop sso_session.
    loggingCustom(LogType.LOGIN_LOG, 'debug', 'Forwarding set-cookie headers from external auth...');
    forwardSetCookieHeadersFromAxios(upstreamResponse.headers, response);
    
    // Log cookie configuration for debugging
    if (upstreamJson?.tokens?.refreshToken) {
      loggingCustom(LogType.LOGIN_LOG, 'log', `[LOGIN_API] Refresh token cookie configured ${JSON.stringify({
        cookieName: AUTH_CONFIG.REFRESH_TOKEN_COOKIE,
        tokenLength: upstreamJson.tokens.refreshToken.length,
        path: '/',
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: AUTH_CONFIG.REFRESH_TOKEN_EXPIRY,
      })}`);
    }
    
    const accessToken = upstreamJson?.tokens?.accessToken;
    const refreshToken = upstreamJson?.tokens?.refreshToken;
    
    // Store access token in server memory, keyed by refresh token
    // IMPORTANT: Use the refresh token from response body, which matches what we set in cookie via applyTokenCookies
    if (accessToken && refreshToken) {
      const expiresIn = upstreamJson?.tokens?.expiresIn || AUTH_CONFIG.ACCESS_TOKEN_EXPIRY;
      
      // Normalize refresh token (trim whitespace)
      // IMPORTANT: Use the exact value that will be in the cookie for storage key
      // Next.js cookies.set() doesn't encode, but we normalize to handle any edge cases
      const normalizedRefreshToken = refreshToken.trim();
      
      // Store access token using normalized refresh token as key
      // This key must match what we'll extract from cookies in future requests
      storeAccessToken(normalizedRefreshToken, accessToken, expiresIn);
      
      loggingCustom(LogType.LOGIN_LOG, 'log', `[LOGIN_API] Stored access token in server memory ${JSON.stringify({
        refreshTokenPreview: `${normalizedRefreshToken.substring(0, 30)}...`,
        refreshTokenLength: normalizedRefreshToken.length,
        accessTokenLength: accessToken.length,
        expiresIn: `${expiresIn}s`,
        cookieName: AUTH_CONFIG.REFRESH_TOKEN_COOKIE,
        storageKey: 'normalized_refresh_token_trimmed',
        note: 'Token stored with key matching what will be extracted from cookies (trimmed)',
      })}`);
    } else {
      loggingCustom(LogType.LOGIN_LOG, 'warn', `[LOGIN_API] Cannot store access token: missing accessToken or refreshToken`);
    }
    
    loggingCustom(LogType.LOGIN_LOG, 'log', `[LOGIN_API] Login successful (External Auth) ${JSON.stringify({
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenStorage: 'STORED IN SERVER MEMORY (keyed by refresh_token)',
      refreshTokenStorage: 'SET IN HTTPONLY COOKIE via Set-Cookie headers (not accessible to JavaScript)',
      accessTokenLength: accessToken?.length || 0,
      refreshTokenInCookie: true,
      accessTokenInCookie: false,
    })}`);
    
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

