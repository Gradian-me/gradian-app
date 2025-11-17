/**
 * Cache Configuration
 * Defines cache settings (TTL) for different routes and data types
 * Used by both server-side loaders and client-side React Query hooks
 */

export interface RouteCacheConfig {
  /** Time To Live in milliseconds - how long data is considered fresh */
  ttl: number;
  /** Client-side React Query staleTime in milliseconds */
  staleTime?: number;
  /** Client-side React Query gcTime (garbage collection time) in milliseconds */
  gcTime?: number;
  /** React Query keys that should be invalidated when this route cache is cleared */
  reactQueryKeys?: string[];
  /** Optional IndexedDB cache key associated with this route */
  indexedDbKey?: string;
  /** Disable server-side in-memory cache for this route */
  disableServerCache?: boolean;
  /** Description for documentation */
  description?: string;
}

/**
 * Cache configuration for different routes and data types
 * TTL values are in milliseconds
 */
export const CACHE_CONFIG: Record<string, RouteCacheConfig> = {
  // Schema routes
  schemas: {
    ttl: 10 * 60 * 1000, // 10 minutes - server-side cache
    staleTime: 10 * 60 * 1000, // 10 minutes - React Query stale time
    gcTime: 30 * 60 * 1000, // 30 minutes - React Query garbage collection
    reactQueryKeys: ['schemas'],
    indexedDbKey: 'schemas',
    description: 'All schemas list',
  },
  'schemas-summary': {
    ttl: 0, // No server-side cache
    staleTime: 0, // Always treat as stale - refetch on mount
    gcTime: 0, // Don't keep in cache
    reactQueryKeys: ['schemas-summary'],
    indexedDbKey: 'schemas-summary',
    disableServerCache: true, // Disable server-side in-memory cache
    description: 'Schema summaries list (no caching)',
  },
  'schemas/:id': {
    ttl: 10 * 60 * 1000, // 10 minutes - server-side cache
    staleTime: 10 * 60 * 1000, // 10 minutes - React Query stale time
    gcTime: 30 * 60 * 1000, // 30 minutes - React Query garbage collection
    reactQueryKeys: ['schemas'],
    indexedDbKey: 'schemas',
    description: 'Single schema by ID',
  },
  
  // Company routes
  companies: {
    ttl: 15 * 60 * 1000, // 15 minutes - server-side cache
    staleTime: 15 * 60 * 1000, // 15 minutes - React Query stale time
    gcTime: 30 * 60 * 1000, // 30 minutes - React Query garbage collection
    reactQueryKeys: ['companies'],
    indexedDbKey: 'companies',
    description: 'Companies list',
  },
  'companies/:id': {
    ttl: 15 * 60 * 1000, // 15 minutes - server-side cache
    staleTime: 15 * 60 * 1000, // 15 minutes - React Query stale time
    gcTime: 30 * 60 * 1000, // 30 minutes - React Query garbage collection
    reactQueryKeys: ['companies'],
    description: 'Single company by ID',
  },
  'data/companies': {
    ttl: 15 * 60 * 1000,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    reactQueryKeys: ['companies'],
    indexedDbKey: 'companies',
    description: 'Companies list via data API',
  },
  'data/companies/:id': {
    ttl: 15 * 60 * 1000,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    reactQueryKeys: ['companies'],
    description: 'Single company via data API',
  },
  
  // Data routes (dynamic entity routes)
  'data/:schemaId': {
    ttl: 5 * 60 * 1000, // 5 minutes - server-side cache
    staleTime: 2 * 60 * 1000, // 2 minutes - React Query stale time (shorter for data)
    gcTime: 10 * 60 * 1000, // 10 minutes - React Query garbage collection
    reactQueryKeys: ['entities'],
    description: 'Entity list by schema ID',
  },
  'data/:schemaId/:id': {
    ttl: 0, // Always fetch fresh data on the server
    staleTime: 0, // Always treat client data as stale
    gcTime: 0, // Allow React Query to drop immediately
    reactQueryKeys: ['entities'],
    disableServerCache: true,
    description: 'Single entity by schema ID and entity ID (no caching)',
  },
  
  // Relation types
  'relation-types': {
    ttl: 15 * 60 * 1000, // 15 minutes - server-side cache
    staleTime: 15 * 60 * 1000, // 15 minutes - React Query stale time
    gcTime: 30 * 60 * 1000, // 30 minutes - React Query garbage collection
    reactQueryKeys: ['relation-types'],
    description: 'Relation types list',
  },
  'relation-types/:id': {
    ttl: 15 * 60 * 1000, // 15 minutes - server-side cache
    staleTime: 15 * 60 * 1000, // 15 minutes - React Query stale time
    gcTime: 30 * 60 * 1000, // 30 minutes - React Query garbage collection
    reactQueryKeys: ['relation-types'],
    description: 'Single relation type by ID',
  },
  
  // Relations
  'relations': {
    ttl: 2 * 60 * 1000, // 2 minutes - server-side cache (shorter for relations)
    staleTime: 1 * 60 * 1000, // 1 minute - React Query stale time
    gcTime: 5 * 60 * 1000, // 5 minutes - React Query garbage collection
    reactQueryKeys: ['relations'],
    description: 'Relations data',
  },
};

/**
 * Get cache configuration for a route
 * @param routeKey - Route key (e.g., 'schemas', 'companies', 'data/:schemaId')
 * @returns Cache configuration or default configuration
 */
export function getCacheConfig(routeKey: string): RouteCacheConfig {
  // Try exact match first
  if (CACHE_CONFIG[routeKey]) {
    return CACHE_CONFIG[routeKey];
  }
  
  // Try pattern matching for dynamic routes (e.g., 'data/inquiries' matches 'data/:schemaId')
  for (const [pattern, config] of Object.entries(CACHE_CONFIG)) {
    if (pattern.includes(':')) {
      // Convert pattern to regex (e.g., 'data/:schemaId' -> /^data\/[^/]+$/)
      const regexPattern = pattern.replace(/:[^/]+/g, '[^/]+').replace(/\//g, '\\/');
      const regex = new RegExp(`^${regexPattern}$`);
      if (regex.test(routeKey)) {
        return config;
      }
    }
  }
  
  // Default configuration
  return {
    ttl: 10 * 60 * 1000, // 10 minutes
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    reactQueryKeys: [],
    description: 'Default cache configuration',
  };
}

/**
 * Get cache configuration for a route by API path
 * @param apiPath - API path (e.g., '/api/schemas', '/api/schemas/inquiries', '/api/data/companies')
 * @returns Cache configuration or default configuration
 */
export function resolveRouteKeyByPath(apiPath: string): string {
  const normalized = (() => {
    if (!apiPath) return '';
    let path = apiPath;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      try {
        const url = new URL(path);
        path = url.pathname;
      } catch {
        // ignore
      }
    }
    const [clean] = path.split('?');
    return clean || '';
  })();

  const cleanPath = normalized.replace(/^\/api\//, '').replace(/\/$/, '');

  if (cleanPath === '') {
    return cleanPath;
  }

  if (cleanPath === 'data/companies') {
    return 'data/companies';
  }

  if (cleanPath.startsWith('data/companies/')) {
    return 'data/companies/:id';
  }
  
  if (cleanPath.startsWith('data/')) {
    const parts = cleanPath.split('/');
    if (parts.length >= 2) {
      if (parts.length === 3) {
        return 'data/:schemaId/:id';
      }
      return 'data/:schemaId';
    }
  }

  if (cleanPath.startsWith('schemas/') && cleanPath.split('/').length === 2) {
    return 'schemas/:id';
  }

  if (cleanPath.startsWith('companies/') && cleanPath.split('/').length === 2) {
    return 'companies/:id';
  }

  if (cleanPath.startsWith('relation-types/') && cleanPath.split('/').length === 2) {
    return 'relation-types/:id';
  }

  return cleanPath;
}

function hasSummaryFlag(apiPath: string): boolean {
  if (!apiPath || !apiPath.includes('summary')) {
    return false;
  }

  try {
    const url = apiPath.startsWith('http') ? new URL(apiPath) : new URL(apiPath, 'http://localhost');
    const summaryValue = url.searchParams.get('summary');
    return summaryValue === 'true' || summaryValue === '1';
  } catch {
    const [, queryString = ''] = apiPath.split('?');
    if (!queryString) {
      return false;
    }
    const params = new URLSearchParams(queryString);
    const summaryValue = params.get('summary');
    return summaryValue === 'true' || summaryValue === '1';
  }
}

export function getCacheConfigByPath(apiPath: string): RouteCacheConfig {
  const routeKey = resolveRouteKeyByPath(apiPath);
  const isSchemasSummaryRequest = routeKey === 'schemas' && hasSummaryFlag(apiPath);

  if (isSchemasSummaryRequest) {
    return getCacheConfig('schemas-summary');
  }

  return getCacheConfig(routeKey);
}

/**
 * Helper to convert milliseconds to human-readable time
 */
export function formatCacheTime(ms: number): string {
  if (ms < 60 * 1000) {
    return `${Math.round(ms / 1000)}s`;
  } else if (ms < 60 * 60 * 1000) {
    return `${Math.round(ms / (60 * 1000))}m`;
  } else {
    return `${Math.round(ms / (60 * 60 * 1000))}h`;
  }
}

/**
 * Get unique list of React Query keys referenced in cache config
 */
export function getAllReactQueryKeys(): string[] {
  const keys = new Set<string>();
  Object.values(CACHE_CONFIG).forEach(config => {
    config.reactQueryKeys?.forEach(key => keys.add(key));
  });
  return Array.from(keys);
}

/**
 * Get unique IndexedDB cache keys referenced in cache config
 */
export function getIndexedDbCacheKeys(): string[] {
  const keys = new Set<string>();
  Object.values(CACHE_CONFIG).forEach((config) => {
    if (config.indexedDbKey) {
      keys.add(config.indexedDbKey);
    }
  });
  return Array.from(keys);
}

