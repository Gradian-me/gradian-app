// Dynamic Query API Route
// Proxies GET requests to external backend dynamic-query endpoint
// Always proxies (no demo mode handling)

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { loadAllCompanies } from '@/gradian-ui/shared/utils/companies-loader';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { getTokenWithAudience } from '@/gradian-ui/shared/utils/token-audience.util';
import { extractTokenFromCookies } from '@/domains/auth';

// Utility functions for logging response bodies
const MAX_LOG_LENGTH = 2000;

const stringifyForLog = (value: unknown): string => {
  try {
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const truncateForLog = (value: string): string => {
  if (value.length <= MAX_LOG_LENGTH) {
    return value;
  }
  return `${value.slice(0, MAX_LOG_LENGTH)}… (truncated)`;
};

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

    // Get access token with audienceId from environment variable
    const appId = process.env.APP_ID;
    const authHeader = await getTokenWithAudience({
      request,
      audienceId: appId,
      logContext: '[Dynamic Query]',
    });

    // Extract fingerprint (same logic as proxyDataRequest)
    let fingerprint: string | null = null;
    const fingerprintHeader = request.headers.get('x-fingerprint') || request.headers.get('X-Fingerprint');
    
    if (fingerprintHeader) {
      fingerprint = fingerprintHeader.trim();
    } else {
      const cookies = request.headers.get('cookie');
      const fingerprintFromCookie = extractTokenFromCookies(cookies, 'x-fingerprint');
      if (fingerprintFromCookie) {
        fingerprint = fingerprintFromCookie;
      } else if (authHeader) {
        // Extract fingerprint from JWT token payload
        try {
          // Extract token from Bearer header
          const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
          const parts = token.split('.');
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
    
    // Set Authorization header if we have a token (REQUIRED for backend authentication)
    // Use 'Authorization' (capital A) as some backends are case-sensitive
    if (authHeader) {
      headers.set('Authorization', authHeader);
      loggingCustom(
        LogType.CALL_BACKEND,
        'info',
        `[Dynamic Query] Authorization header set for backend request (length: ${authHeader.length}, format: ${authHeader.substring(0, 10)}...)`
      );
    } else {
      loggingCustom(
        LogType.CALL_BACKEND,
        'warn',
        `[Dynamic Query] WARNING: No Authorization header available for backend request to ${targetUrl}`
      );
    }
    
    if (tenantDomain) {
      headers.set('x-tenant-domain', tenantDomain);
    }
    
    if (fingerprint) {
      headers.set('x-fingerprint', fingerprint);
    }

    // Final verification: Check that required headers are present
    const hasAuthorization = headers.has('Authorization') || headers.has('authorization');
    const hasTenantDomain = headers.has('x-tenant-domain') || headers.has('X-Tenant-Domain');
    const hasFingerprint = headers.has('x-fingerprint') || headers.has('X-Fingerprint');
    
    loggingCustom(
      LogType.CALL_BACKEND,
      hasAuthorization && hasTenantDomain && hasFingerprint ? 'info' : 'warn',
      `[Dynamic Query] Header verification: Authorization=${hasAuthorization ? '✓' : '✗'}, x-tenant-domain=${hasTenantDomain ? '✓' : '✗'}, x-fingerprint=${hasFingerprint ? '✓' : '✗'}`
    );

    // Log all headers being sent to backend for debugging (including complete Authorization header)
    const headersToSend: Record<string, string> = {};
    headers.forEach((value, key) => {
      headersToSend[key] = value; // Show complete headers including full Authorization Bearer token
    });
    loggingCustom(
      LogType.CALL_BACKEND,
      'info',
      `[Dynamic Query] Headers being sent to backend: ${JSON.stringify(headersToSend)}`
    );

    // Convert Headers object to plain object for fetch() to ensure proper serialization
    // Some fetch implementations may not properly serialize Headers objects
    // IMPORTANT: Use exact case for Authorization header as some backends are case-sensitive
    const headersObject: Record<string, string> = {};
    headers.forEach((value, key) => {
      // Ensure Authorization header uses capital A (some backends are case-sensitive)
      if (key.toLowerCase() === 'authorization') {
        headersObject['Authorization'] = value;
      } else {
        headersObject[key] = value;
      }
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
      const logLevel = response.status < 400 ? 'info' : response.status >= 500 ? 'error' : 'warn';
      loggingCustom(
        LogType.CALL_BACKEND,
        logLevel,
        `← ${response.status} ${response.statusText || ''} (JSON)`
      );
      // Log response body - always log for 4xx/5xx errors, use 'debug' for success
      if (response.status >= 400) {
        const bodyLogLevel = response.status >= 500 ? 'error' : 'warn';
        loggingCustom(
          LogType.CALL_BACKEND,
          bodyLogLevel,
          `Response body: ${truncateForLog(stringifyForLog(data))}`
        );
      } else {
        loggingCustom(
          LogType.CALL_BACKEND,
          'debug',
          `Response body: ${truncateForLog(stringifyForLog(data))}`
        );
      }
      return NextResponse.json(data, { status: response.status });
    }

    // Handle text responses
    const text = await response.text();
    const logLevel = response.status < 400 ? 'info' : response.status >= 500 ? 'error' : 'warn';
    loggingCustom(
      LogType.CALL_BACKEND,
      logLevel,
      `← ${response.status} ${response.statusText || ''} (text)`
    );
    // Log response text - always log for 4xx/5xx errors, use 'debug' for success
    if (text) {
      if (response.status >= 400) {
        const bodyLogLevel = response.status >= 500 ? 'error' : 'warn';
        loggingCustom(
          LogType.CALL_BACKEND,
          bodyLogLevel,
          `Response text: ${truncateForLog(text)}`
        );
      } else {
        loggingCustom(
          LogType.CALL_BACKEND,
          'debug',
          `Response text: ${truncateForLog(text)}`
        );
      }
    }
    
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

