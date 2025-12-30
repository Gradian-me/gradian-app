// POST /api/auth/logout
// Logs out user by clearing tokens

import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG } from '@/gradian-ui/shared/configs/auth-config';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import {
  buildAuthServiceUrl,
  buildProxyHeaders,
  forwardSetCookieHeaders,
  getAuthServiceAppId,
  isServerDemoMode,
} from '@/app/api/auth/helpers/external-auth.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';

// Cookie deletion options must match the options used when setting cookies
// IMPORTANT: Must match exactly the options used in login route (getCookieBaseOptions)
const getCookieDeleteOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 0, // Set to 0 to delete
  expires: new Date(0), // Also set expires to past date for maximum compatibility
});

export async function POST(request: NextRequest) {
  try {
    if (isServerDemoMode()) {
      const response = NextResponse.json(
        {
          success: true,
          message: 'Logout successful',
        },
        { status: 200 }
      );

      // Clear tokens from cookies
      // IMPORTANT: Must use set() with maxAge: 0 and matching path/domain to properly delete cookies
      const deleteOptions = getCookieDeleteOptions();
      response.cookies.set(AUTH_CONFIG.ACCESS_TOKEN_COOKIE, '', deleteOptions);
      response.cookies.set(AUTH_CONFIG.REFRESH_TOKEN_COOKIE, '', deleteOptions);
      response.cookies.set(AUTH_CONFIG.SESSION_TOKEN_COOKIE ?? 'session_token', '', deleteOptions);
      response.cookies.set(AUTH_CONFIG.USER_SESSION_ID_COOKIE ?? 'user_session_id', '', deleteOptions);
      
      loggingCustom(LogType.LOGIN_LOG, 'log', `[LOGOUT_API] Cleared auth cookies (demo mode) ${JSON.stringify({
        clearedCookies: [
          AUTH_CONFIG.ACCESS_TOKEN_COOKIE,
          AUTH_CONFIG.REFRESH_TOKEN_COOKIE,
          AUTH_CONFIG.SESSION_TOKEN_COOKIE ?? 'session_token',
          AUTH_CONFIG.USER_SESSION_ID_COOKIE ?? 'user_session_id',
        ],
        path: deleteOptions.path,
        sameSite: deleteOptions.sameSite,
      })}`);

      return response;
    }

    let parsedBody: any = {};
    try {
      parsedBody = await request.json();
    } catch {
      parsedBody = {};
    }

    const deviceFingerprint = parsedBody.deviceFingerprint || parsedBody.fingerprint || '';

    const upstreamResponse = await fetch(buildAuthServiceUrl('/logout'), {
      method: 'POST',
      headers: {
        ...buildProxyHeaders(request),
        ...(request.headers.get('authorization')
          ? { authorization: request.headers.get('authorization') as string }
          : {}),
      },
      body: JSON.stringify({
        appId: getAuthServiceAppId(),
        deviceFingerprint,
      }),
    });

    const upstreamJson = await upstreamResponse.json().catch(() => null);

    const response = NextResponse.json(
      upstreamJson ?? {
        success: upstreamResponse.ok,
        message: upstreamResponse.ok ? 'Logout successful' : 'Logout failed',
      },
      { status: upstreamResponse.status }
    );

    // IMPORTANT: Must use set() with maxAge: 0 and matching path/domain to properly delete cookies
    // cookies.delete() may not work if path/domain don't match exactly
    const deleteOptions = getCookieDeleteOptions();
    response.cookies.set(AUTH_CONFIG.ACCESS_TOKEN_COOKIE, '', deleteOptions);
    response.cookies.set(AUTH_CONFIG.REFRESH_TOKEN_COOKIE, '', deleteOptions);
    response.cookies.set(AUTH_CONFIG.SESSION_TOKEN_COOKIE ?? 'session_token', '', deleteOptions);
    response.cookies.set(AUTH_CONFIG.USER_SESSION_ID_COOKIE ?? 'user_session_id', '', deleteOptions);
    
    loggingCustom(LogType.LOGIN_LOG, 'log', `[LOGOUT_API] Cleared auth cookies ${JSON.stringify({
      clearedCookies: [
        AUTH_CONFIG.ACCESS_TOKEN_COOKIE,
        AUTH_CONFIG.REFRESH_TOKEN_COOKIE,
        AUTH_CONFIG.SESSION_TOKEN_COOKIE ?? 'session_token',
        AUTH_CONFIG.USER_SESSION_ID_COOKIE ?? 'user_session_id',
      ],
      path: deleteOptions.path,
      sameSite: deleteOptions.sameSite,
      hasUpstreamResponse: !!upstreamResponse,
    })}`);

    forwardSetCookieHeaders(upstreamResponse, response);

    return response;
  } catch (error) {
    loggingCustom(
      LogType.LOGIN_LOG,
      'error',
      `Logout API error: ${error instanceof Error ? error.message : String(error)}`,
    );

    if (error instanceof Error && error.message.includes('URL_AUTHENTICATION')) {
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
        error: error instanceof Error ? error.message : 'Logout failed',
      },
      { status: 500 }
    );
  }
}

