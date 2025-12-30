// Dynamic Query API Route
// Proxies GET requests to external backend dynamic-query endpoint
// Always proxies (no demo mode handling)

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { loadAllCompanies } from '@/gradian-ui/shared/utils/companies-loader';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { extractTokenFromHeader, extractTokenFromCookies } from '@/domains/auth';
import { AUTH_CONFIG } from '@/gradian-ui/shared/configs/auth-config';
import { getAccessToken } from '@/app/api/auth/helpers/server-token-cache';

/**
 * POST - Proxy dynamic query request to backend
 * Example: POST /api/dynamic-query/my-query-id?flatten=true&companyIds=1,2,3
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ 'dynamic-query-id': string }> }
) {
  // Check authentication (unless route is excluded)
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return 401 if not authenticated
  }

  try {
    const { 'dynamic-query-id': dynamicQueryId } = await params;

    if (!dynamicQueryId) {
      return NextResponse.json(
        { success: false, error: 'Dynamic query ID is required' },
        { status: 400 }
      );
    }

    // Get base URL (prefer NEXT_PUBLIC_URL_DATA_CRUD, fallback to URL_DATA_CRUD)
    const baseUrl = (process.env.NEXT_PUBLIC_URL_DATA_CRUD || process.env.URL_DATA_CRUD)?.replace(/\/+$/, '');

    if (!baseUrl) {
      loggingCustom(LogType.INFRA_LOG, 'error', 'NEXT_PUBLIC_URL_DATA_CRUD or URL_DATA_CRUD environment variable is not defined.');
      return NextResponse.json(
        {
          success: false,
          error: 'Data service URL is not configured on the server.',
        },
        { status: 500 }
      );
    }

    // Handle companyIds parameter
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    let companyIdsParam = searchParams.get('companyIds');
    
    // If companyIds is "-1", missing, or empty, load all company IDs
    if (!companyIdsParam || companyIdsParam.trim() === '' || companyIdsParam === '-1') {
      try {
        const companies = await loadAllCompanies();
        const allCompanyIds = companies
          .map((company: any) => company.id)
          .filter((id: any) => id !== null && id !== undefined && id !== '-1')
          .map((id: any) => String(id).trim())
          .filter((id: string) => id.length > 0);
        
        if (allCompanyIds.length > 0) {
          companyIdsParam = allCompanyIds.join(',');
          searchParams.set('companyIds', companyIdsParam);
          loggingCustom(
            LogType.INFRA_LOG,
            'info',
            `[Dynamic Query] Loaded ${allCompanyIds.length} company IDs for "all companies" selection`
          );
        } else {
          loggingCustom(
            LogType.INFRA_LOG,
            'warn',
            '[Dynamic Query] No companies found when loading all company IDs'
          );
        }
      } catch (error) {
        loggingCustom(
          LogType.INFRA_LOG,
          'error',
          `[Dynamic Query] Failed to load all companies: ${error instanceof Error ? error.message : String(error)}`
        );
        // Continue without companyIds if loading fails
      }
    } else {
      // If companyIds is provided, ensure no spaces in the comma-separated list
      const trimmedCompanyIds = companyIdsParam
        .split(',')
        .map((id: string) => id.trim())
        .filter((id: string) => id.length > 0)
        .join(',');
      if (trimmedCompanyIds !== companyIdsParam) {
        searchParams.set('companyIds', trimmedCompanyIds);
      }
    }

    // Build target URL
    const queryString = searchParams.toString();
    const targetPath = `/api/dynamic-query/${dynamicQueryId}${queryString ? `?${queryString}` : ''}`;
    const targetUrl = `${baseUrl}${targetPath}`;
    
    loggingCustom(
      LogType.CALL_BACKEND,
      'debug',
      `[Dynamic Query] Proxying to: ${targetUrl} (baseUrl: ${baseUrl}, targetPath: ${targetPath})`
    );

    // Extract tenant domain (same logic as proxyDataRequest)
    let tenantDomain: string | undefined;
    const xTenantDomainHeader = request.headers.get('x-tenant-domain') || request.headers.get('X-Tenant-Domain');
    const xForwardedHost = request.headers.get('x-forwarded-host');
    const hostHeader = request.headers.get('host');
    const nextUrlHostname = request.nextUrl?.hostname;

    if (xTenantDomainHeader) {
      const tenantValue = xTenantDomainHeader.trim();
      try {
        if (tenantValue.startsWith('http://') || tenantValue.startsWith('https://')) {
          const url = new URL(tenantValue);
          tenantDomain = url.hostname.toLowerCase();
        } else {
          tenantDomain = tenantValue.toLowerCase();
        }
      } catch {
        tenantDomain = tenantValue.toLowerCase();
      }
    } else {
      let rawHost = '';
      if (xForwardedHost) {
        rawHost = xForwardedHost;
      } else if (hostHeader) {
        rawHost = hostHeader;
      } else if (nextUrlHostname) {
        rawHost = nextUrlHostname;
      }
      
      const normalizedHost = rawHost.trim().toLowerCase().split(':')[0];
      if (normalizedHost && normalizedHost !== 'localhost' && normalizedHost !== '127.0.0.1') {
        tenantDomain = normalizedHost;
      }
    }

    // Get access token (same logic as proxyDataRequest)
    let authHeader: string | null = null;
    let authToken: string | null = null;
    const cookies = request.headers.get('cookie');
    const refreshToken = extractTokenFromCookies(cookies, AUTH_CONFIG.REFRESH_TOKEN_COOKIE);

    if (refreshToken) {
      authToken = getAccessToken(refreshToken);
      if (authToken) {
        authHeader = `Bearer ${authToken}`;
      }
    }

    // Fallback: Try to get token from incoming Authorization header
    if (!authToken) {
      const incomingAuthHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      if (incomingAuthHeader) {
        authToken = extractTokenFromHeader(incomingAuthHeader);
        if (authToken) {
          authHeader = incomingAuthHeader.toLowerCase().startsWith('bearer ') 
            ? incomingAuthHeader 
            : `Bearer ${authToken}`;
        }
      }
    }

    // Extract fingerprint (same logic as proxyDataRequest)
    let fingerprint: string | null = null;
    const fingerprintHeader = request.headers.get('x-fingerprint') || request.headers.get('X-Fingerprint');
    
    if (fingerprintHeader) {
      fingerprint = fingerprintHeader.trim();
    } else {
      const fingerprintFromCookie = extractTokenFromCookies(cookies, 'x-fingerprint');
      if (fingerprintFromCookie) {
        fingerprint = fingerprintFromCookie;
      } else if (authToken) {
        // Extract fingerprint from JWT token payload
        try {
          const parts = authToken.split('.');
          if (parts.length === 3) {
            const payload = parts[1];
            let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) {
              base64 += '=';
            }
            const decoded = Buffer.from(base64, 'base64').toString('utf-8');
            const parsed = JSON.parse(decoded) as { fingerprint?: string };
            if (parsed.fingerprint && typeof parsed.fingerprint === 'string') {
              fingerprint = parsed.fingerprint;
            }
          }
        } catch {
          // Ignore fingerprint extraction errors
        }
      }
    }

    // Build headers for backend request
    const headers = new Headers();
    
    if (authHeader) {
      headers.set('Authorization', authHeader);
    }
    
    if (tenantDomain) {
      headers.set('x-tenant-domain', tenantDomain);
    }
    
    if (fingerprint) {
      headers.set('x-fingerprint', fingerprint);
    }

    // Convert Headers object to plain object for fetch()
    const headersObject: Record<string, string> = {};
    headers.forEach((value, key) => {
      headersObject[key] = value;
    });

    loggingCustom(LogType.CALL_BACKEND, 'info', `→ POST ${targetUrl}`);

    // Get request body if present
    let body: BodyInit | undefined;
    try {
      const requestBody = await request.text();
      if (requestBody) {
        body = requestBody;
        headersObject['content-type'] = request.headers.get('content-type') || 'application/json';
      }
    } catch {
      // No body or body already consumed
    }

    // Make request to backend
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: headersObject,
      body,
    });

    const contentType = response.headers.get('content-type');

    // Handle no content responses
    if (response.status === 204 || response.status === 205) {
      loggingCustom(
        LogType.CALL_BACKEND,
        'info',
        `← ${response.status} ${response.statusText || ''} (no content)`
      );
      return new NextResponse(null, { status: response.status });
    }

    // Handle JSON responses
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      loggingCustom(
        LogType.CALL_BACKEND,
        'info',
        `← ${response.status} ${response.statusText || ''} (JSON)`
      );
      return NextResponse.json(data, { status: response.status });
    }

    // Handle text responses
    const text = await response.text();
    loggingCustom(
      LogType.CALL_BACKEND,
      response.status < 400 ? 'info' : 'warn',
      `← ${response.status} ${response.statusText || ''} (text)`
    );
    
    const payload: Record<string, unknown> = {
      success: response.status < 400,
    };

    if (response.status < 400) {
      payload.data = text;
    } else {
      payload.error = text || 'Backend service returned an error.';
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `[Dynamic Query] Failed to proxy request: ${error instanceof Error ? error.message : String(error)}`
    );
    loggingCustom(
      LogType.CALL_BACKEND,
      'error',
      `Dynamic query proxy failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reach backend service',
      },
      { status: 500 }
    );
  }
}

