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
import { LogType, LOG_CONFIG } from '@/gradian-ui/shared/configs/log-config';
import { toast } from 'sonner';
import { getFingerprintCookie } from '@/domains/auth/utils/fingerprint-cookie.util';
import { useTenantStore } from '@/stores/tenant.store';
import { authTokenManager, RateLimitError } from './auth-token-manager';

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
 * Extracts the tenant domain from the tenant store or falls back to Host header (hostname)
 * In production: Always uses window.location.hostname (Host header)
 * In development: Uses tenant store domain if tenant is selected, otherwise falls back to hostname
 */
const getTenantDomain = (): string | undefined => {
  if (!isBrowserEnvironment()) {
    return undefined;
  }
  
  try {
    const isDev = isDevEnvironment();
    const hostname = window.location.hostname;
    
    // In production, always use the hostname (Host header)
    if (!isDev) {
      return hostname || undefined;
    }
    
    // In development, try to get domain from tenant store first
    const tenantStore = useTenantStore.getState();
    const selectedTenant = tenantStore.selectedTenant;
    
    // If tenant is selected (not null and not -1) and has a domain, use it
    if (selectedTenant && selectedTenant.id !== -1 && selectedTenant.domain && selectedTenant.domain.trim().length > 0) {
      return selectedTenant.domain.trim();
    }
    
    // Fall back to window.location.hostname (from Host header) if no tenant is selected
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
 * Extracts server name/URL from endpoint or error
 * - For full URLs: uses the hostname
 * - For relative /api/schemas and /api/data: uses URL_SCHEMA_CRUD / URL_DATA_CRUD
 */
const extractServerName = (endpoint?: string, error?: any): string | undefined => {
  // Try to extract from endpoint if it's a full URL
  if (endpoint && (endpoint.startsWith('http://') || endpoint.startsWith('https://'))) {
    try {
      const url = new URL(endpoint);
      return url.hostname || url.host;
    } catch {
      // ignore and fall through
    }
  }

  // For relative endpoints, map to backend URLs from env (prefer NEXT_PUBLIC_* so it's available in client bundle)
  const schemaUrl = process.env.NEXT_PUBLIC_URL_SCHEMA_CRUD || process.env.URL_SCHEMA_CRUD;
  const dataUrl = process.env.NEXT_PUBLIC_URL_DATA_CRUD || process.env.URL_DATA_CRUD;

  if (endpoint && endpoint.includes('/api/schemas') && schemaUrl) {
    try {
      const url = new URL(schemaUrl);
      return url.hostname || url.host;
    } catch {
      // ignore
    }
  }

  if (endpoint && endpoint.includes('/api/data') && dataUrl) {
    try {
      const url = new URL(dataUrl);
      return url.hostname || url.host;
    } catch {
      // ignore
    }
  }
  
  // Try to extract from error message if it contains a URL
  if (error?.message) {
    const urlMatch = error.message.match(/https?:\/\/([^\s\/]+)/i);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
  }
  
  // Try to extract from error cause if available
  if (error?.cause) {
    if (typeof error.cause === 'string') {
      const urlMatch = error.cause.match(/https?:\/\/([^\s\/]+)/i);
      if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
      }
    }
  }
  
  return undefined;
};

/**
 * Shows a connection error toast notification (only on client side)
 * @param endpoint - Optional endpoint URL to extract server name from
 * @param error - Optional error object to extract server name from
 * @param suppress - If true, don't show the toast (useful when caller will show a more specific toast)
 */
const showConnectionErrorToast = (endpoint?: string, error?: any, suppress: boolean = false): void => {
  if (suppress || !isBrowserEnvironment()) {
    return;
  }
  
  // Only extract and show endpoint/server name if ENDPOINT_LOG is enabled
  const shouldShowEndpoint = LOG_CONFIG[LogType.ENDPOINT_LOG];
  const serverName = shouldShowEndpoint ? extractServerName(endpoint, error) : undefined;
  const endpointPath = shouldShowEndpoint && endpoint && !serverName ? endpoint : undefined;
  const description = serverName 
    ? `Unable to connect to the server "${serverName}". Please check your connection and try again.`
    : endpointPath
      ? `Unable to connect to the endpoint "${endpointPath}". Please check your connection and try again.`
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
        try {
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
        } catch (error) {
          // Handle rate limit errors specifically
          if (error instanceof RateLimitError) {
            loggingCustom(LogType.CLIENT_LOG, 'warn', `[API_CLIENT] request() - rate limit error during token refresh ${JSON.stringify({
              endpoint,
              error: error.message,
            })}`);
            return {
              success: false,
              error: error.message,
              statusCode: 429,
              data: null as any,
            };
          }
          // Re-throw other errors
          throw error;
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
          showConnectionErrorToast(endpoint, { message: errorMessage }, suppressToast);
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
        showConnectionErrorToast(endpoint, error, suppressToast);
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
 * Get tenantIds and companyIds from stores for automatic inclusion in API requests
 * Only works in browser environment
 * Uses dynamic import to avoid circular dependencies and ensure stores are available
 */
async function getContextParams(): Promise<{ tenantIds?: string; companyIds?: string }> {
  if (!isBrowserEnvironment()) {
    return {};
  }

  try {
    const params: { tenantIds?: string; companyIds?: string } = {};

    // Get tenantId from tenant store
    try {
      const tenantStoreModule = await import('@/stores/tenant.store');
      const tenantStore = tenantStoreModule.useTenantStore.getState();
      const tenantId = tenantStore.getTenantId();
      if (tenantId && tenantId !== -1) {
        params.tenantIds = String(tenantId);
      }
    } catch (error) {
      // Silently fail if tenant store is not available
    }

    // Get companyId from company store
    try {
      const companyStoreModule = await import('@/stores/company.store');
      const companyStore = companyStoreModule.useCompanyStore.getState();
      const companyId = companyStore.getCompanyId();
      if (companyId && companyId !== -1) {
        params.companyIds = String(companyId);
      }
    } catch (error) {
      // Silently fail if company store is not available
    }

    return params;
  } catch (error) {
    return {};
  }
}

/**
 * Get user ID from user store for automatic inclusion in POST/PUT/PATCH requests
 * Only works in browser environment
 * Uses dynamic import to avoid circular dependencies and ensure stores are available
 */
async function getUserId(): Promise<string | null> {
  if (!isBrowserEnvironment()) {
    return null;
  }

  try {
    const userStoreModule = await import('@/stores/user.store');
    const userStore = userStoreModule.useUserStore.getState();
    const userId = userStore.getUserId();
    return userId || null;
  } catch (error) {
    // Silently fail if user store is not available
    return null;
  }
}

/**
 * Automatically append tenantIds and companyIds to /api/data/* and /api/schemas/* endpoints
 */
async function enrichDataEndpoint(
  endpoint: string,
  existingParams?: Record<string, any>,
  callerName?: string
): Promise<{ endpoint: string; params?: Record<string, any> }> {
  // Only enrich /api/data/* and /api/schemas/* endpoints
  const isDataEndpoint = endpoint.startsWith('/api/data/') || endpoint.includes('/api/data/');
  const isSchemaEndpoint = endpoint.startsWith('/api/schemas/') || endpoint.includes('/api/schemas/');
  
  if (!isDataEndpoint && !isSchemaEndpoint) {
    return { endpoint, params: existingParams };
  }

  const isDev = isDevEnvironment();

  // For integration cards, NEVER auto-inject tenantIds/companyIds for the tenants collection.
  // This ensures the tenant picker on /integrations always sees all tenants, in all environments.
  if (
    callerName === 'IntegrationsCardTenantSelector' &&
    (endpoint === '/api/data/tenants' || endpoint.startsWith('/api/data/tenants?'))
  ) {
    return { endpoint, params: existingParams };
  }

  // Allow the main TenantSelector component to see all tenants by
  // NOT auto-injecting tenantIds/companyIds for the tenants collection endpoint.
  // This applies in both development and production to ensure the tenant selector
  // can always see all available tenants.
  // Other consumers (e.g. tenants listing pages) still receive tenant/company scoping.
  if (
    callerName === 'TenantSelector' &&
    (endpoint === '/api/data/tenants' || endpoint.startsWith('/api/data/tenants?'))
  ) {
    return { endpoint, params: existingParams };
  }

  const contextParams = await getContextParams();
  if (!contextParams.tenantIds && !contextParams.companyIds) {
    return { endpoint, params: existingParams };
  }

  // Extract existing params from endpoint URL if present
  const [baseEndpoint, queryString] = endpoint.split('?');
  const urlParams: Record<string, any> = {};
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    searchParams.forEach((value, key) => {
      urlParams[key] = value;
    });
  }

  // Merge: URL params -> existing params -> context params (context params take precedence)
  // Only add context params if they're not already present
  const mergedParams = {
    ...urlParams,
    ...existingParams,
    // Only add tenantIds/companyIds from context if not already in params
    ...(contextParams.tenantIds && !existingParams?.tenantIds && !urlParams.tenantIds && { tenantIds: contextParams.tenantIds }),
    ...(contextParams.companyIds && !existingParams?.companyIds && !urlParams.companyIds && { companyIds: contextParams.companyIds }),
  };

  // Return base endpoint without query string (normalizeEndpointWithParams will add it back)
  return { endpoint: baseEndpoint, params: mergedParams };
}

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
  // Always use callerName if provided, even in production (for special handling like TenantSelector)
  const callerName = options?.callerName || (isDev ? extractCallerFromStack() || 'unknown' : undefined);
  const baseHeaders = options?.headers ? { ...options.headers } : undefined;
  const headersWithCaller =
    isDev && callerName
      ? { ...(baseHeaders || {}), 'x-function-name': callerName }
      : baseHeaders;  

  if (isDev && callerName) {
    loggingCustom(LogType.CLIENT_LOG, 'info', `[apiRequest] ${method} ${endpoint} invoked by ${callerName}`);
  }
  
  // Enrich /api/data/* and /api/schemas/* endpoints with tenantIds and companyIds
  const { endpoint: enrichedEndpoint, params: enrichedParams } = await enrichDataEndpoint(
    endpoint,
    options?.params,
    callerName
  );
  
  // Use normalizeEndpointWithParams for all methods to properly handle existing query params
  const normalizedEndpoint = normalizeEndpointWithParams(enrichedEndpoint, enrichedParams);

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

  // Enrich request body with user ID for POST/PUT/PATCH requests to /api/data/* endpoints
  let enrichedBody = options?.body;
  const isDataEndpoint = normalizedEndpoint.startsWith('/api/data/') || normalizedEndpoint.includes('/api/data/');
  const isMutationMethod = method === 'POST' || method === 'PUT' || method === 'PATCH';
  
  if (isDataEndpoint && isMutationMethod && enrichedBody !== undefined) {
    try {
      const userId = await getUserId();
      if (userId) {
        // Handle array of entities (bulk create/update)
        if (Array.isArray(enrichedBody)) {
          enrichedBody = enrichedBody.map((item) => {
            if (item && typeof item === 'object' && !Array.isArray(item)) {
              // For POST: add createdBy, for PUT/PATCH: add updatedBy
              if (method === 'POST') {
                return { ...item, createdBy: userId };
              } else {
                return { ...item, updatedBy: userId };
              }
            }
            return item;
          });
        } else if (enrichedBody && typeof enrichedBody === 'object' && !Array.isArray(enrichedBody)) {
          // Handle single entity
          if (method === 'POST') {
            enrichedBody = { ...enrichedBody, createdBy: userId };
          } else {
            enrichedBody = { ...enrichedBody, updatedBy: userId };
          }
        }
      }
    } catch (error) {
      // Silently fail if user ID enrichment fails - don't break the request
      loggingCustom(
        LogType.CLIENT_LOG,
        'warn',
        `[apiRequest] Failed to enrich body with user ID: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  try {
    let response: ApiResponse<T>;

    switch (method) {
      case 'GET': {
        const endpointForRequest = cacheStrategyPreResult?.overrideEndpoint ?? normalizedEndpoint;
        // If endpoint already has query params (from normalizeEndpointWithParams), don't pass params to apiClient.get()
        // apiClient.get() will add them again, causing duplicates
        const hasQueryParams = endpointForRequest.includes('?');
        const paramsForRequest =
          cacheStrategyPreResult?.overrideEndpoint !== undefined
            ? cacheStrategyPreResult.overrideParams
            : hasQueryParams
            ? undefined // Don't pass params if endpoint already has query string
            : enrichedParams; // Only pass params if endpoint doesn't have query string yet
        response = await apiClient.get<T>(endpointForRequest, paramsForRequest, requestHeaders);
        break;
      }
      case 'POST':
        // normalizedEndpoint already has query params properly merged
        response = await apiClient.post<T>(normalizedEndpoint, enrichedBody, requestHeaders);
        break;
      case 'PUT':
        // normalizedEndpoint already has query params properly merged
        response = await apiClient.put<T>(normalizedEndpoint, enrichedBody, requestHeaders);
        break;
      case 'PATCH':
        // normalizedEndpoint already has query params properly merged
        response = await apiClient.patch<T>(normalizedEndpoint, enrichedBody, requestHeaders);
        break;
      case 'DELETE':
        // normalizedEndpoint already has query params properly merged
        response = await apiClient.delete<T>(normalizedEndpoint, requestHeaders);
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
