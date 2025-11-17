'use client';

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ReactNode, useEffect } from 'react';
import { getCacheConfig } from '@/gradian-ui/shared/configs/cache-config';
import { clearSchemaCache } from '@/gradian-ui/indexdb-manager/schema-cache';
import { clearCompaniesCache } from '@/gradian-ui/indexdb-manager/companies-cache';

// Get default cache configuration from config file
const defaultCacheConfig = getCacheConfig('schemas');

// Create a client factory function
function makeQueryClient() {
  return new QueryClient({
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
        await clearSchemaCache();
      } catch (error) {
        console.warn('[schema-cache] Failed to clear IndexedDB cache:', error);
      }
      try {
        await clearCompaniesCache();
      } catch (error) {
        console.warn('[schema-cache] Failed to clear companies IndexedDB cache:', error);
      }
      // Invalidate and refetch all queries for the specified keys
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
          await clearSchemaCache();
        } catch (error) {
          console.warn('[schema-cache] Failed to clear IndexedDB cache from storage event:', error);
        }
        try {
          await clearCompaniesCache();
        } catch (error) {
          console.warn('[schema-cache] Failed to clear companies cache from storage event:', error);
        }
        // Invalidate and refetch all queries for the specified keys
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

