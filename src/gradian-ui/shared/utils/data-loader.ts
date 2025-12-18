// General Data Loader Utility - SERVER SIDE ONLY
// Generic loader for caching data from API endpoints
// This file is server-only and can only be imported in server components

import 'server-only';

import { cookies, headers as nextHeaders } from 'next/headers';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { getCacheConfigByPath } from '@/gradian-ui/shared/configs/cache-config';

// Cache storage structure
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Global cache registry
const cacheRegistry = new Map<string, {
  cache: CacheEntry<any> | null;
  fetchPromise: Promise<any> | null;
  instanceId: string;
}>();

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours default TTL
const MAX_JSON_BYTES = 8 * 1024 * 1024; // defensive cap for in-memory responses

/**
 * Get cookies from Next.js cookies() and format as cookie header string
 * This allows server-side fetch calls to forward cookies from the original browser request
 */
async function getCookieHeader(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    return cookieHeader || undefined;
  } catch (error) {
    // cookies() may not be available in all contexts (e.g., during build)
    return undefined;
  }
}

/**
 * Get tenant domain for server-side requests
 * Extracts tenant domain from DNS/hostname in request headers only
 * This ensures multi-tenant deployments work correctly based on the actual DNS domain
 */
async function getTenantDomainForServerFetch(): Promise<string | undefined> {
  // Extract from incoming request headers (DNS-based multi-tenant)
  // IMPORTANT: This extracts from the ORIGINAL browser request headers, not from internal fetch URLs
  // This ensures internal server-side fetches include the correct tenant domain from the browser
  try {
    const hMaybe = nextHeaders();
    
    // Check if headers() returned a Promise (async context) - await it
    let h: any;
    if (hMaybe && typeof (hMaybe as any).then === 'function') {
      // In async context, await the Promise
      h = await (hMaybe as Promise<any>);
      loggingCustom(
        LogType.SCHEMA_LOADER,
        'debug',
        `[getTenantDomainForServerFetch] headers() returned Promise - awaited successfully`
      );
    } else {
      h = hMaybe as any;
    }
    if (!h || typeof h.get !== 'function') {
      loggingCustom(
        LogType.SCHEMA_LOADER,
        'debug',
        `[getTenantDomainForServerFetch] Headers not available or invalid`
      );
      return undefined;
    }
    
    // Prefer x-forwarded-host (set by reverse proxy/load balancer)
    // Then fall back to host header
    const forwardedHost = h.get('x-forwarded-host');
    const hostHeader = h.get('host');
    const xTenantDomain = h.get('x-tenant-domain');
    const host = (forwardedHost || hostHeader || '').trim();
    
    // Log for debugging
    loggingCustom(
      LogType.SCHEMA_LOADER,
      'debug',
      `[getTenantDomainForServerFetch] Headers: x-tenant-domain="${xTenantDomain || '(not set)'}", x-forwarded-host="${forwardedHost || '(not set)'}", host="${hostHeader || '(not set)'}"`
    );
    
    // First check if x-tenant-domain is already set (from a previous internal request)
    if (xTenantDomain) {
      // Extract hostname from x-tenant-domain if it contains a URL
      const tenantValue = xTenantDomain.trim();
      try {
        // If it's a URL, extract hostname
        if (tenantValue.startsWith('http://') || tenantValue.startsWith('https://')) {
          const url = new URL(tenantValue);
          const hostname = url.hostname.toLowerCase();
          if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
            loggingCustom(
              LogType.SCHEMA_LOADER,
              'info',
              `[getTenantDomainForServerFetch] Using x-tenant-domain header (extracted hostname from URL): ${hostname}`
            );
            return hostname;
          }
        } else {
          // If it's just a hostname, use it directly
          const hostname = tenantValue.toLowerCase();
          if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
            loggingCustom(
              LogType.SCHEMA_LOADER,
              'info',
              `[getTenantDomainForServerFetch] Using x-tenant-domain header: ${hostname}`
            );
            return hostname;
          }
        }
      } catch {
        // Invalid URL format, try as hostname
        const hostname = tenantValue.toLowerCase();
        if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
          loggingCustom(
            LogType.SCHEMA_LOADER,
            'info',
            `[getTenantDomainForServerFetch] Using x-tenant-domain header (as hostname): ${hostname}`
          );
          return hostname;
        }
      }
    }
    
    // Extract tenant domain from host headers
    if (host) {
      // Extract just the hostname (remove port and protocol if present)
      const hostname = host.split(':')[0].split('/')[0].toLowerCase();
      // Skip localhost/127.0.0.1 as those are internal calls without tenant context
      if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        loggingCustom(
          LogType.SCHEMA_LOADER,
          'info',
          `[getTenantDomainForServerFetch] Using extracted hostname from headers: ${hostname}`
        );
        return hostname;
      } else {
        loggingCustom(
          LogType.SCHEMA_LOADER,
          'warn',
          `[getTenantDomainForServerFetch] Skipping localhost/internal hostname: ${hostname || '(empty)'}`
        );
      }
    }
  } catch (error) {
    // headers() not available, called outside request scope, or other error
    // This can happen during build time or when headers() is not available in the context
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    // Only log if it's not the expected "outside request scope" error (to reduce noise)
    if (!errorMsg.includes('outside a request scope') && !errorMsg.includes('dynamic API')) {
      loggingCustom(
        LogType.SCHEMA_LOADER,
        'warn',
        `[getTenantDomainForServerFetch] Error extracting tenant domain: ${errorMsg}`
      );
    }
  }

  return undefined;
}

/**
 * Get the API URL for internal server-side calls
 * Server-side fetch requires absolute URLs, so we construct them here
 */
function getApiUrl(apiPath: string): string {
  // If it's already a full URL, use it as-is
  if (apiPath.startsWith('http')) {
    return apiPath;
  }

  // Check if we're in a build context (Next.js build time)
  // During build, API routes aren't available, so we should avoid fetch calls
  const isBuildTime =
    process.env.NEXT_PHASE === 'phase-production-build' ||
    (process.env.NODE_ENV === 'production' && !process.env.VERCEL_URL);

  // For relative URLs, construct absolute URL for server-side fetch.
  // IMPORTANT: do NOT use NEXTAUTH_URL here because it may point to an external
  // auth host (e.g., https://octa.../auth) which causes 401s when we call our
  // own API routes. Always prefer this app's origin.
  // Priority: Extract from request DNS → INTERNAL_API_BASE_URL env → localhost
  let baseUrl: string | undefined;

  // PRIORITY 1: Extract from incoming request headers (DNS-based for multi-tenant)
  // This ensures the internal API URL matches the actual domain being accessed
  try {
    const hMaybe = nextHeaders();
    // Next.js may return a Promise in some contexts; skip if so to avoid sync dynamic API error
    const h =
      hMaybe && typeof (hMaybe as any).then !== 'function'
        ? (hMaybe as any)
        : null;
    if (h && typeof h.get === 'function') {
      const forwardedHost = h.get('x-forwarded-host');
      const hostHeader = h.get('host');
      const host = (forwardedHost || hostHeader || '').trim();
      // Extract protocol from headers or default to https for production
      const proto = h.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
      if (host) {
        // Extract just the hostname (remove port if present in forwarded-host)
        const hostname = host.split(':')[0];
        // Only use real domains, not localhost (which would be handled by fallback)
        if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
          baseUrl = `${proto}://${hostname}`;
        }
      }
    }
  } catch {
    // headers() may not be available in all contexts; fallback below
  }

  // PRIORITY 2: Fallback to environment variable (if DNS extraction failed)
  if (!baseUrl) {
    baseUrl =
      process.env.INTERNAL_API_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  }

  if (!baseUrl) {
    if (!isBuildTime) {
      // Default to localhost for local development (but not during build)
      const port = process.env.PORT || '3000';
      baseUrl = `http://localhost:${port}`;
    } else {
      // During build, return a placeholder that will fail gracefully
      // This should not be reached if build-time code paths are correct
      baseUrl = 'http://localhost:3000';
    }
  }

  // Clean and combine paths
  const cleanPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;

  // Remove trailing slash from baseUrl if present
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  return `${normalizedBase}${cleanPath}`;
}

/**
 * Check if cache is still valid
 */
function isCacheValid(cacheEntry: CacheEntry<any> | null, ttl: number = CACHE_TTL): boolean {
  if (cacheEntry === null) {
    return false;
  }

  const now = Date.now();
  const cacheAge = now - cacheEntry.timestamp;
  
  return cacheAge < ttl;
}

/**
 * Initialize cache entry for a route if it doesn't exist
 */
function initializeCacheEntry(routeKey: string) {
  if (!cacheRegistry.has(routeKey)) {
    cacheRegistry.set(routeKey, {
      cache: null,
      fetchPromise: null,
      instanceId: Math.random().toString(36).substring(7),
    });
  }
}

/**
 * Clear cache for a specific route
 */
export function clearCache(routeKey: string): void {
  const entry = cacheRegistry.get(routeKey);
  if (entry) {
    entry.cache = null;
    entry.fetchPromise = null;
    loggingCustom(LogType.SCHEMA_LOADER, 'info', `🗑️ [${entry.instanceId}] Cache cleared for route: ${routeKey}`);
  }
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  const clearedRoutes: string[] = [];
  cacheRegistry.forEach((entry, routeKey) => {
    entry.cache = null;
    entry.fetchPromise = null;
    clearedRoutes.push(routeKey);
  });
  loggingCustom(LogType.SCHEMA_LOADER, 'info', `🗑️ Cleared all caches for routes: ${clearedRoutes.join(', ')}`);
}

/**
 * Load data from API endpoint with caching
 * @param routeKey - Unique key for this route (e.g., 'schemas', 'companies')
 * @param apiPath - API endpoint path (e.g., '/api/schemas', '/api/data/companies')
 * @param options - Optional configuration
 * @returns The data from API
 */
export async function loadData<T = any>(
  routeKey: string,
  apiPath: string,
  options?: {
    ttl?: number;
    processor?: (data: any) => T;
    logType?: LogType;
    fetcher?: () => Promise<any>;
  }
): Promise<T> {
  // Get cache configuration from config file, fallback to options.ttl or default
  const cacheConfig = getCacheConfigByPath(apiPath);
  const {
    ttl = cacheConfig.ttl,
    processor,
    logType = LogType.SCHEMA_LOADER,
    fetcher,
  } = options || {};
  const disableServerCache = cacheConfig.disableServerCache === true;
  
  initializeCacheEntry(routeKey);
  const entry = cacheRegistry.get(routeKey)!;
  const { instanceId } = entry;

  const fetchFreshData = async (shouldCache: boolean): Promise<T> => {
    const cacheBeforeFetch = entry.cache;
    try {
      const startTime = Date.now();
      let rawData: any;

      if (fetcher) {
        loggingCustom(logType, 'info', `🌐 [${instanceId}] Using custom fetcher for route "${routeKey}"`);
        rawData = await fetcher();
      } else {
        const fetchUrl = getApiUrl(apiPath);
        loggingCustom(logType, 'info', `🌐 [${instanceId}] Fetching data from ${fetchUrl}`);

        // Get cookies from Next.js request context to forward to internal API calls
        const cookieHeader = await getCookieHeader();
        const fetchHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (cookieHeader) {
          fetchHeaders['cookie'] = cookieHeader;
        }

        // Set x-tenant-domain header for internal Next.js API requests
        // Flow:
        // 1. Extract tenant domain from request DNS (x-forwarded-host or host header)
        // 2. Include x-tenant-domain header in internal Next.js API request
        // 3. Next.js API proxy functions will forward this header to external backend
        // The internal fetch URL may be localhost, but the tenant comes from the original request DNS
        const tenantDomain = await getTenantDomainForServerFetch();
        if (tenantDomain) {
          fetchHeaders['x-tenant-domain'] = tenantDomain;
          loggingCustom(logType, 'debug', `[${instanceId}] Adding x-tenant-domain header: ${tenantDomain} for internal fetch to ${fetchUrl}`);
        } else {
          loggingCustom(logType, 'warn', `[${instanceId}] No tenant domain extracted from DNS for internal fetch to ${fetchUrl}`);
        }

        const response = await fetch(fetchUrl, {
          cache: 'no-store',
          headers: fetchHeaders,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch data from ${apiPath}: ${response.status} ${response.statusText}`);
        }

        // Safely parse JSON with size guard
        const text = await response.text();
        const byteLength = Buffer.byteLength(text, 'utf8');
        if (byteLength > MAX_JSON_BYTES) {
          throw new Error(`Response too large (${byteLength} bytes)`);
        }
        const result = text ? JSON.parse(text) : {};

        if (!result.success) {
          throw new Error(result.error || `Failed to load data from ${apiPath}`);
        }

        rawData = result.data;
      }

      const processedData = processor ? processor(rawData) : rawData;
      const fetchTime = Date.now() - startTime;

      if (shouldCache) {
        entry.cache = {
          data: processedData,
          timestamp: Date.now(),
        };
        loggingCustom(logType, 'info', `📥 [${instanceId}] FETCHED from API (${fetchTime}ms) - Cached data for route "${routeKey}"`);
      } else {
        loggingCustom(logType, 'info', `📥 [${instanceId}] FETCHED from API (${fetchTime}ms) - Server cache disabled for route "${routeKey}"`);
      }

      return processedData as T;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isConnectionError =
        error instanceof Error &&
        (errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('connect'));

      const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

      if (isConnectionError && isBuildTime) {
        loggingCustom(
          logType,
          'warn',
          `Build-time connection error for route "${routeKey}" (expected during static generation) - returning empty data`
        );
        const emptyData = (Array.isArray(cacheBeforeFetch?.data) ? [] : {}) as T;
        return emptyData;
      }

      loggingCustom(logType, 'error', `Error loading data from ${apiPath}: ${errorMessage}`);

      if (shouldCache && cacheBeforeFetch !== null) {
        loggingCustom(logType, 'warn', `API fetch failed for route "${routeKey}", using cached data`);
        return cacheBeforeFetch!.data as T;
      }

      throw error;
    } finally {
      if (shouldCache) {
        entry.fetchPromise = null;
      }
    }
  };

  if (disableServerCache) {
    loggingCustom(logType, 'info', `🚫 Server cache disabled for route "${routeKey}" - fetching fresh data`);
    return await fetchFreshData(false);
  }

  const { cache, fetchPromise } = entry;

  // Return cached data if available and valid
  if (isCacheValid(cache, ttl) && cache !== null) {
    const cacheAge = Date.now() - cache.timestamp;
    loggingCustom(logType, 'info', `✅ CACHE HIT [${instanceId}] - Returning cached data for route "${routeKey}" (age: ${Math.round(cacheAge / 1000)}s)`);
    return cache.data as T;
  }

  // If there's already a fetch in progress, wait for it instead of starting a new one
  if (fetchPromise) {
    loggingCustom(logType, 'info', `⏳ [${instanceId}] Fetch already in progress for route "${routeKey}", waiting for existing request...`);
    return await fetchPromise;
  }
  
  loggingCustom(logType, 'info', `🔄 CACHE MISS [${instanceId}] - Fetching data for route "${routeKey}"...`);

  // Create a promise and store it to prevent concurrent fetches
  const promise = fetchFreshData(true);

  entry.fetchPromise = promise;
  return await promise;
}

/**
 * Load data by ID from API endpoint with caching
 * @param routeKey - Unique key for this route (e.g., 'schemas', 'companies')
 * @param apiBasePath - Base API endpoint path (e.g., '/api/schemas', '/api/data/companies')
 * @param id - The ID to fetch
 * @param options - Optional configuration
 * @returns The data item or null if not found
 */
export async function loadDataById<T = any>(
  routeKey: string,
  apiBasePath: string,
  id: string,
  options?: {
    ttl?: number;
    processor?: (data: any) => T;
    findInCache?: (cache: any, id: string) => T | null;
    logType?: LogType;
  }
): Promise<T | null> {
  // Get cache configuration from config file, fallback to options.ttl or default
  const cacheConfig = getCacheConfigByPath(`${apiBasePath}/${id}`);
  const {
    ttl = cacheConfig.ttl,
    processor,
    findInCache,
    logType = LogType.SCHEMA_LOADER,
  } = options || {};
  const disableServerCache = cacheConfig.disableServerCache === true;
  
  initializeCacheEntry(routeKey);
  const entry = cacheRegistry.get(routeKey)!;
  const { instanceId } = entry;

  const fetchItem = async (shouldCache: boolean): Promise<T | null> => {
    const cacheBeforeFetch = entry.cache;
    try {
      const fetchUrl = getApiUrl(`${apiBasePath}/${id}`);
      const startTime = Date.now();

      // Get cookies from Next.js request context to forward to internal API calls
      const cookieHeader = await getCookieHeader();
      const fetchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (cookieHeader) {
        fetchHeaders['cookie'] = cookieHeader;
      }

      // Set x-tenant-domain header for internal Next.js API requests
      // This header will be forwarded to external backend by proxy functions
      const tenantDomain = await getTenantDomainForServerFetch();
      if (tenantDomain) {
        fetchHeaders['x-tenant-domain'] = tenantDomain;
      }

      const response = await fetch(fetchUrl, {
        cache: 'no-store',
        headers: fetchHeaders,
      });

      if (!response.ok) {
        return null;
      }

        const text = await response.text();
        const byteLength = Buffer.byteLength(text, 'utf8');
        if (byteLength > MAX_JSON_BYTES) {
          throw new Error(`Response too large (${byteLength} bytes)`);
        }
        const result = text ? JSON.parse(text) : {};

      if (!result.success || !result.data) {
        return null;
      }

      const processedData = processor ? processor(result.data) : result.data;
      const fetchTime = Date.now() - startTime;

      if (shouldCache) {
        if (entry.cache === null) {
          entry.cache = {
            data: Array.isArray(processedData) ? processedData : [processedData],
            timestamp: Date.now(),
          };
        } else if (Array.isArray(entry.cache.data)) {
          const existingIndex = entry.cache.data.findIndex((item: any) => item.id === id);
          if (existingIndex === -1) {
            entry.cache.data.push(processedData);
          } else {
            entry.cache.data[existingIndex] = processedData;
          }
          entry.cache = {
            ...entry.cache,
            timestamp: Date.now(),
          };
        } else {
          const existingData = entry.cache.data;
          entry.cache = {
            data: Array.isArray(existingData) ? [...existingData, processedData] : [existingData, processedData],
            timestamp: Date.now(),
          };
        }

        loggingCustom(
          logType,
          'info',
          `📥 [${instanceId}] FETCHED "${routeKey}" ID "${id}" from API (${fetchTime}ms) - Cached result`
        );
      } else {
        loggingCustom(
          logType,
          'info',
          `📥 [${instanceId}] FETCHED "${routeKey}" ID "${id}" from API (${fetchTime}ms) - Server cache disabled`
        );
      }

      return processedData as T;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      loggingCustom(logType, 'error', `Error loading "${routeKey}" ID "${id}" from API: ${errorMessage}`);

      if (shouldCache && cacheBeforeFetch !== null) {
        const cachedData = Array.isArray(cacheBeforeFetch.data)
          ? cacheBeforeFetch.data.find((item: any) => item.id === id)
          : cacheBeforeFetch.data;
        if (cachedData) {
          loggingCustom(logType, 'warn', `API fetch failed for "${routeKey}" ID "${id}", using cached data`);
          return cachedData as T;
        }
      }

      return null;
    }
  };

  if (disableServerCache) {
    loggingCustom(logType, 'info', `🚫 Server cache disabled for "${routeKey}" ID "${id}" - fetching fresh data`);
    return await fetchItem(false);
  }

  const { cache } = entry;

  // First check cache - much faster than API call
  if (isCacheValid(cache, ttl) && cache !== null) {
    if (findInCache) {
      const cachedItem = findInCache(cache.data, id);
      if (cachedItem) {
        loggingCustom(logType, 'info', `✅ [${instanceId}] CACHE HIT for "${routeKey}" ID "${id}"`);
        return cachedItem;
      }
    } else if (Array.isArray(cache.data)) {
      // Default: find by id property in array
      const cachedItem = cache.data.find((item: any) => item.id === id);
      if (cachedItem) {
        loggingCustom(logType, 'info', `✅ [${instanceId}] CACHE HIT for "${routeKey}" ID "${id}"`);
        return cachedItem as T;
      }
    }
  }
  
  loggingCustom(logType, 'info', `🔄 [${instanceId}] CACHE MISS for "${routeKey}" ID "${id}" - Loading from API...`);

  try {
    const fetchUrl = getApiUrl(`${apiBasePath}/${id}`);
    const startTime = Date.now();

    // Get cookies from Next.js request context to forward to internal API calls
    const cookieHeader = await getCookieHeader();
    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (cookieHeader) {
      fetchHeaders['cookie'] = cookieHeader;
    }

    // Include tenant domain header for server-side internal fetches
    const tenantDomain = await getTenantDomainForServerFetch();
    if (tenantDomain) {
      fetchHeaders['x-tenant-domain'] = tenantDomain;
    }

    const response = await fetch(fetchUrl, {
      cache: 'no-store',
      headers: fetchHeaders,
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      return null;
    }

    // Process the data if processor is provided
    const processedData = processor ? processor(result.data) : result.data;
    const fetchTime = Date.now() - startTime;

    // Update cache with this item if cache is empty or doesn't contain it
    // Always store items in an array for incremental caching
    if (cache === null) {
      // Initialize cache as an array containing the first item
      entry.cache = {
        data: Array.isArray(processedData) ? processedData : [processedData],
        timestamp: Date.now(),
      };
      loggingCustom(logType, 'info', `📥 [${instanceId}] FETCHED "${routeKey}" ID "${id}" from API (${fetchTime}ms) - Added to cache`);
    } else if (Array.isArray(cache.data)) {
      // Add to cache if not already there
      const existingIndex = cache.data.findIndex((item: any) => item.id === id);
      if (existingIndex === -1) {
        cache.data.push(processedData);
        entry.cache = {
          ...cache,
          timestamp: Date.now(), // Update timestamp
        };
        loggingCustom(logType, 'info', `📥 [${instanceId}] FETCHED "${routeKey}" ID "${id}" from API (${fetchTime}ms) - Added to existing cache`);
      } else {
        // Update existing item if it already exists
        cache.data[existingIndex] = processedData;
        entry.cache = {
          ...cache,
          timestamp: Date.now(), // Update timestamp
        };
        loggingCustom(logType, 'info', `📥 [${instanceId}] FETCHED "${routeKey}" ID "${id}" from API (${fetchTime}ms) - Updated in cache`);
      }
    } else {
      // Cache exists but is not an array - convert it to an array
      // This handles edge cases where cache might have been initialized differently
      const existingData = cache.data;
      entry.cache = {
        data: Array.isArray(existingData) 
          ? [...existingData, processedData]
          : [existingData, processedData],
        timestamp: Date.now(),
      };
      loggingCustom(logType, 'info', `📥 [${instanceId}] FETCHED "${routeKey}" ID "${id}" from API (${fetchTime}ms) - Converted cache to array and added item`);
    }

    return processedData as T;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    loggingCustom(logType, 'error', `Error loading "${routeKey}" ID "${id}" from API: ${errorMessage}`);
    return null;
  }
}

