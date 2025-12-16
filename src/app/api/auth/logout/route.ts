// POST /api/auth/logout
// Logs out user by clearing tokens

import { NextRequest, NextResponse } from 'next/server';
import { AUTH_CONFIG, LogType } from '@/gradian-ui/shared/constants/application-variables';
import {
  buildAuthServiceUrl,
  buildProxyHeaders,
  forwardSetCookieHeaders,
  getAuthServiceAppId,
  isServerDemoMode,
} from '@/app/api/auth/helpers/external-auth.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';

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
      response.cookies.delete(AUTH_CONFIG.ACCESS_TOKEN_COOKIE);
      response.cookies.delete(AUTH_CONFIG.REFRESH_TOKEN_COOKIE);
      response.cookies.delete(AUTH_CONFIG.SESSION_TOKEN_COOKIE ?? 'session_token');
      response.cookies.delete(AUTH_CONFIG.USER_SESSION_ID_COOKIE ?? 'user_session_id');

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

    response.cookies.delete(AUTH_CONFIG.ACCESS_TOKEN_COOKIE);
    response.cookies.delete(AUTH_CONFIG.REFRESH_TOKEN_COOKIE);
    response.cookies.delete(AUTH_CONFIG.SESSION_TOKEN_COOKIE ?? 'session_token');
    response.cookies.delete(AUTH_CONFIG.USER_SESSION_ID_COOKIE ?? 'user_session_id');

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

