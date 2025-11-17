import { NextRequest, NextResponse } from 'next/server';

import { LogType } from '@/gradian-ui/shared/constants/application-variables';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';

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
  const rawValue = process.env.DEMO_MODE;
  if (rawValue === undefined || rawValue === null) {
    return true;
  }

  return TRUTHY_VALUES.has(rawValue.toLowerCase());
};

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
    console.warn('[data-proxy] Unable to locate data list array in upstream response.');
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
    console.error('URL_DATA_CRUD environment variable is not defined.');
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

  const headers = new Headers(request.headers);
  headers.delete('host');

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
    console.error('Failed to proxy data request:', error);
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

