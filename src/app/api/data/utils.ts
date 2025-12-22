import { NextRequest, NextResponse } from 'next/server';

import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { DEMO_MODE } from '@/gradian-ui/shared/configs/env-config';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { extractTokenFromHeader, extractTokenFromCookies } from '@/domains/auth';
import { AUTH_CONFIG } from '@/gradian-ui/shared/configs/auth-config';
import { getAccessToken } from '@/app/api/auth/helpers/server-token-cache';

const TRUTHY_VALUES = new Set(['true', '1', 'yes', 'on']);
const DATA_ROUTE_PREFIX = '/api/data';
const DATA_LIST_ARRAY_PATHS: Array<Array<string>> = [
  ['data'],
  ['data', 'data'],
  ['data', 'items'],
  ['data', 'result'],
  ['data', 'results'],
  ['items'],
  ['results'],
  ['result'],
  ['records'],
  ['rows'],
];
const DATA_OBJECT_PATHS: Array<Array<string>> = [
  ['data'],
  ['item'],
  ['result'],
  ['entity'],
  ['payload'],
];

type ProxyOptions = {
  body?: unknown;
  method?: string;
  headers?: HeadersInit;
};

type NormalizeContext = {
  method: string;
  status: number;
  targetPathWithQuery: string;
};

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

export const isDemoModeEnabled = (): boolean => {
  // On server, use the loader to get fresh values from the file system
  if (typeof window === 'undefined') {
    try {
      return DEMO_MODE;
    } catch {
      // Fallback to static value
      return DEMO_MODE;
    }
  }
  // On client, use static value (client can fetch from API if needed)
  return DEMO_MODE;
};

/**
 * Enrich entity with user objects for createdBy and updatedBy fields
 * Only in demo mode - replaces user IDs with full user objects (excluding password)
 * This function should only be called on the server side
 */
export async function enrichWithUsers(entity: any): Promise<any> {
  if (!isDemoModeEnabled() || typeof window !== 'undefined') {
    return entity;
  }

  try {
    const { readSchemaData } = await import('@/gradian-ui/shared/domain/utils/data-storage.util');
    const users = readSchemaData<any>('users');
    
    // Create a map of user IDs to user objects (excluding password)
    const userMap = new Map<string, any>();
    users.forEach((user: any) => {
      if (user && user.id) {
        const { password, hashType, ...userWithoutPassword } = user;
        userMap.set(user.id, userWithoutPassword);
      }
    });

    const enriched = { ...entity };

    // Replace createdBy ID with user object if it exists
    if (enriched.createdBy && typeof enriched.createdBy === 'string') {
      const user = userMap.get(enriched.createdBy);
      if (user) {
        enriched.createdBy = user;
      }
    }

    // Replace updatedBy ID with user object if it exists
    if (enriched.updatedBy && typeof enriched.updatedBy === 'string') {
      const user = userMap.get(enriched.updatedBy);
      if (user) {
        enriched.updatedBy = user;
      }
    }

    return enriched;
  } catch (error) {
    // If enrichment fails, return original entity
    loggingCustom(LogType.INFRA_LOG, 'warn', `[enrichWithUsers] Failed to enrich entity: ${error instanceof Error ? error.message : String(error)}`);
    return entity;
  }
}

/**
 * Enrich array of entities with user objects
 */
export async function enrichEntitiesWithUsers(entities: any[]): Promise<any[]> {
  if (!isDemoModeEnabled() || typeof window !== 'undefined' || !Array.isArray(entities)) {
    return entities;
  }

  const enriched = await Promise.all(entities.map(entity => enrichWithUsers(entity)));
  return enriched;
}

const getPathWithoutQuery = (targetPath: string): string => {
  const queryIndex = targetPath.indexOf('?');
  if (queryIndex === -1) {
    return targetPath;
  }
  return targetPath.slice(0, queryIndex);
};

const isDataListRoute = (pathWithoutQuery: string): boolean => {
  // Matches /api/data/[schema-id] but not /api/data/[schema-id]/[id] or /api/data/all-relations
  return (
    pathWithoutQuery.startsWith(`${DATA_ROUTE_PREFIX}/`) &&
    pathWithoutQuery !== `${DATA_ROUTE_PREFIX}/all-relations` &&
    pathWithoutQuery.split('/').length === 4 // /api/data/[schema-id]
  );
};

const isDataDetailRoute = (pathWithoutQuery: string): boolean => {
  // Matches /api/data/[schema-id]/[id]
  return (
    pathWithoutQuery.startsWith(`${DATA_ROUTE_PREFIX}/`) &&
    pathWithoutQuery !== `${DATA_ROUTE_PREFIX}/all-relations` &&
    pathWithoutQuery.split('/').length === 5 // /api/data/[schema-id]/[id]
  );
};

const isDataRelationsRoute = (pathWithoutQuery: string): boolean => {
  return pathWithoutQuery === `${DATA_ROUTE_PREFIX}/all-relations`;
};

const getNestedValue = (source: unknown, path: Array<string>): unknown => {
  return path.reduce<unknown>((value, key) => {
    if (value && typeof value === 'object' && key in (value as Record<string, unknown>)) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
};

const findArrayCandidate = (payload: unknown): unknown[] | undefined => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  for (const path of DATA_LIST_ARRAY_PATHS) {
    const candidate = getNestedValue(payload, path);
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return undefined;
};

const findObjectCandidate = (payload: unknown): Record<string, unknown> | undefined => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined;
  }

  const objectPayload = payload as Record<string, unknown>;

  for (const path of DATA_OBJECT_PATHS) {
    const candidate = getNestedValue(objectPayload, path);
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return candidate as Record<string, unknown>;
    }
  }

  return objectPayload;
};

const normalizeDataListResponse = (payload: unknown, context: NormalizeContext) => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const payloadRecord = payload as Record<string, unknown>;
    if (Array.isArray(payloadRecord.data)) {
      return payload;
    }
  }

  const dataList = findArrayCandidate(payload);
  const success =
    payload &&
    typeof payload === 'object' &&
    'success' in (payload as Record<string, unknown>)
      ? Boolean((payload as Record<string, unknown>).success)
      : context.status < 400;

  const base: Record<string, unknown> =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? { ...(payload as Record<string, unknown>) }
      : {};

  const normalized: Record<string, unknown> = {
    ...('meta' in base && typeof base.meta === 'object' ? { meta: base.meta } : {}),
    ...(typeof base.message === 'string' ? { message: base.message } : {}),
    success,
    data: dataList ?? [],
  };

  if (!dataList) {
    const errorMessage =
      typeof base.error === 'string'
        ? base.error
        : 'Unexpected response format from upstream data service.';
    normalized.error = errorMessage;
    loggingCustom(LogType.INFRA_LOG, 'warn', '[data-proxy] Unable to locate data list array in upstream response.');
  }

  return normalized;
};

const normalizeDataDetailResponse = (payload: unknown, context: NormalizeContext) => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const payloadRecord = payload as Record<string, unknown>;
    if ('success' in payloadRecord && 'data' in payloadRecord) {
      return payload;
    }
  }

  const success =
    payload &&
    typeof payload === 'object' &&
    'success' in (payload as Record<string, unknown>)
      ? Boolean((payload as Record<string, unknown>).success)
      : context.status < 400;

  const objectCandidate = findObjectCandidate(payload);

  const message =
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    typeof (payload as Record<string, unknown>).message === 'string'
      ? (payload as Record<string, unknown>).message
      : undefined;

  const error =
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    typeof (payload as Record<string, unknown>).error === 'string'
      ? (payload as Record<string, unknown>).error
      : undefined;

  const normalized: Record<string, unknown> = {
    success,
    data: objectCandidate ?? payload,
  };

  if (message) {
    normalized.message = message;
  }

  if (error && !success) {
    normalized.error = error;
  }

  return normalized;
};

const normalizeDataMutationResponse = (payload: unknown, context: NormalizeContext) => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const payloadRecord = payload as Record<string, unknown>;
    if ('success' in payloadRecord) {
      if (!('error' in payloadRecord) && context.status >= 400) {
        const inferredError =
          typeof payloadRecord.message === 'string'
            ? payloadRecord.message
            : 'Data service reported an error.';
        return { ...payloadRecord, error: inferredError };
      }
      return payloadRecord;
    }
  }

  const success =
    payload &&
    typeof payload === 'object' &&
    'success' in (payload as Record<string, unknown>)
      ? Boolean((payload as Record<string, unknown>).success)
      : context.status < 400;

  const baseMessage =
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    typeof (payload as Record<string, unknown>).message === 'string'
      ? (payload as Record<string, unknown>).message
      : undefined;

  const errorMessage =
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    typeof (payload as Record<string, unknown>).error === 'string'
      ? (payload as Record<string, unknown>).error
      : undefined;

  return {
    success,
    data:
      payload &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      'data' in (payload as Record<string, unknown>)
        ? (payload as Record<string, unknown>).data
        : payload,
    ...(baseMessage ? { message: baseMessage } : {}),
    ...(!success
      ? {
          error:
            errorMessage ??
            baseMessage ??
            'Data service rejected the request with an unknown error.',
        }
      : {}),
  };
};

const normalizeUpstreamDataResponse = (payload: unknown, context: NormalizeContext) => {
  const pathWithoutQuery = getPathWithoutQuery(context.targetPathWithQuery);
  if (!pathWithoutQuery.startsWith(DATA_ROUTE_PREFIX)) {
    return payload;
  }

  switch (context.method) {
    case 'GET': {
      if (isDataListRoute(pathWithoutQuery)) {
        return normalizeDataListResponse(payload, context);
      }
      if (isDataDetailRoute(pathWithoutQuery)) {
        return normalizeDataDetailResponse(payload, context);
      }
      if (isDataRelationsRoute(pathWithoutQuery)) {
        // Relations route can return its own format
        return payload;
      }
      break;
    }
    case 'POST':
    case 'PUT':
    case 'PATCH':
    case 'DELETE':
      return normalizeDataMutationResponse(payload, context);
    default:
      break;
  }

  return payload;
};

export const proxyDataRequest = async (
  request: NextRequest,
  targetPathWithQuery: string,
  options: ProxyOptions = {}
) => {
  const baseUrl = process.env.URL_DATA_CRUD?.replace(/\/+$/, '');

  if (!baseUrl) {
    loggingCustom(LogType.INFRA_LOG, 'error', 'URL_DATA_CRUD environment variable is not defined.');
    loggingCustom(
      LogType.CALL_BACKEND,
      'error',
      'Data proxy aborted: URL_DATA_CRUD environment variable is not defined.'
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Data service URL is not configured on the server.',
      },
      { status: 500 }
    );
  }

  const targetUrl = `${baseUrl}${targetPathWithQuery}`;

  // Extract tenant domain BEFORE creating new Headers object to ensure we check original request
  // IMPORTANT: Tenant domain must come from the browser/app domain, NOT from backend service URLs
  // Flow:
  // 1. Internal Next.js API requests (from data-loader.ts) include x-tenant-domain header
  // 2. External backend proxy gets x-tenant-domain from incoming request header OR extracts from browser/app DNS
  // 3. External backend proxy forwards x-tenant-domain to external backend
  //
  // Priority: x-tenant-domain header (from internal request) → extract from browser/app host DNS
  let tenantDomain: string | undefined;
  
  // Log all relevant headers for debugging tenant domain extraction
  const xTenantDomainHeader = request.headers.get('x-tenant-domain');
  const xTenantDomainHeaderUpper = request.headers.get('X-Tenant-Domain');
  const xForwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = request.headers.get('host');
  const nextUrlHostname = request.nextUrl?.hostname;
  
  loggingCustom(
    LogType.CALL_BACKEND,
    'debug',
    `[proxyDataRequest] [Tenant Domain Extraction] Headers: x-tenant-domain="${xTenantDomainHeader || xTenantDomainHeaderUpper || '(not set)'}", x-forwarded-host="${xForwardedHost || '(not set)'}", host="${hostHeader || '(not set)'}", nextUrl.hostname="${nextUrlHostname || '(not set)'}"`
  );
  
  // First, check if x-tenant-domain is already in the incoming request
  // This header comes from the browser/app domain, not from backend URLs
  // IMPORTANT: Normalize it - extract hostname if it's a URL, or use as-is if it's already a hostname
  const existingTenantHeader = xTenantDomainHeader || xTenantDomainHeaderUpper;
  
  if (existingTenantHeader) {
    const tenantValue = existingTenantHeader.trim();
    try {
      // If it's a URL (starts with http:// or https://), extract hostname
      if (tenantValue.startsWith('http://') || tenantValue.startsWith('https://')) {
        const url = new URL(tenantValue);
        tenantDomain = url.hostname.toLowerCase();
        loggingCustom(
          LogType.CALL_BACKEND,
          'info',
          `[proxyDataRequest] [Tenant Domain Extraction] Using x-tenant-domain header (extracted hostname from URL): ${tenantDomain}`
        );
      } else {
        // If it's already a hostname, use it directly (but normalize to lowercase)
        tenantDomain = tenantValue.toLowerCase();
        loggingCustom(
          LogType.CALL_BACKEND,
          'info',
          `[proxyDataRequest] [Tenant Domain Extraction] Using x-tenant-domain header (hostname): ${tenantDomain}`
        );
      }
    } catch {
      // If URL parsing fails, treat as hostname
      tenantDomain = tenantValue.toLowerCase();
      loggingCustom(
        LogType.CALL_BACKEND,
        'info',
        `[proxyDataRequest] [Tenant Domain Extraction] Using x-tenant-domain header (as hostname after parse error): ${tenantDomain}`
      );
    }
  } else {
    // Fallback: Extract from browser/app request host DNS (NOT from backend service URLs)
    // IMPORTANT: Prioritize x-forwarded-host and host header over nextUrl.hostname
    // because nextUrl.hostname may be localhost for internal fetches, but the headers
    // contain the original browser domain
    let rawHost = '';
    if (xForwardedHost) {
      rawHost = xForwardedHost;
      loggingCustom(
        LogType.CALL_BACKEND,
        'debug',
        `[proxyDataRequest] [Tenant Domain Extraction] Using x-forwarded-host: ${rawHost}`
      );
    } else if (hostHeader) {
      rawHost = hostHeader;
      loggingCustom(
        LogType.CALL_BACKEND,
        'debug',
        `[proxyDataRequest] [Tenant Domain Extraction] Using host header: ${rawHost}`
      );
    } else if (nextUrlHostname) {
      rawHost = nextUrlHostname;
      loggingCustom(
        LogType.CALL_BACKEND,
        'debug',
        `[proxyDataRequest] [Tenant Domain Extraction] Using nextUrl.hostname: ${rawHost}`
      );
    }
    
    const normalizedHost = rawHost.trim().toLowerCase().split(':')[0];
    
    loggingCustom(
      LogType.CALL_BACKEND,
      'debug',
      `[proxyDataRequest] [Tenant Domain Extraction] Extracted host="${rawHost}", normalized="${normalizedHost}"`
    );
    
    // Only use if we have a real domain (not localhost/internal)
    if (normalizedHost && normalizedHost !== 'localhost' && normalizedHost !== '127.0.0.1') {
      tenantDomain = normalizedHost;
      loggingCustom(
        LogType.CALL_BACKEND,
        'info',
        `[proxyDataRequest] [Tenant Domain Extraction] Using extracted tenant domain from DNS: ${tenantDomain}`
      );
    } else {
      loggingCustom(
        LogType.CALL_BACKEND,
        'warn',
        `[proxyDataRequest] [Tenant Domain Extraction] Skipping localhost/internal hostname: ${normalizedHost || '(empty)'}`
      );
    }
    // Note: If localhost, tenant domain is undefined - this is correct as localhost has no tenant context
  }

  // Get access token from SERVER MEMORY using refresh token from cookies
  // Access token is stored in server memory, keyed by refresh token
  // This is more secure than storing tokens in client-side memory
  let authHeader: string | null = null;
  let authToken: string | null = null;

  // Get refresh token from cookies
  const cookies = request.headers.get('cookie');
  const refreshToken = extractTokenFromCookies(cookies, AUTH_CONFIG.REFRESH_TOKEN_COOKIE);

  if (refreshToken) {
    // Look up access token from server memory using refresh token as key
    authToken = getAccessToken(refreshToken);
    
    if (authToken) {
      authHeader = `Bearer ${authToken}`;
      loggingCustom(
        LogType.CALL_BACKEND,
        'info',
        `[proxyDataRequest] Retrieved access token from server memory ${JSON.stringify({
          refreshTokenPreview: `${refreshToken.substring(0, 30)}...`,
          accessTokenLength: authToken.length,
          accessTokenPreview: `${authToken.substring(0, 30)}...`,
          authHeaderPreview: `${authHeader.substring(0, 20)}...`,
        })}`
      );
    } else {
      loggingCustom(
        LogType.CALL_BACKEND,
        'warn',
        `[proxyDataRequest] Access token not found in server memory for refresh token: ${refreshToken.substring(0, 30)}... (may need refresh)`
      );
    }
  } else {
    loggingCustom(
      LogType.CALL_BACKEND,
      'warn',
      `[proxyDataRequest] No refresh token found in cookies`
    );
  }

  // Fallback: Try to get token from incoming Authorization header (for backward compatibility)
  // This allows direct API calls with Authorization header to still work
  if (!authToken) {
    const incomingAuthHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (incomingAuthHeader) {
      authToken = extractTokenFromHeader(incomingAuthHeader);
      if (authToken) {
        authHeader = incomingAuthHeader.toLowerCase().startsWith('bearer ') 
          ? incomingAuthHeader 
          : `Bearer ${authToken}`;
        loggingCustom(
          LogType.CALL_BACKEND,
          'info',
          `[proxyDataRequest] Using access token from incoming Authorization header (fallback)`
        );
      }
    }
  }

  // Create new headers object - we only forward necessary headers to backend
  // Do NOT forward all headers from frontend request, only what's needed
  const headers = new Headers();
  
  // Set Authorization header if we have a token (REQUIRED for backend authentication)
  // Use 'Authorization' (capital A) as some backends are case-sensitive
  if (authHeader) {
    headers.set('Authorization', authHeader);
    loggingCustom(
      LogType.CALL_BACKEND,
      'info',
      `[proxyDataRequest] Authorization header set for backend request (length: ${authHeader.length}, format: ${authHeader.substring(0, 10)}...)`
    );
  } else {
    loggingCustom(
      LogType.CALL_BACKEND,
      'warn',
      `[proxyDataRequest] WARNING: No Authorization header available for backend data request to ${targetUrl}`
    );
  }

  // Set x-tenant-domain header if we extracted it (either from header or DNS)
  if (tenantDomain) {
    headers.set('x-tenant-domain', tenantDomain);
    loggingCustom(
      LogType.CALL_BACKEND,
      'info',
      `[proxyDataRequest] [Tenant Domain Extraction] Final result: x-tenant-domain="${tenantDomain}" will be forwarded to backend`
    );
  } else {
    loggingCustom(
      LogType.CALL_BACKEND,
      'warn',
      `[proxyDataRequest] [Tenant Domain Extraction] Final result: No tenant domain extracted; x-tenant-domain header will NOT be set. Backend may reject request or use fallback.`
    );
  }

  // Extract and forward x-fingerprint header
  // Priority: x-fingerprint header → x-fingerprint cookie
  let fingerprint: string | null = null;
  const fingerprintHeader = request.headers.get('x-fingerprint') || request.headers.get('X-Fingerprint');
  
  if (fingerprintHeader) {
    fingerprint = fingerprintHeader.trim();
    loggingCustom(
      LogType.CALL_BACKEND,
      'info',
      `[proxyDataRequest] Extracted x-fingerprint from header: ${fingerprint.substring(0, 8)}...`
    );
  } else {
    // Fallback: Try to extract from cookies
    const fingerprintFromCookie = extractTokenFromCookies(cookies, 'x-fingerprint');
    if (fingerprintFromCookie) {
      fingerprint = fingerprintFromCookie;
      loggingCustom(
        LogType.CALL_BACKEND,
        'info',
        `[proxyDataRequest] Extracted x-fingerprint from cookie: ${fingerprint.substring(0, 8)}...`
      );
    } else {
      loggingCustom(
        LogType.CALL_BACKEND,
        'warn',
        `[proxyDataRequest] No x-fingerprint found in headers or cookies`
      );
    }
  }

  // Set x-fingerprint header if we extracted it
  if (fingerprint) {
    headers.set('x-fingerprint', fingerprint);
    loggingCustom(
      LogType.CALL_BACKEND,
      'info',
      `[proxyDataRequest] x-fingerprint header set for backend request`
    );
  } else {
    loggingCustom(
      LogType.CALL_BACKEND,
      'warn',
      `[proxyDataRequest] WARNING: No x-fingerprint available for backend data request to ${targetUrl}`
    );
  }

  if (options.headers) {
    const overrideEntries = new Headers(options.headers);
    overrideEntries.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    headers.set('content-type', 'application/json');
  }

  // Ensure method is a string before calling toUpperCase
  // Handle cases where request.method might be undefined or not a string
  // Convert to string first to handle any edge cases
  let methodValue: string;
  if (options.method !== undefined && options.method !== null) {
    methodValue = String(options.method);
  } else if (request?.method) {
    methodValue = String(request.method);
  } else {
    methodValue = 'GET';
  }
  
  // Ensure it's a valid HTTP method string
  const method = (typeof methodValue === 'string' && methodValue.length > 0) 
    ? methodValue.toUpperCase() 
    : 'GET';

  loggingCustom(LogType.CALL_BACKEND, 'info', `→ ${method} ${targetUrl}`);

  // Final verification: Check that required headers are present
  const hasAuthorization = headers.has('Authorization') || headers.has('authorization');
  const hasTenantDomain = headers.has('x-tenant-domain') || headers.has('X-Tenant-Domain');
  const hasFingerprint = headers.has('x-fingerprint') || headers.has('X-Fingerprint');
  
  loggingCustom(
    LogType.CALL_BACKEND,
    hasAuthorization && hasTenantDomain && hasFingerprint ? 'info' : 'warn',
    `[proxyDataRequest] Header verification: Authorization=${hasAuthorization ? '✓' : '✗'}, x-tenant-domain=${hasTenantDomain ? '✓' : '✗'}, x-fingerprint=${hasFingerprint ? '✓' : '✗'}`
  );

  // Log all headers being sent to backend for debugging (including complete Authorization header)
  const headersToSend: Record<string, string> = {};
  headers.forEach((value, key) => {
    headersToSend[key] = value; // Show complete headers including full Authorization Bearer token
  });
  loggingCustom(
    LogType.CALL_BACKEND,
    'info',
    `[proxyDataRequest] Headers being sent to backend: ${JSON.stringify(headersToSend)}`
  );

  if (body) {
    loggingCustom(
      LogType.CALL_BACKEND,
      'debug',
      `Request body: ${truncateForLog(stringifyForLog(options.body))}`
    );
  }

  // Convert Headers object to plain object for fetch() to ensure proper serialization
  // Some fetch implementations may not properly serialize Headers objects
  const headersObject: Record<string, string> = {};
  headers.forEach((value, key) => {
    headersObject[key] = value;
  });

  try {
    const response = await fetch(targetUrl, {
      method,
      headers: headersObject,
      body,
    });

    const contentType = response.headers.get('content-type');

    if (response.status === 204 || response.status === 205) {
      loggingCustom(
        LogType.CALL_BACKEND,
        'info',
        `← ${response.status} ${response.statusText || ''} (no content)`
      );
      return new NextResponse(null, { status: response.status });
    }

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      loggingCustom(
        LogType.CALL_BACKEND,
        'info',
        `← ${response.status} ${response.statusText || ''} (JSON)`
      );
      loggingCustom(
        LogType.CALL_BACKEND,
        'debug',
        `Response body: ${truncateForLog(stringifyForLog(data))}`
      );
      const normalized = normalizeUpstreamDataResponse(data, {
        method,
        status: response.status,
        targetPathWithQuery,
      });
      return NextResponse.json(normalized, { status: response.status });
    }

    const text = await response.text();
    const success = response.status < 400;
    loggingCustom(
      LogType.CALL_BACKEND,
      success ? 'info' : 'warn',
      `← ${response.status} ${response.statusText || ''} (text)`
    );
    if (text) {
      loggingCustom(
        LogType.CALL_BACKEND,
        'debug',
        `Response text: ${truncateForLog(text)}`
      );
    }
    const payload: Record<string, unknown> = {
      success,
    };

    if (success) {
      payload.data = text;
    } else {
      payload.error = text || 'Data service returned an unexpected response.';
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    loggingCustom(LogType.INFRA_LOG, 'error', `Failed to proxy data request: ${error instanceof Error ? error.message : String(error)}`);
    loggingCustom(
      LogType.CALL_BACKEND,
      'error',
      `Data proxy failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reach data service',
      },
      { status: 502 }
    );
  }
};

