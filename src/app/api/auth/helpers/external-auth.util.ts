import { NextRequest, NextResponse } from 'next/server';
import { loadApplicationVariables } from '@/gradian-ui/shared/utils/application-variables-loader';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

export function isServerDemoMode(): boolean {
  try {
    const vars = loadApplicationVariables();
    // For auth flows, prefer LOGIN_LOCALLY flag; fall back to DEMO_MODE for backward compatibility
    return Boolean(
      (vars as any)?.LOGIN_LOCALLY ?? (vars as any)?.DEMO_MODE
    );
  } catch (error) {
    loggingCustom(
      LogType.LOGIN_LOG,
      'warn',
      `[auth] Failed to determine demo mode state: ${error instanceof Error ? error.message : String(error)}`,
    );
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
    // Fallback: Derive from browser/app request hostname (DNS-based multi-tenant)
    // IMPORTANT: Tenant domain comes from browser/app domain, NOT from backend service URLs
    // Prefer x-forwarded-host (from reverse proxy) → host header → nextUrl hostname
    const forwardedHost = request.headers.get('x-forwarded-host');
    const hostHeader = request.headers.get('host');
    const rawHost = forwardedHost || hostHeader || request.nextUrl?.hostname || '';
    const normalizedHost = rawHost.trim().toLowerCase().split(':')[0];
    // Only set if we have a real domain (not localhost/internal)
    // Note: localhost means no tenant context - this is correct
    if (normalizedHost && normalizedHost !== 'localhost' && normalizedHost !== '127.0.0.1') {
      headers['x-tenant-domain'] = normalizedHost;
    }
  }

  // At this point, headers object has x-tenant-domain set (either from incoming header or DNS)
  // This will be forwarded to the external backend

  return headers;
}

export function forwardSetCookieHeaders(upstream: Response, downstream: NextResponse): void {
  try {
    const headers = upstream.headers as Headers & { getSetCookie?: () => string[] };
    
    // Try multiple methods to get set-cookie headers (different fetch implementations)
    let setCookieValues: string[] | undefined;
    
    // Method 1: Standard getSetCookie() method (Node.js 18+)
    if (typeof headers.getSetCookie === 'function') {
      try {
        setCookieValues = headers.getSetCookie();
      } catch (e) {
        loggingCustom(LogType.LOGIN_LOG, 'debug', `getSetCookie() failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    
    // Method 2: Check for raw headers (some fetch implementations)
    if (!setCookieValues && (headers as any).raw) {
      try {
        const rawHeaders = (headers as any).raw();
        setCookieValues = rawHeaders['set-cookie'] as string[] | undefined;
      } catch (e) {
        loggingCustom(LogType.LOGIN_LOG, 'debug', `raw() failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    
    // Method 3: Get all set-cookie headers manually
    if (!setCookieValues) {
      const allSetCookies: string[] = [];
      headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          allSetCookies.push(value);
        }
      });
      if (allSetCookies.length > 0) {
        setCookieValues = allSetCookies;
      }
    }

    if (setCookieValues?.length) {
      loggingCustom(LogType.LOGIN_LOG, 'debug', `Forwarding ${setCookieValues.length} cookie(s) from external auth service`);
      setCookieValues.forEach((cookie, index) => {
        if (cookie && cookie.trim()) {
          // Filter out cookie deletion headers (cookies with empty value or expires in past)
          // Only forward cookies that are being set, not deleted
          const isDeletion = cookie.includes('Max-Age=0') || 
                             cookie.includes('Expires=Thu, 01 Jan 1970') ||
                             cookie.match(/^[^=]+=\s*;\s*Expires=/);
          
          if (!isDeletion) {
            // Normalize cookie: ensure proper domain/path attributes for cross-domain scenarios
            // Remove domain attribute if it's set to external service domain (let browser handle it)
            const normalizedCookie = cookie;
            try {
              // If cookie has Domain attribute pointing to external service, we might need to adjust it
              // For now, forward as-is and let the browser handle domain restrictions
              downstream.headers.append('set-cookie', normalizedCookie);
              loggingCustom(LogType.LOGIN_LOG, 'debug', `Forwarded cookie ${index + 1}: ${normalizedCookie.substring(0, 50)}...`);
            } catch (cookieError) {
              loggingCustom(LogType.LOGIN_LOG, 'warn', `Failed to forward cookie ${index + 1}: ${cookieError instanceof Error ? cookieError.message : String(cookieError)}`);
            }
          } else {
            loggingCustom(LogType.LOGIN_LOG, 'debug', `Skipping cookie deletion header: ${cookie.substring(0, 50)}...`);
          }
        }
      });
    } else {
      loggingCustom(LogType.LOGIN_LOG, 'debug', 'No set-cookie headers found in external auth response');
    }
  } catch (error) {
    loggingCustom(LogType.LOGIN_LOG, 'error', `Error forwarding set-cookie headers: ${error instanceof Error ? error.message : String(error)}`);
  }
}


