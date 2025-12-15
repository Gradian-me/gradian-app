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
import { useTenantStore } from '@/stores/tenant.store';
import { authTokenManager } from './auth-token-manager';

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

/**
 * Extracts the tenant domain from the tenant store or falls back to current URL hostname
 * Returns the domain (e.g., "cms.cinnagen.com" from tenant store or window.location.hostname)
 */
const getTenantDomain = (): string | undefined => {
  if (!isBrowserEnvironment()) {
    return undefined;
  }
  
  try {
    // Try to get domain from tenant store first
    const tenantStore = useTenantStore.getState();
    const selectedTenant = tenantStore.selectedTenant;
    
    // If tenant is selected and has a domain, use it
    if (selectedTenant && selectedTenant.domain && selectedTenant.domain.trim().length > 0) {
      return selectedTenant.domain.trim();
    }
    
    // Fall back to window.location.hostname if no tenant is selected or tenant has no domain
    const hostname = window.location.hostname;
    return hostname || undefined;
  } catch {
    // Fallback to window.location.hostname on error
    try {
      return window.location.hostname || undefined;
    } catch {
      return undefined;
    }
  }
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

const appendTenantDomainHeader = (headers?: HeadersInit): HeadersInit => {
  const tenantDomain = getTenantDomain();
  if (!tenantDomain) {
    return headers ?? {};
  }

  const headerObject = headersToObject(headers);
  headerObject['X-Tenant-Domain'] = tenantDomain;
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
 * @param serverName - Optional server/integration name to include in the error message
 * @param suppress - If true, don't show the toast (useful when caller will show a more specific toast)
 */
const showConnectionErrorToast = (serverName?: string, suppress: boolean = false): void => {
  if (suppress || !isBrowserEnvironment()) {
    return;
  }
  
  const description = serverName 
    ? `Unable to connect to the server "${serverName}". Please check your connection and try again.`
    : 'Unable to connect to the server. Please check your connection and try again.';
  
  toast.error('Connection is out', {
    description,
    duration: 5000,
  });
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
    options: RequestInit = {},
    retryOn401: boolean = true
  ): Promise<ApiResponse<T>> {
    // Resolve the endpoint URL based on demo mode configuration
    const resolvedEndpoint = resolveApiUrl(endpoint);
    const url = `${this.baseURL}${resolvedEndpoint}`;
    
    // Skip auth for refresh endpoint and login to prevent loops
    const isAuthEndpoint = endpoint.includes('/api/auth/token/refresh') || 
                          endpoint.includes('/api/auth/login') ||
                          endpoint.includes('/api/auth/logout');
    
    // Don't try to get token if we're on login/auth pages (prevents redirect loops)
    const isOnAuthPage = isBrowserEnvironment() && 
      (typeof window !== 'undefined' && window.location.pathname.startsWith('/authentication/'));
    
    // Get access token from memory (only in browser, not on auth pages or auth endpoints)
    const accessToken = isBrowserEnvironment() && !isAuthEndpoint && !isOnAuthPage
      ? await authTokenManager.getValidAccessToken()
      : null;
    
    loggingCustom(LogType.CLIENT_LOG, 'log', `[API_CLIENT] request() - token retrieval ${JSON.stringify({
      endpoint,
      isAuthEndpoint,
      isOnAuthPage,
      hasAccessToken: accessToken !== null,
      tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : null,
      tokenStorage: 'MEMORY_ONLY (not in cookies)',
    })}`);
    
    const requestConfig: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Required to send HttpOnly cookies (refresh token)
      ...options,
    };

    // Add Authorization header if we have an access token
    if (accessToken) {
      (requestConfig.headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
      loggingCustom(LogType.CLIENT_LOG, 'log', `[API_CLIENT] request() - Authorization header added ${JSON.stringify({
        headerLength: `Bearer ${accessToken}`.length,
      })}`);
    } else {
      loggingCustom(LogType.CLIENT_LOG, 'log', '[API_CLIENT] request() - no Authorization header (no access token)');
    }

    requestConfig.headers = appendFingerprintHeader(requestConfig.headers);
    requestConfig.headers = appendTenantDomainHeader(requestConfig.headers);

    try {
      const response = await fetch(url, requestConfig);

      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401 && retryOn401 && !isAuthEndpoint && isBrowserEnvironment()) {
        loggingCustom(LogType.CLIENT_LOG, 'log', `[API_CLIENT] request() - 401 received, attempting token refresh and retry ${JSON.stringify({
          endpoint,
          hadAccessToken: accessToken !== null,
        })}`);
        
        // Attempt to refresh token
        const newToken = await authTokenManager.handleUnauthorized();
        
        if (newToken) {
          loggingCustom(LogType.CLIENT_LOG, 'log', `[API_CLIENT] request() - token refreshed, retrying request ${JSON.stringify({
            endpoint,
            newTokenLength: newToken.length,
          })}`);
          
          // Retry original request with new token
          const retryConfig: RequestInit = {
            ...requestConfig,
            headers: {
              ...requestConfig.headers,
              'Authorization': `Bearer ${newToken}`,
            },
          };
          
          const retryResponse = await fetch(url, retryConfig);
          loggingCustom(LogType.CLIENT_LOG, 'log', `[API_CLIENT] request() - retry response ${JSON.stringify({
            endpoint,
            status: retryResponse.status,
            ok: retryResponse.ok,
          })}`);
          
          // Parse retry response
          const contentType = retryResponse.headers.get('content-type') || '';
          let parsed: any = null;
          try {
            if (contentType.includes('application/json')) {
              parsed = await retryResponse.json();
            } else {
              const text = await retryResponse.text();
              parsed = text ? { message: text } : {};
            }
          } catch (parseErr) {
            parsed = { message: 'Unable to parse response body' };
          }

          const responseWithStatus: ApiResponse<T> = {
            ...(parsed || {}),
            statusCode: retryResponse.status,
          };

          if (!retryResponse.ok) {
            const errorMessage = parsed?.error || parsed?.message || '';
            const suppressToast = endpoint.includes('/api/integrations/sync');
            if (isConnectionError(null, retryResponse.status) || isConnectionError({ message: errorMessage })) {
              showConnectionErrorToast(undefined, suppressToast);
            }
            
            return {
              success: false,
              error: errorMessage || `HTTP error! status: ${retryResponse.status}`,
              statusCode: retryResponse.status,
              data: null as any,
              messages: parsed?.messages,
              message: typeof parsed?.message === 'string' ? parsed.message : undefined,
            };
          }

          return responseWithStatus;
        } else {
          loggingCustom(LogType.CLIENT_LOG, 'warn', `[API_CLIENT] request() - token refresh failed, user will be redirected to login ${JSON.stringify({
            endpoint,
          })}`);
          // Refresh failed - user will be redirected to login by authTokenManager
          return {
            success: false,
            error: 'Authentication required',
            statusCode: 401,
            data: null as any,
          };
        }
      }

      // Safely parse response; don't assume JSON
      const contentType = response.headers.get('content-type') || '';
      let parsed: any = null;
      try {
        if (contentType.includes('application/json')) {
          parsed = await response.json();
        } else {
          const text = await response.text();
          parsed = text ? { message: text } : {};
        }
      } catch (parseErr) {
        parsed = { message: 'Unable to parse response body' };
      }

      const responseWithStatus: ApiResponse<T> = {
        ...(parsed || {}),
        statusCode: response.status,
      };

      if (!response.ok) {
        const errorMessage = parsed?.error || parsed?.message || '';
        const suppressToast = endpoint.includes('/api/integrations/sync');
        if (isConnectionError(null, response.status) || isConnectionError({ message: errorMessage })) {
          showConnectionErrorToast(undefined, suppressToast);
        }
        
        return {
          success: false,
          error: errorMessage || `HTTP error! status: ${response.status}`,
          statusCode: response.status,
          data: null as any,
          messages: parsed?.messages,
          message: typeof parsed?.message === 'string' ? parsed.message : undefined,
        };
      }

      return responseWithStatus;
    } catch (error) {
      // Check if it's a connection/timeout error
      // Suppress generic toast for integration sync - it will show a specific toast with domain
      const suppressToast = endpoint.includes('/api/integrations/sync');
      if (isConnectionError(error)) {
        showConnectionErrorToast(undefined, suppressToast);
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
    loggingCustom(LogType.CLIENT_LOG, 'info', `[apiRequest] ${method} ${endpoint} invoked by ${callerName}`);
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
    // Suppress generic toast for integration sync - it will show a specific toast with domain
    const suppressToast = endpoint.includes('/api/integrations/sync');
    if (!response.success) {
      const errorMessage = response.error || '';
      if (isConnectionError(null, response.statusCode) || isConnectionError({ message: errorMessage })) {
        showConnectionErrorToast(undefined, suppressToast);
      }
    }

    return response;
  } catch (error) {
    // Check if it's a connection/timeout error
    // Suppress generic toast for integration sync - it will show a specific toast with domain
    const suppressToast = endpoint.includes('/api/integrations/sync');
    if (isConnectionError(error)) {
      showConnectionErrorToast(undefined, suppressToast);
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
