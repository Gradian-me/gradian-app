// Schema Cache Clear API Route
// Clears all schema-related caches to force reload

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { isDemoModeEnabled, proxySchemaRequest } from '../utils';
import { getAllReactQueryKeys } from '@/gradian-ui/shared/configs/cache-config';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';

/**
 * Clear cache from schema-loader (server-side cache)
 */
async function clearSchemaLoaderCache() {
  try {
    // Import and call clearSchemaCache from schema-loader
    const { clearSchemaCache } = await import('@/gradian-ui/schema-manager/utils/schema-loader');
    clearSchemaCache();
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'warn',
      `Could not clear schema-loader cache: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Clear cache from companies-loader (server-side cache)
 */
async function clearCompaniesLoaderCache() {
  try {
    // Import and call clearCompaniesCache from companies-loader
    const { clearCompaniesCache } = await import('@/gradian-ui/shared/utils/companies-loader');
    clearCompaniesCache();
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'warn',
      `Could not clear companies-loader cache: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Clear all caches using the general data-loader
 */
async function clearAllDataLoaderCaches() {
  try {
    // Import and call clearAllCaches from data-loader
    const { clearAllCaches } = await import('@/gradian-ui/shared/utils/data-loader');
    clearAllCaches();
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'warn',
      `Could not clear data-loader caches: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Clear cache from schema-registry.server (server-side cache)
 */
async function clearSchemaRegistryCache() {
  try {
    const { clearSchemaCache } = await import('@/gradian-ui/schema-manager/utils/schema-registry.server');
    clearSchemaCache();
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'warn',
      `Could not clear schema-registry.server cache: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Clear cache from API route handlers
 */
async function clearApiRouteCaches() {
  try {
    // Clear cache from [schema-id] route
    // Note: clearSchemaCache is not exported from route.ts to avoid Next.js type conflicts
    // These are no-op functions anyway, so we can skip them
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'warn',
      `Could not clear [schema-id] route cache: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    // Clear cache from main schemas route
    // Note: clearSchemaCache is not exported from route.ts to avoid Next.js type conflicts
    // This is a no-op function anyway, so we can skip it
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'warn',
      `Could not clear schemas route cache: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Revalidate Next.js page cache for all schema pages
 * This ensures that ISR pages are refreshed after clearing data cache
 */
async function revalidateSchemaPages() {
  try {
    // Get all schema IDs to revalidate their pages
    // Note: Cache is cleared first, so this will load fresh data from source
    const { getAvailableSchemaIds } = await import('@/gradian-ui/schema-manager/utils/schema-registry.server');
    const schemaIds = await getAvailableSchemaIds();

    // Revalidate each schema page
    // Revalidating the page path will also invalidate child routes (detail pages)
    for (const schemaId of schemaIds) {
      try {
        // Revalidate the main schema page
        revalidatePath(`/page/${schemaId}`, 'page');
        // Revalidate layout to ensure all routes under this path are refreshed
        revalidatePath(`/page/${schemaId}`, 'layout');
      } catch (error) {
        loggingCustom(
          LogType.INFRA_LOG,
          'warn',
          `Could not revalidate page for schema ${schemaId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Also revalidate the base page route to catch any edge cases
    try {
      revalidatePath('/page', 'page');
      revalidatePath('/page', 'layout');
    } catch (error) {
      loggingCustom(
        LogType.INFRA_LOG,
        'warn',
        `Could not revalidate base page route: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'warn',
      `Could not revalidate schema pages: ${error instanceof Error ? error.message : String(error)}`,
    );
    // Don't throw - cache clearing should still succeed even if revalidation fails
  }
}

async function clearLocalCaches() {
  await Promise.all([
    clearAllDataLoaderCaches(),
    clearSchemaLoaderCache(),
    clearCompaniesLoaderCache(),
    clearSchemaRegistryCache(),
    clearApiRouteCaches(),
  ]);

  await revalidateSchemaPages();
}

/**
 * Call remote API's clear-cache endpoint (when DEMO_MODE is false)
 */
async function callRemoteClearCache(method: string = 'POST') {
  const baseUrl = process.env.URL_SCHEMA_CRUD?.replace(/\/+$/, '');
  
  if (!baseUrl) {
    loggingCustom(
      LogType.INFRA_LOG,
      'warn',
      'URL_SCHEMA_CRUD not configured, skipping remote cache clear',
    );
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}/api/schemas/clear-cache`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      return result;
    } else {
      loggingCustom(
        LogType.INFRA_LOG,
        'warn',
        `Remote cache clear failed with status ${response.status}`,
      );
      return null;
    }
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'warn',
      `Failed to call remote clear-cache endpoint: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * POST - Clear all caches (schemas, companies, menu items, stores, and all data-loader caches)
 * Example: POST /api/schemas/clear-cache
 * 
 * This route always runs on the current server to clear local caches.
 * If DEMO_MODE is false, it also calls the remote API's clear-cache endpoint.
 * 
 * Clears:
 * - Server-side caches (schema-loader, companies-loader, data-loader, schema-registry)
 * - React Query caches (client-side via custom event dispatch)
 * - IndexedDB caches (client-side via custom event dispatch)
 * - Menu items store (client-side via custom event dispatch)
 * - Company store (client-side via custom event dispatch)
 * - Tenant store tenants list (client-side via custom event dispatch)
 */
export async function POST(request: NextRequest) {
  // Check authentication (unless route is excluded)
  const authResult = requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return 401 if not authenticated
  }
  
  // Always clear local caches first (this route always runs on current server)
  try {
    await clearLocalCaches();
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'warn',
      `Local cache clearing failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear local caches',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }

  // If DEMO_MODE is false, also call remote API's clear-cache endpoint
  let remoteResult = null;
  if (!isDemoModeEnabled()) {
    remoteResult = await callRemoteClearCache('POST');
  }

  // Return success response with instruction to clear React Query caches client-side
  return NextResponse.json({
    success: true,
    message: 'All caches cleared successfully',
    local: true,
    remote: remoteResult?.success || false,
    clearReactQueryCache: true, // Signal to client to clear React Query caches
    reactQueryKeys: getAllReactQueryKeys(),
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET - Clear all caches (for convenience)
 * Example: GET /api/schemas/clear-cache
 * 
 * This route always runs on the current server to clear local caches.
 * If DEMO_MODE is false, it also calls the remote API's clear-cache endpoint.
 * 
 * Clears:
 * - Server-side caches (schema-loader, companies-loader, data-loader, schema-registry)
 * - React Query caches (client-side via custom event dispatch)
 * - IndexedDB caches (client-side via custom event dispatch)
 * - Menu items store (client-side via custom event dispatch)
 * - Company store (client-side via custom event dispatch)
 * - Tenant store tenants list (client-side via custom event dispatch)
 */
export async function GET(request: NextRequest) {
  // Check authentication (unless route is excluded)
  const authResult = requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return 401 if not authenticated
  }
  
  // Always clear local caches first (this route always runs on current server)
  try {
    await clearLocalCaches();
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'warn',
      `Local cache clearing failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear local caches',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }

  // If DEMO_MODE is false, also call remote API's clear-cache endpoint
  let remoteResult = null;
  if (!isDemoModeEnabled()) {
    remoteResult = await callRemoteClearCache('GET');
  }

  // Return success response with instruction to clear React Query caches client-side
  return NextResponse.json({
    success: true,
    message: 'All caches cleared successfully',
    local: true,
    remote: remoteResult?.success || false,
    clearReactQueryCache: true, // Signal to client to clear React Query caches
    reactQueryKeys: getAllReactQueryKeys(),
    timestamp: new Date().toISOString(),
  });
}

