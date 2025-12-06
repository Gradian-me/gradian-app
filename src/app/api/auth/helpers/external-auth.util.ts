import { NextRequest, NextResponse } from 'next/server';
import { loadApplicationVariables } from '@/gradian-ui/shared/utils/application-variables-loader';

export function isServerDemoMode(): boolean {
  try {
    const vars = loadApplicationVariables();
    // For auth flows, prefer LOGIN_LOCALLY flag; fall back to DEMO_MODE for backward compatibility
    return Boolean(
      (vars as any)?.LOGIN_LOCALLY ?? (vars as any)?.DEMO_MODE
    );
  } catch (error) {
    console.warn('[auth] Failed to determine demo mode state:', error);
    return true;
  }
}

export function getAuthServiceBaseUrl(): string {
  const baseUrl = process.env.URL_AUTHENTICATION;
  if (!baseUrl) {
    throw new Error('URL_AUTHENTICATION is not configured');
  }
  return baseUrl.replace(/\/+$/, '');
}

export function getAuthServiceAppId(): string {
  const appId = process.env.APP_ID;
  if (!appId) {
    throw new Error('APP_ID is not configured');
  }
  return appId;
}

export function buildAuthServiceUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getAuthServiceBaseUrl()}${normalizedPath}`;
}

export function buildProxyHeaders(request: NextRequest): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  const fingerprintHeader = request.headers.get('x-fingerprint');
  if (fingerprintHeader) {
    headers['x-fingerprint'] = fingerprintHeader;
  }

  const authorizationHeader = request.headers.get('authorization');
  if (authorizationHeader) {
    headers.authorization = authorizationHeader;
  }

  const tenantDomainHeader = request.headers.get('x-tenant-domain');
  if (tenantDomainHeader) {
    headers['x-tenant-domain'] = tenantDomainHeader;
  }

  return headers;
}

export function forwardSetCookieHeaders(upstream: Response, downstream: NextResponse): void {
  const headers = upstream.headers as Headers & { getSetCookie?: () => string[] };
  const setCookieValues =
    headers.getSetCookie?.() ??
    ((headers as any).raw?.()['set-cookie'] as string[] | undefined) ??
    (headers.get('set-cookie') ? [headers.get('set-cookie') as string] : undefined);

  if (setCookieValues?.length) {
    setCookieValues.forEach((cookie) => {
      if (cookie) {
        downstream.headers.append('set-cookie', cookie);
      }
    });
  }
}


