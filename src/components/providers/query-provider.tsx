'use client';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ReactNode, useEffect } from 'react';
import { getCacheConfig } from '@/gradian-ui/shared/configs/cache-config';
import { clearCompaniesCache } from '@/gradian-ui/indexdb-manager/companies-cache';
import { toast } from 'sonner';
import { LOG_CONFIG, LogType } from '@/gradian-ui/shared/configs/log-config';
import { clearMenuItemsCache } from '@/stores/menu-items.store';
import { clearClientSchemaCache } from '@/gradian-ui/schema-manager/utils/client-schema-cache';
import { clearSchemasSummaryCache } from '@/gradian-ui/indexdb-manager/schemas-summary-cache';

// Get default cache configuration from config file
const defaultCacheConfig = getCacheConfig('schemas');

/**
 * Checks if an error is a connection/timeout error
 */
const isConnectionError = (error: any): boolean => {
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

  // Check if error has a statusCode of 502 (Bad Gateway)
  if (error?.statusCode === 502) {
    return true;
  }

  // Check if the error response has a 502 status
  if (error?.response?.status === 502 || error?.response?.statusCode === 502) {
    return true;
  }

  return false;
};

/**
 * Extracts server name/URL from React Query error or query
 */
const extractServerNameFromQuery = (error: any, query?: any): string | undefined => {
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
  
  // Try to extract from queryKey if available (React Query stores endpoint in queryKey)
  const queryKey = query?.queryKey || error?.queryKey;
  if (queryKey && Array.isArray(queryKey)) {
    const endpoint = queryKey.find((key: any) => typeof key === 'string' && (key.startsWith('http') || key.startsWith('/api')));
    if (endpoint) {
      try {
        if (endpoint.startsWith('http')) {
          const url = new URL(endpoint);
          return url.hostname || url.host;
        }
        // For relative endpoints, map to backend URLs from env
        if (endpoint.includes('/api/schemas')) {
          const schemaUrl = process.env.NEXT_PUBLIC_URL_SCHEMA_CRUD || process.env.URL_SCHEMA_CRUD;
          if (schemaUrl) {
            const url = new URL(schemaUrl);
            return url.hostname || url.host;
          }
        }
        if (endpoint.includes('/api/data')) {
          const dataUrl = process.env.NEXT_PUBLIC_URL_DATA_CRUD || process.env.URL_DATA_CRUD;
          if (dataUrl) {
            const url = new URL(dataUrl);
            return url.hostname || url.host;
          }
        }
      } catch {
        // ignore and fall through
      }
    }
  }
  
  // Try to extract from meta if available
  if (error?.meta?.endpoint || query?.meta?.endpoint) {
    try {
      const endpoint = error?.meta?.endpoint || query?.meta?.endpoint;
      if (endpoint && endpoint.startsWith('http')) {
        const url = new URL(endpoint);
        return url.hostname || url.host;
      }
    } catch {}
  }
  
  return undefined;
};

const notifyConnectionError = (error: unknown, query?: any) => {
  if (isConnectionError(error)) {
    // Only extract and show server name if ENDPOINT_LOG is enabled
    const shouldShowEndpoint = LOG_CONFIG[LogType.ENDPOINT_LOG];
    const serverName = shouldShowEndpoint ? extractServerNameFromQuery(error, query) : undefined;
    const description = serverName 
      ? `Unable to connect to the server "${serverName}". Please check your connection and try again.`
      : 'Unable to connect to the server. Please check your connection and try again.';
    
    toast.error('Connection is out', {
      description,
      duration: 5000,
    });
  }
};

// Create a client factory function
function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => notifyConnectionError(error, query),
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => notifyConnectionError(error, mutation),
    }),
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        // Use default from cache config, but allow individual queries to override
        staleTime: defaultCacheConfig.staleTime ?? 10 * 60 * 1000,
        gcTime: defaultCacheConfig.gcTime ?? 30 * 60 * 1000,
        refetchOnMount: false, // Don't refetch on mount if data exists in cache
        refetchOnWindowFocus: false, // Don't refetch on window focus
        refetchOnReconnect: false, // Don't refetch on reconnect
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  // Server: always make a new query client
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  // Browser: make a new query client if we don't already have one
  // This is very important so we don't re-make a new client if React
  // suspends during the initial render. This may not be needed if we
  // have a suspense boundary BELOW the creation of the query client
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

/**
 * Component to handle React Query cache clearing events
 * Listens for cache clear events from the clear-cache API route
 */
function ReactQueryCacheClearHandler() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen for custom cache clear event (from clear-cache API route)
    const handleCacheClear = async (event: CustomEvent<{ queryKeys?: string[] }>) => {
      const queryKeys = event.detail?.queryKeys || ['schemas', 'companies'];
      try {
        await clearCompaniesCache();
      } catch (error) {
        console.warn('[schema-cache] Failed to clear companies IndexedDB cache:', error);
      }
      // Clear per-schema and schemas-summary IndexedDB caches
      try {
        await clearClientSchemaCache();
        await clearSchemasSummaryCache();
      } catch (error) {
        console.warn('[schema-cache] Failed to clear client schema IndexedDB cache:', error);
      }
      // Clear menu items cache
      try {
        clearMenuItemsCache();
      } catch (error) {
        console.warn('[menu-items-cache] Failed to clear menu items cache:', error);
      }
      // Clear company store
      try {
        const { useCompanyStore } = await import('@/stores/company.store');
        useCompanyStore.getState().clearSelectedCompany();
      } catch (error) {
        console.warn('[company-store] Failed to clear company store:', error);
      }
      // Clear tenant store (but keep selected tenant - only clear tenants list)
      try {
        const { useTenantStore } = await import('@/stores/tenant.store');
        useTenantStore.getState().clearTenants();
        // Note: We don't clear selectedTenant as it's needed for filtering
      } catch (error) {
        console.warn('[tenant-store] Failed to clear tenant store:', error);
      }
      // Clear ALL React Query caches first
      await queryClient.clear();
      // Then invalidate and refetch all queries for the specified keys
      for (const queryKey of queryKeys) {
        await queryClient.invalidateQueries({ queryKey: [queryKey] });
        // Force refetch active queries immediately
        await queryClient.refetchQueries({ queryKey: [queryKey], type: 'active' });
      }
    };
    const handleCacheClearEvent: EventListener = (event) => {
      void handleCacheClear(event as CustomEvent<{ queryKeys?: string[] }>);
    };

    // Listen for storage events (from other tabs/windows)
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'react-query-cache-cleared') {
        const queryKeys = e.newValue ? JSON.parse(e.newValue) : ['schemas', 'companies'];
        try {
          await clearCompaniesCache();
        } catch (error) {
          console.warn('[schema-cache] Failed to clear companies cache from storage event:', error);
        }
        // Clear per-schema and schemas-summary IndexedDB caches
        try {
          await clearClientSchemaCache();
          await clearSchemasSummaryCache();
        } catch (error) {
          console.warn('[schema-cache] Failed to clear client schema cache from storage event:', error);
        }
        // Clear menu items cache
        try {
          clearMenuItemsCache();
        } catch (error) {
          console.warn('[menu-items-cache] Failed to clear menu items cache from storage event:', error);
        }
        // Clear company store
        try {
          const { useCompanyStore } = await import('@/stores/company.store');
          useCompanyStore.getState().clearSelectedCompany();
        } catch (error) {
          console.warn('[company-store] Failed to clear company store from storage event:', error);
        }
        // Clear tenant store (but keep selected tenant - only clear tenants list)
        try {
          const { useTenantStore } = await import('@/stores/tenant.store');
          useTenantStore.getState().clearTenants();
          // Note: We don't clear selectedTenant as it's needed for filtering
        } catch (error) {
          console.warn('[tenant-store] Failed to clear tenant store from storage event:', error);
        }
        // Clear ALL React Query caches first
        await queryClient.clear();
        // Then invalidate and refetch all queries for the specified keys
        for (const queryKey of queryKeys) {
          await queryClient.invalidateQueries({ queryKey: [queryKey] });
          // Force refetch active queries immediately
          await queryClient.refetchQueries({ queryKey: [queryKey], type: 'active' });
        }
      }
    };

    // Listen for custom event
    window.addEventListener('react-query-cache-clear', handleCacheClearEvent);
    // Listen for storage events (cross-tab)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('react-query-cache-clear', handleCacheClearEvent);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [queryClient]);

  return null;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  // have a suspense boundary between this and the code that may suspend
  // because React will throw away the client on the initial render if it
  // suspends and there is no boundary
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryCacheClearHandler />
      {children}
    </QueryClientProvider>
  );
}


