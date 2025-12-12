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

  // Extract tenant domain for forwarding to external backend
  // Flow:
  // 1. Internal Next.js API requests include x-tenant-domain header
  // 2. External backend proxy gets x-tenant-domain from incoming request header OR extracts from DNS
  // 3. External backend proxy forwards x-tenant-domain to external backend
  //
  // Priority: x-tenant-domain header (from internal request) → extract from host DNS
  const tenantDomainHeader = request.headers.get('x-tenant-domain');
  if (tenantDomainHeader) {
    headers['x-tenant-domain'] = tenantDomainHeader;
  } else {
    // Fallback: Derive from request hostname (DNS-based multi-tenant)
    // Prefer x-forwarded-host (from reverse proxy) → host header → nextUrl hostname
    const forwardedHost = request.headers.get('x-forwarded-host');
    const hostHeader = request.headers.get('host');
    const rawHost = forwardedHost || hostHeader || request.nextUrl?.hostname || '';
    const normalizedHost = rawHost.trim().toLowerCase().split(':')[0];
    // Only set if we have a real domain (not localhost/internal)
    if (normalizedHost && normalizedHost !== 'localhost' && normalizedHost !== '127.0.0.1') {
      headers['x-tenant-domain'] = normalizedHost;
    }
  }

  // At this point, headers object has x-tenant-domain set (either from incoming header or DNS)
  // This will be forwarded to the external backend

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
        // Filter out cookie deletion headers (cookies with empty value or expires in past)
        // Only forward cookies that are being set, not deleted
        const isDeletion = cookie.includes('Max-Age=0') || 
                           cookie.includes('Expires=Thu, 01 Jan 1970') ||
                           cookie.match(/^[^=]+=\s*;\s*Expires=/);
        
        if (!isDeletion) {
          downstream.headers.append('set-cookie', cookie);
        }
      }
    });
  }
}


