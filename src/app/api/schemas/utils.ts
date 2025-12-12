import { NextRequest, NextResponse } from 'next/server';

import { LogType, DEMO_MODE } from '@/gradian-ui/shared/constants/application-variables';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { loadApplicationVariables } from '@/gradian-ui/shared/utils/application-variables-loader';
import { extractTokenFromHeader, extractTokenFromCookies } from '@/domains/auth';
import { AUTH_CONFIG } from '@/gradian-ui/shared/constants/application-variables';

const TRUTHY_VALUES = new Set(['true', '1', 'yes', 'on']);
const SCHEMA_ROUTE_PREFIX = '/api/schemas';
const SCHEMA_LIST_ARRAY_PATHS: Array<Array<string>> = [
  ['data'],
  ['data', 'data'],
  ['data', 'items'],
  ['data', 'result'],
  ['data', 'results'],
  ['data', 'schemas'],
  ['schemas'],
  ['items'],
  ['results'],
  ['result'],
  ['records'],
  ['rows'],
];
const SCHEMA_OBJECT_PATHS: Array<Array<string>> = [
  ['data'],
  ['schema'],
  ['result'],
  ['item'],
  ['payload'],
];

type ProxyOptions = {
  body?: unknown;
  method?: string;
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
      const vars = loadApplicationVariables();
      return vars.DEMO_MODE;
    } catch {
      // Fallback to static value if loader fails
      return DEMO_MODE;
    }
  }
  // On client, use static value (client can fetch from API if needed)
  return DEMO_MODE;
};

const getPathWithoutQuery = (targetPath: string): string => {
  const queryIndex = targetPath.indexOf('?');
  if (queryIndex === -1) {
    return targetPath;
  }
  return targetPath.slice(0, queryIndex);
};

const isSchemaListRoute = (pathWithoutQuery: string): boolean => {
  return pathWithoutQuery === SCHEMA_ROUTE_PREFIX;
};

const isSchemaDetailRoute = (pathWithoutQuery: string): boolean => {
  return (
    pathWithoutQuery.startsWith(`${SCHEMA_ROUTE_PREFIX}/`) &&
    !pathWithoutQuery.endsWith('/clear-cache')
  );
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

  for (const path of SCHEMA_LIST_ARRAY_PATHS) {
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

  for (const path of SCHEMA_OBJECT_PATHS) {
    const candidate = getNestedValue(objectPayload, path);
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return candidate as Record<string, unknown>;
    }
  }

  return objectPayload;
};

const normalizeSchemaListResponse = (payload: unknown, context: NormalizeContext) => {
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
        : 'Unexpected response format from upstream schema service.';
    normalized.error = errorMessage;
    console.warn('[schema-proxy] Unable to locate schema list array in upstream response.');
  }

  return normalized;
};

const normalizeSchemaDetailResponse = (payload: unknown, context: NormalizeContext) => {
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

const normalizeSchemaMutationResponse = (payload: unknown, context: NormalizeContext) => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const payloadRecord = payload as Record<string, unknown>;
    if ('success' in payloadRecord) {
      if (!('error' in payloadRecord) && context.status >= 400) {
        const inferredError =
          typeof payloadRecord.message === 'string'
            ? payloadRecord.message
            : 'Schema service reported an error.';
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
            'Schema service rejected the request with an unknown error.',
        }
      : {}),
  };
};

const normalizeUpstreamSchemaResponse = (payload: unknown, context: NormalizeContext) => {
  const pathWithoutQuery = getPathWithoutQuery(context.targetPathWithQuery);
  if (!pathWithoutQuery.startsWith(SCHEMA_ROUTE_PREFIX)) {
    return payload;
  }

  switch (context.method) {
    case 'GET': {
      if (isSchemaListRoute(pathWithoutQuery)) {
        return normalizeSchemaListResponse(payload, context);
      }
      if (isSchemaDetailRoute(pathWithoutQuery)) {
        return normalizeSchemaDetailResponse(payload, context);
      }
      break;
    }
    case 'POST':
    case 'PUT':
    case 'PATCH':
    case 'DELETE':
      return normalizeSchemaMutationResponse(payload, context);
    default:
      break;
  }

  return payload;
};

/**
 * Checks if a string looks like JSON and attempts to parse it
 */
const tryParseJsonString = (str: string): { isJson: boolean; parsed?: any } => {
  if (typeof str !== 'string' || str.trim().length === 0) {
    return { isJson: false };
  }

  const trimmed = str.trim();
  const firstChar = trimmed[0];
  const lastChar = trimmed[trimmed.length - 1];
  
  // Check if it looks like JSON (starts and ends with {} or [])
  if ((firstChar === '{' && lastChar === '}') || (firstChar === '[' && lastChar === ']')) {
    try {
      const parsed = JSON.parse(str);
      return { isJson: true, parsed };
    } catch (error) {
      // Not valid JSON, return as-is
      return { isJson: false };
    }
  }
  
  return { isJson: false };
};

/**
 * Normalizes schema data by parsing JSON strings in nested fields to objects/arrays
 * Specifically handles repeatingConfig fields that may be sent as JSON strings
 */
export const normalizeSchemaData = (data: any): any => {
  if (data === null || data === undefined) {
    return data;
  }

  // If it's a string, check if it's a JSON string and try to parse it
  if (typeof data === 'string') {
    const { isJson, parsed } = tryParseJsonString(data);
    if (isJson && parsed !== undefined) {
      // Recursively normalize the parsed object
      const result = normalizeSchemaData(parsed);
      // Log when we successfully parse a JSON string
      if (process.env.NODE_ENV === 'development') {
        console.log('[normalizeSchemaData] Parsed JSON string to object:', {
          original: data.substring(0, 100),
          parsed: result
        });
      }
      return result;
    }
    return data;
  }

  // If it's an array, normalize each item
  if (Array.isArray(data)) {
    return data.map(item => normalizeSchemaData(item));
  }

  // If it's not an object, return as-is
  if (typeof data !== 'object') {
    return data;
  }

  // Create a copy to avoid mutating the original
  const normalized: any = {};

  // Process all keys in the object
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      
      // Special handling for repeatingConfig field - ensure it's always an object/array, never a string
      if (key === 'repeatingConfig' && typeof value === 'string') {
        const { isJson, parsed } = tryParseJsonString(value);
        if (isJson && parsed !== undefined) {
          normalized[key] = normalizeSchemaData(parsed);
          if (process.env.NODE_ENV === 'development') {
            console.log('[normalizeSchemaData] Normalized repeatingConfig from string to object');
          }
        } else {
          // If it's not valid JSON, keep it as string (shouldn't happen, but handle gracefully)
          normalized[key] = value;
        }
      } else {
        // Recursively normalize the value
        normalized[key] = normalizeSchemaData(value);
      }
    }
  }

  return normalized;
};

export const proxySchemaRequest = async (
  request: NextRequest,
  targetPathWithQuery: string,
  options: ProxyOptions = {}
) => {
  const baseUrl = process.env.URL_SCHEMA_CRUD?.replace(/\/+$/, '');

  if (!baseUrl) {
    console.error('URL_SCHEMA_CRUD environment variable is not defined.');
    loggingCustom(
      LogType.CALL_BACKEND,
      'error',
      'Schema proxy aborted: URL_SCHEMA_CRUD environment variable is not defined.'
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Schema service URL is not configured on the server.',
      },
      { status: 500 }
    );
  }

  const targetUrl = `${baseUrl}${targetPathWithQuery}`;

  const headers = new Headers(request.headers);
  // Remove hop-by-hop headers that shouldn't be forwarded
  // These headers are connection-specific and cause issues in Docker/proxy environments
  headers.delete('host');
  headers.delete('connection');
  headers.delete('upgrade');
  headers.delete('keep-alive');
  headers.delete('transfer-encoding');
  headers.delete('te');
  headers.delete('trailer');

  // Ensure tenant context is forwarded even for server-side rendered requests
  // Prefer existing header; otherwise derive from the incoming host.
  const existingTenantHeader =
    headers.get('x-tenant-domain') || headers.get('X-Tenant-Domain');
  if (!existingTenantHeader) {
    const host = request.nextUrl?.hostname?.trim().toLowerCase();
    if (host) {
      headers.set('x-tenant-domain', host);
    }
  }

  // Extract authorization token and ensure it's in Bearer format
  // Backend APIs require Authorization: Bearer <token> header
  let authHeader = headers.get('authorization');
  let authToken: string | null = null;

  // Try to extract token from Authorization header if present
  if (authHeader) {
    authToken = extractTokenFromHeader(authHeader);
  }

  // If no token from header, try to extract from cookies
  if (!authToken) {
    const cookies = request.headers.get('cookie');
    authToken = extractTokenFromCookies(cookies, AUTH_CONFIG.ACCESS_TOKEN_COOKIE);
    if (authToken) {
      // Format as Bearer token
      authHeader = `Bearer ${authToken}`;
      loggingCustom(LogType.CALL_BACKEND, 'info', 'Authorization token added from cookie');
    } else {
      loggingCustom(
        LogType.CALL_BACKEND,
        'warn',
        `No authorization token found in header or cookies for schema request`
      );
    }
  } else {
    // Ensure header is in Bearer format if it's just a token
    if (authHeader && !authHeader.toLowerCase().startsWith('bearer ')) {
      authHeader = `Bearer ${authToken}`;
      loggingCustom(LogType.CALL_BACKEND, 'info', 'Authorization header normalized to Bearer token');
    }
  }

  // Set Authorization header if we have a token
  if (authHeader) {
    headers.set('authorization', authHeader);
  } else {
    loggingCustom(
      LogType.CALL_BACKEND,
      'error',
      `WARNING: No Authorization header available for backend schema request`
    );
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
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

  loggingCustom(
    LogType.CALL_BACKEND,
    'info',
    `→ ${method} ${targetUrl}`
  );

  if (body) {
    loggingCustom(
      LogType.CALL_BACKEND,
      'debug',
      `Request body: ${truncateForLog(stringifyForLog(options.body))}`
    );
  }

  try {
    const response = await fetch(targetUrl, {
      method,
      headers,
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
      const normalized = normalizeUpstreamSchemaResponse(data, {
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
      payload.error = text || 'Schema service returned an unexpected response.';
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error('Failed to proxy schema request:', error);
    loggingCustom(
      LogType.CALL_BACKEND,
      'error',
      `Schema proxy failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reach schema service',
      },
      { status: 502 }
    );
  }
};

