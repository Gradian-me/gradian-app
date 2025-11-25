import { ApiResponse, PaginationParams } from '../types/common';
import { handleError } from '../errors';
import { config } from '@/lib/config';
import { getCacheConfigByPath } from '@/gradian-ui/shared/configs/cache-config';
import {
  getIndexedDbCacheStrategy,
  type CacheStrategyPreResult,
  type CacheStrategyContext,
} from '@/gradian-ui/indexdb-manager/cache-strategies';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';
import { toast } from 'sonner';
import { getFingerprintCookie } from '@/domains/auth/utils/fingerprint-cookie.util';

// Helper function to resolve API endpoint URL
// IMPORTANT: Always use relative URLs so requests go through Next.js API routes
// The Next.js API routes will handle proxying to external backend when demo mode is false
function resolveApiUrl(endpoint: string): string {
  // If endpoint is already a full URL, return as is
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  // Always use relative URLs for /api/data and /api/schemas
  // This ensures requests go through Next.js API routes which handle proxying
  // when demo mode is false. The API routes check isDemoModeEnabled() and
  // proxy to the backend using proxyDataRequest() when needed.
  // For other endpoints, use as-is (relative URLs)
  return endpoint;
}

const isDevEnvironment = (): boolean => process.env.NODE_ENV === 'development';

const extractCallerFromStack = (): string | undefined => {
  const stack = new Error().stack;
  if (!stack) return undefined;

  const frames = stack
    .split('\n')
    .map((line) => line.trim())
    // Skip the first frames which belong to Error creation and api helpers themselves
    .slice(3);

  const callerFrame = frames.find(
    (frame) =>
      frame &&
      !frame.includes('ApiClient') &&
      !frame.includes('apiRequest') &&
      !frame.includes('api.ts')
  );

  if (!callerFrame) return undefined;

  // Frame format examples:
  // at someFunction (path:line:column)
  // at path:line:column
  const cleaned = callerFrame.replace(/^at\s+/, '');
  const parts = cleaned.split(' ');

  if (parts.length > 1) {
    return parts[0];
  }

  return cleaned;
};

const isBrowserEnvironment = (): boolean => typeof window !== 'undefined';

const headersToObject = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return headers.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }

  return { ...(headers as Record<string, string>) };
};

const appendFingerprintHeader = (headers?: HeadersInit): HeadersInit => {
  const fingerprint = getFingerprintCookie();
  if (!fingerprint) {
    return headers ?? {};
  }

  const headerObject = headersToObject(headers);
  headerObject['x-fingerprint'] = fingerprint;
  return headerObject;
};

/**
 * Checks if an error is a connection/timeout error
 */
const isConnectionError = (error: any, statusCode?: number): boolean => {
  // Check for 502 Bad Gateway status (proxy errors)
  if (statusCode === 502) {
    return true;
  }

  // Check for fetch failed errors
  if (error?.message?.toLowerCase().includes('fetch failed')) {
    return true;
  }

  // Check for timeout errors
  if (error?.code === 'UND_ERR_CONNECT_TIMEOUT' || 
      error?.name === 'ConnectTimeoutError' ||
      error?.message?.toLowerCase().includes('timeout') ||
      error?.message?.toLowerCase().includes('connect timeout')) {
    return true;
  }

  // Check for network errors
  if (error?.name === 'TypeError' && error?.message?.toLowerCase().includes('failed to fetch')) {
    return true;
  }

  // Check for connection refused or connection errors
  if (error?.message?.toLowerCase().includes('connection') && 
      (error?.message?.toLowerCase().includes('refused') || 
       error?.message?.toLowerCase().includes('out') ||
       error?.message?.toLowerCase().includes('failed'))) {
    return true;
  }

  return false;
};

/**
 * Shows a connection error toast notification (only on client side)
 */
const showConnectionErrorToast = (): void => {
  if (isBrowserEnvironment()) {
    toast.error('Connection is out', {
      description: 'Unable to connect to the server. Please check your connection and try again.',
      duration: 5000,
    });
  }
};

function normalizeEndpointWithParams(endpoint: string, params?: Record<string, any>): string {
  const [basePath, queryString = ''] = endpoint.split('?');
  const searchParams = new URLSearchParams(queryString);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      searchParams.delete(key);
      if (Array.isArray(value)) {
        value.forEach((item) => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    });
  }

  const mergedQuery = searchParams.toString();
  return mergedQuery ? `${basePath}?${mergedQuery}` : basePath;
}

function getCacheStrategyContext(
  endpoint: string,
  originalEndpoint: string,
  options?: {
    params?: Record<string, any>;
  }
): CacheStrategyContext {
  return {
    endpoint,
    originalEndpoint,
    params: options?.params,
  };
}

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Resolve the endpoint URL based on demo mode configuration
    const resolvedEndpoint = resolveApiUrl(endpoint);
    const url = `${this.baseURL}${resolvedEndpoint}`;
    
    const requestConfig: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    requestConfig.headers = appendFingerprintHeader(requestConfig.headers);

    try {
      const response = await fetch(url, requestConfig);
      const data = await response.json();

      // Add status code to response
      const responseWithStatus: ApiResponse<T> = {
        ...data,
        statusCode: response.status,
      };

      if (!response.ok) {
        const errorMessage = data.error || data.message || '';
        // Check if it's a connection error (502 Bad Gateway or error message indicates connection issue)
        if (isConnectionError(null, response.status) || isConnectionError({ message: errorMessage })) {
          showConnectionErrorToast();
        }
        
        // Return error response with status code, preserving messages if present
        return {
          success: false,
          error: errorMessage || `HTTP error! status: ${response.status}`,
          statusCode: response.status,
          data: null as any,
          messages: data.messages,
          message: data.message && typeof data.message === 'string' ? data.message : undefined,
        };
      }

      return responseWithStatus;
    } catch (error) {
      // Check if it's a connection/timeout error
      if (isConnectionError(error)) {
        showConnectionErrorToast();
      }
      
      // If it's a network error, we don't have a status code
      const errorResponse = handleError(error);
      return {
        success: false,
        error: errorResponse.message || 'An unexpected error occurred',
        statusCode: undefined,
        data: null as any,
      };
    }
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    requestOptions?: RequestInit
  ): Promise<ApiResponse<T>> {
    const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
    const result = await this.request<T>(url, {
      ...requestOptions,
      method: 'GET',
    });
    return result;
  }

  async post<T>(
    endpoint: string,
    data?: any,
    requestOptions?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...requestOptions,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(
    endpoint: string,
    data?: any,
    requestOptions?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...requestOptions,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(
    endpoint: string,
    data?: any,
    requestOptions?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...requestOptions,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, requestOptions?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...requestOptions,
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();

/**
 * Generic API request function for easy usage
 * @param endpoint - The API endpoint
 * @param options - Request options (method, body, headers, etc.)
 * @returns Promise with ApiResponse
 */
export async function apiRequest<T>(
  endpoint: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
    params?: Record<string, any>;
    callerName?: string;
    disableCache?: boolean;
  }
): Promise<ApiResponse<T>> {
  const method = options?.method || 'GET';
  const isDev = isDevEnvironment();
  const callerName = isDev ? options?.callerName || extractCallerFromStack() || 'unknown' : undefined;
  const baseHeaders = options?.headers ? { ...options.headers } : undefined;
  const headersWithCaller =
    isDev && callerName
      ? { ...(baseHeaders || {}), 'x-function-name': callerName }
      : baseHeaders;  

  if (isDev && callerName) {
    console.info(`[apiRequest] ${method} ${endpoint} invoked by ${callerName}`);
  }
  
  const normalizedEndpoint = method === 'GET' ? normalizeEndpointWithParams(endpoint, options?.params) : endpoint;

  let cacheStrategyContext: CacheStrategyContext | null = null;
  let cacheStrategyPreResult: CacheStrategyPreResult<any> | null = null;
  const shouldUseCache =
    method === 'GET' &&
    !options?.disableCache &&
    isBrowserEnvironment();

  const cacheStrategy =
    shouldUseCache
      ? getIndexedDbCacheStrategy(getCacheConfigByPath(normalizedEndpoint).indexedDbKey)
      : null;

  if (cacheStrategy) {
    cacheStrategyContext = getCacheStrategyContext(normalizedEndpoint, endpoint, {
      params: options?.params,
    });
    cacheStrategyPreResult = await cacheStrategy.preRequest(cacheStrategyContext);

    if (cacheStrategyPreResult?.hit && cacheStrategyPreResult.data !== undefined) {
      loggingCustom(
        LogType.INDEXDB_CACHE,
        'info',
        `IndexedDB cache hit for "${normalizedEndpoint}". Served from cache without calling API.`
      );
      return {
        success: true,
        data: cacheStrategyPreResult.data as T,
        statusCode: 200,
      };
    }
  }

  const requestHeaders = headersWithCaller ? { headers: headersWithCaller } : undefined;

  try {
    let response: ApiResponse<T>;

    switch (method) {
      case 'GET': {
        const endpointForRequest = cacheStrategyPreResult?.overrideEndpoint ?? endpoint;
        const paramsForRequest =
          cacheStrategyPreResult?.overrideEndpoint !== undefined
            ? cacheStrategyPreResult.overrideParams
            : options?.params;
        response = await apiClient.get<T>(endpointForRequest, paramsForRequest, requestHeaders);
        break;
      }
      case 'POST':
        response = await apiClient.post<T>(endpoint, options?.body, requestHeaders);
        break;
      case 'PUT':
        response = await apiClient.put<T>(endpoint, options?.body, requestHeaders);
        break;
      case 'PATCH':
        response = await apiClient.patch<T>(endpoint, options?.body, requestHeaders);
        break;
      case 'DELETE':
        response = await apiClient.delete<T>(endpoint, requestHeaders);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    if (method === 'GET' && cacheStrategy && cacheStrategyContext) {
      return await cacheStrategy.postRequest(cacheStrategyContext, response, cacheStrategyPreResult);
    }

    // Check for connection errors in the response
    if (!response.success) {
      const errorMessage = response.error || '';
      if (isConnectionError(null, response.statusCode) || isConnectionError({ message: errorMessage })) {
        showConnectionErrorToast();
      }
    }

    return response;
  } catch (error) {
    // Check if it's a connection/timeout error
    if (isConnectionError(error)) {
      showConnectionErrorToast();
    }
    
    return {
      success: false,
      error: formatApiError(error),
      data: null as any,
      statusCode: undefined,
    };
  }
}

export const buildQueryString = (params: PaginationParams): string => {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  return searchParams.toString();
};

export const formatApiError = (error: any): string => {
  if (error.message) return error.message;
  if (error.error) return error.error;
  return 'An unexpected error occurred';
};
