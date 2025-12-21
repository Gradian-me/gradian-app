import { NextRequest, NextResponse } from 'next/server';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { DEMO_MODE } from '@/gradian-ui/shared/configs/env-config';
import { readSchemaData, writeSchemaData } from '@/gradian-ui/shared/domain/utils/data-storage.util';
import { extractTokenFromHeader, extractTokenFromCookies } from '@/domains/auth';
import { addAudienceToToken } from '@/domains/auth/utils/jwt.util';
import { AUTH_CONFIG } from '@/gradian-ui/shared/configs/auth-config';
// system-token.util is server-only - import directly
import { getSystemTokenForTargetRoute, getAudienceIdFromTargetRoute } from '@/gradian-ui/shared/utils/system-token.util';
import { enrichEntityPickerFieldsFromRelations } from '@/gradian-ui/shared/domain/utils/field-value-relations.util';

/**
 * Get the API URL for internal server-side calls
 * Server-side fetch requires absolute URLs, so we construct them here
 */
function getApiUrl(apiPath: string): string {
  // If it's already a full URL, use it as-is
  if (apiPath.startsWith('http')) {
    return apiPath;
  }

  // For relative URLs, construct absolute URL for server-side fetch
  // Priority: NEXTAUTH_URL > VERCEL_URL > localhost (default for development)
  let baseUrl = process.env.NEXTAUTH_URL;

  if (!baseUrl) {
    // Use Vercel URL if available (for Vercel deployments)
    if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      // Default to localhost for local development
      const port = process.env.PORT || '3000';
      baseUrl = `http://localhost:${port}`;
    }
  }

  // Clean and combine paths
  const cleanPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;

  // Remove trailing slash from baseUrl if present
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  return `${normalizedBase}${cleanPath}`;
}

/**
 * Extract data from object using JSON path (e.g., "results", "data.items", "response.data")
 */
function extractDataByPath(data: any, path: string): any {
  if (!path) return data;
  
  const parts = path.split('.');
  let result = data;
  
  // SECURITY: Prevent prototype pollution by validating keys
  const PROTOTYPE_POLLUTION_KEYS = ['__proto__', 'constructor', 'prototype'];
  
  for (const part of parts) {
    if (result === null || result === undefined) {
      return null;
    }
    // SECURITY: Skip prototype pollution keys
    if (PROTOTYPE_POLLUTION_KEYS.includes(part)) {
      return null;
    }
    // SECURITY: Use hasOwnProperty check for objects
    if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
      if (!Object.prototype.hasOwnProperty.call(result, part)) {
        return undefined;
      }
    }
    result = result[part];
  }
  
  return result;
}

type IntegrationEntity = Record<string, any>;

function isServerDemoMode(): boolean {
  return Boolean(DEMO_MODE);
}

/**
 * Resolve a route to its actual URL/address
 * Handles:
 * 1. Direct URLs (http:// or https://)
 * 2. Objects with metadata.address (from stored data or picker with addToReferenceMetadata)
 * 3. Route IDs that need to be looked up in url-repositories
 */
function resolveRouteToUrl(route: string | object | null): string | null {
  if (!route) {
    return null;
  }

  // If it's an object (from picker or stored data), check for metadata.address first
  if (typeof route === 'object' && route !== null) {
    // First priority: Check stored metadata.address (from all-data.json)
    const storedMetadataAddress = (route as any).metadata?.address;
    if (storedMetadataAddress) {
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', `resolveRouteToUrl: Found stored metadata.address in route object`);
      return storedMetadataAddress;
    }
    
    // Second priority: Check direct address/url fields
    const directAddress = (route as any).address || (route as any).url || (route as any).value;
    if (directAddress) {
      return directAddress;
    }
    
    // Extract ID from object to resolve
    const routeId = (route as any).id || (route as any).value;
    if (routeId) {
      route = routeId;
    } else {
      return null;
    }
  }

  // If it's a string, check if it's already a URL
  if (typeof route === 'string') {
    if (route.startsWith('http://') || route.startsWith('https://')) {
      return route;
    }

    // If it looks like a route ID (starts with alphanumeric and is long), try to resolve it
    if (/^[A-Z0-9]{20,}$/.test(route)) {
      try {
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `resolveRouteToUrl: Attempting to resolve route ID: ${route}`);
        const urlRepositories = readSchemaData<any>('url-repositories');
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `resolveRouteToUrl: Found ${urlRepositories.length} url-repositories in data`);
        
        const routeEntity = urlRepositories.find((r: any) => String(r.id) === String(route));
        if (!routeEntity) {
          loggingCustom(LogType.INTEGRATION_LOG, 'warn', `resolveRouteToUrl: Route not found for ID: ${route}`);
          return null;
        }

        // Extract URL from route entity
        const url = routeEntity.address || routeEntity.url || routeEntity.value || null;
        if (!url) {
          loggingCustom(LogType.INTEGRATION_LOG, 'warn', `resolveRouteToUrl: Route found but has no address/url field. Route ID: ${route}`);
          return null;
        }

        loggingCustom(LogType.INTEGRATION_LOG, 'info', `resolveRouteToUrl: Resolved route ID ${route} to URL: ${url}`);
        return url;
      } catch (error) {
        loggingCustom(
          LogType.INTEGRATION_LOG,
          'error',
          `resolveRouteToUrl: Error resolving route ID ${route}: ${error instanceof Error ? error.message : String(error)}`
        );
        return null;
      }
    }
  }

  // If it doesn't look like an ID and isn't a URL, return as-is (might be a relative path)
  return typeof route === 'string' ? route : null;
}

function resolveTenantDomainFromId(tenantId: string | number | undefined | null): string | null {
  if (!tenantId) {
    loggingCustom(LogType.INTEGRATION_LOG, 'debug', `resolveTenantDomainFromId: No tenantId provided`);
    return null;
  }
  try {
    loggingCustom(LogType.INTEGRATION_LOG, 'debug', `resolveTenantDomainFromId: Looking up tenant with ID: ${tenantId}`);
    const tenants = readSchemaData<any>('tenants');
    loggingCustom(LogType.INTEGRATION_LOG, 'debug', `resolveTenantDomainFromId: Found ${tenants.length} tenants in data`);
    const tenant = tenants.find(
      (t: any) =>
        String(t.id) === String(tenantId) ||
        (t.name && String(t.name) === String(tenantId))
    );
    if (!tenant) {
      loggingCustom(LogType.INTEGRATION_LOG, 'warn', `resolveTenantDomainFromId: Tenant not found for ID: ${tenantId}`);
      return null;
    }
    if (!tenant.domain) {
      loggingCustom(LogType.INTEGRATION_LOG, 'warn', `resolveTenantDomainFromId: Tenant found but has no domain field. Tenant: ${JSON.stringify({ id: tenant.id, name: tenant.name })}`);
      return null;
    }
    const rawDomain: string = tenant.domain;
    loggingCustom(LogType.INTEGRATION_LOG, 'debug', `resolveTenantDomainFromId: Tenant domain (raw): ${rawDomain}`);
    try {
      if (rawDomain.startsWith('http://') || rawDomain.startsWith('https://')) {
        const url = new URL(rawDomain);
        const hostname = url.hostname;
        loggingCustom(LogType.INTEGRATION_LOG, 'info', `resolveTenantDomainFromId: Extracted hostname from URL: ${hostname}`);
        return hostname;
      }
    } catch (urlError) {
      loggingCustom(LogType.INTEGRATION_LOG, 'warn', `resolveTenantDomainFromId: Failed to parse domain as URL, using as-is: ${rawDomain}`);
      // Fallback to rawDomain if URL parsing fails
    }
    loggingCustom(LogType.INTEGRATION_LOG, 'info', `resolveTenantDomainFromId: Using domain as-is (not a URL): ${rawDomain}`);
    return rawDomain;
  } catch (error) {
    loggingCustom(
      LogType.INTEGRATION_LOG,
      'error',
      `Failed to resolve tenant domain: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

function findLocalIntegrationById(id: string): IntegrationEntity | null {
  try {
    const integrations = readSchemaData<IntegrationEntity>('integrations');
    return integrations.find(integration => integration.id === id) || null;
  } catch (error) {
    loggingCustom(
      LogType.INTEGRATION_LOG,
      'warn',
      `Failed to read integrations from local storage: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

function saveLocalIntegration(updatedIntegration: IntegrationEntity): void {
  try {
    const integrations = readSchemaData<IntegrationEntity>('integrations');
    const index = integrations.findIndex(integration => integration.id === updatedIntegration.id);
    if (index === -1) {
      loggingCustom(
        LogType.INTEGRATION_LOG,
        'warn',
        `Attempted to update non-existent integration locally: ${updatedIntegration.id}`
      );
      return;
    }
    integrations[index] = updatedIntegration;
    writeSchemaData('integrations', integrations);
  } catch (error) {
    loggingCustom(
      LogType.INTEGRATION_LOG,
      'warn',
      `Failed to persist integration update locally: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Format sync message for storage
 * Extracts message from response (either message string or messages array)
 */
function formatSyncMessage(syncResponse: any): string | undefined {
  if (!syncResponse) return undefined;
  
  // Prefer single message field if available
  if (syncResponse.message) {
    return typeof syncResponse.message === 'string' 
      ? syncResponse.message 
      : JSON.stringify(syncResponse.message);
  }
  
  // Otherwise use messages array
  if (syncResponse.messages && Array.isArray(syncResponse.messages) && syncResponse.messages.length > 0) {
    return JSON.stringify(syncResponse.messages);
  }
  
  // If there's a summary with message, use that
  if (syncResponse.summary?.message) {
    return typeof syncResponse.summary.message === 'string'
      ? syncResponse.summary.message
      : JSON.stringify(syncResponse.summary.message);
  }
  
  return undefined;
}

async function updateIntegrationLastSyncedTimestamp(
  id: string,
  integration: IntegrationEntity,
  useLocalData: boolean,
  lastSyncMessage?: string
): Promise<IntegrationEntity> {
  const timestamp = new Date().toISOString();
  const updatedIntegration: IntegrationEntity = {
    ...integration,
    lastSynced: timestamp,
    lastSyncMessage: lastSyncMessage,
    updatedAt: timestamp,
    id,
  };

  if (useLocalData) {
    saveLocalIntegration(updatedIntegration);
    loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'lastSynced timestamp updated in local storage');
    return updatedIntegration;
  }

  try {
    const updateUrl = getApiUrl(`/api/data/integrations/${id}`);
    await fetch(updateUrl, {
      method: 'PUT' as any,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedIntegration),
      cache: 'no-store',
    });
    loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'lastSynced timestamp updated via data API');
  } catch (error) {
    loggingCustom(
      LogType.INTEGRATION_LOG,
      'warn',
      `Failed to update lastSynced timestamp via data API: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return updatedIntegration;
}

async function fetchIntegrationFromApi(id: string): Promise<IntegrationEntity | null> {
  loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Fetching integration with id via API: ${id}`);
  try {
    const byIdUrl = getApiUrl(`/api/data/integrations/${id}`);
    const byIdResponse = await fetch(byIdUrl, {
      method: 'GET' as any,
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (byIdResponse.ok) {
      const byIdData = await byIdResponse.json();
      if (byIdData.success && byIdData.data) {
        const integrationCandidate = Array.isArray(byIdData.data)
          ? byIdData.data[0]
          : byIdData.data?.data || byIdData.data;
        if (integrationCandidate) {
          loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Integration fetched successfully via API by ID: ${id}`);
          return integrationCandidate;
        }
      }
    } else {
      loggingCustom(
        LogType.INTEGRATION_LOG,
        'warn',
        `Integration API returned ${byIdResponse.status} when querying by ID ${id}`
      );
    }
  } catch (error) {
    loggingCustom(
      LogType.INTEGRATION_LOG,
      'warn',
      `Failed to fetch integration by ID via API: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  try {
    const listUrl = getApiUrl('/api/data/integrations');
    const listResponse = await fetch(listUrl, {
      method: 'GET' as any,
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (listResponse.ok) {
      const listData = await listResponse.json();
      if (listData.success && listData.data) {
        const integrations = Array.isArray(listData.data)
          ? listData.data
          : listData.data?.data || listData.data?.items || [];
        const integration = integrations.find((integration: IntegrationEntity) => integration.id === id) || null;
        if (integration) {
          loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Integration located via API list fallback: ${id}`);
          return integration;
        }
      }
    } else {
      loggingCustom(
        LogType.INTEGRATION_LOG,
        'warn',
        `Integration list API returned ${listResponse.status} when searching for ${id}`
      );
    }
  } catch (error) {
    loggingCustom(
      LogType.INTEGRATION_LOG,
      'error',
      `Error fetching integrations list from API: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return null;
}

/**
 * POST - Sync an integration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, tenantId, tenantIds, companyIds } = body as {
      id?: string;
      tenantId?: string | number;
      tenantIds?: string;
      companyIds?: string;
    };
    loggingCustom(
      LogType.INTEGRATION_LOG,
      'debug',
      `POST /api/integrations/sync - Received request with id: ${id}, tenantId: ${
        tenantId || 'not provided'
      }, tenantIds: ${tenantIds || 'not provided'}, companyIds: ${companyIds || 'not provided'}`,
    );
    
    // Extract authorization header from incoming request
    let authHeader = request.headers.get('authorization');
    let authToken: string | null = null;
    
    // Try to extract token from Authorization header
    if (authHeader) {
      authToken = extractTokenFromHeader(authHeader);
      if (authToken) {
        const headerPrefix = authToken.substring(0, 10);
        const headerLength = authToken.length;
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Authorization header present: ${headerPrefix}... (length: ${headerLength})`);
      }
    }
    
    // If no token from header, try to extract from cookies
    if (!authToken) {
      const cookies = request.headers.get('cookie');
      authToken = extractTokenFromCookies(cookies, AUTH_CONFIG.ACCESS_TOKEN_COOKIE);
      if (authToken) {
        const tokenPrefix = authToken.substring(0, 10);
        const tokenLength = authToken.length;
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Authorization token extracted from cookie: ${tokenPrefix}... (length: ${tokenLength})`);
        // Format as Bearer token
        authHeader = `Bearer ${authToken}`;
      } else {
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'No authorization token found in header or cookies');
      }
    } else {
      // Ensure header is in Bearer format if it's just a token
      if (authHeader && !authHeader.toLowerCase().startsWith('bearer ')) {
        authHeader = `Bearer ${authToken}`;
      } else if (!authHeader && authToken) {
        authHeader = `Bearer ${authToken}`;
      }
    }
    
    loggingCustom(LogType.INTEGRATION_LOG, 'info', `Starting integration sync for id: ${id}`);
    
    if (!id) {
      loggingCustom(LogType.INTEGRATION_LOG, 'error', 'Missing required field: id');
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: id'
        },
        { status: 400 }
      );
    }

    const useLocalData = isServerDemoMode();
    let integration: IntegrationEntity | null = null;

    if (useLocalData) {
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Attempting to resolve integration from local data store');
      integration = findLocalIntegrationById(id);
      if (integration) {
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Integration resolved from local data: ${id}`);
      } else {
        loggingCustom(
          LogType.INTEGRATION_LOG,
          'warn',
          `Integration ${id} not found in local data, falling back to API lookup`
        );
      }
    }

    if (!integration) {
      integration = await fetchIntegrationFromApi(id);
    }

    if (!integration) {
      loggingCustom(LogType.INTEGRATION_LOG, 'error', `Integration with id "${id}" not found`);
      return NextResponse.json(
        {
          success: false,
          error: `Integration with id "${id}" not found`
        },
        { status: 404 }
      );
    }

    // Enrich integration with route data from relations (HAS_FIELD_VALUE)
    // This will populate targetRoute and sourceRoute with full data including metadata.address
    try {
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Enriching integration with route data from relations');
      integration = await enrichEntityPickerFieldsFromRelations({
        schemaId: 'integrations',
        entity: integration,
      });
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Integration enriched with route data from relations');
    } catch (enrichError) {
      loggingCustom(
        LogType.INTEGRATION_LOG,
        'warn',
        `Failed to enrich integration with relations: ${enrichError instanceof Error ? enrichError.message : String(enrichError)}`
      );
      // Continue with unenriched integration
    }

    // TypeScript guard: integration should not be null at this point, but check to be safe
    if (!integration) {
      loggingCustom(LogType.INTEGRATION_LOG, 'error', `Integration became null after enrichment`);
      return NextResponse.json(
        {
          success: false,
          error: `Integration with id "${id}" not found`
        },
        { status: 404 }
      );
    }
    
    loggingCustom(LogType.INTEGRATION_LOG, 'info', `Integration found: ${integration.title || integration.name || id}`);
    loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Integration isTenantBased: ${integration.isTenantBased}, tenantId from request: ${tenantId}`);

    const tenantDomainForHeader =
      integration.isTenantBased === true ? resolveTenantDomainFromId(tenantId) : null;

    // Build query parameters for tenant and company scoping (for source routes that support it)
    const tenantIdsParam = typeof tenantIds === 'string' && tenantIds.trim().length > 0
      ? tenantIds.trim()
      : tenantId
      ? String(tenantId)
      : undefined;
    const companyIdsParam = typeof companyIds === 'string' && companyIds.trim().length > 0
      ? companyIds.trim()
      : undefined;
    
    if (integration.isTenantBased) {
      if (tenantDomainForHeader) {
        loggingCustom(LogType.INTEGRATION_LOG, 'info', `Tenant-based integration: Using tenant domain for header: ${tenantDomainForHeader}`);
      } else {
        loggingCustom(LogType.INTEGRATION_LOG, 'warn', `Tenant-based integration but no tenant domain resolved. tenantId: ${tenantId}`);
      }
    }
    
    // Extract targetRoute - handle string, object, or array (from picker fields)
    // Keep the full object if it's an object/array to preserve metadata
    loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Extracting targetRoute from integration');
    let targetRoute: string | object | null = null;
    if (typeof integration.targetRoute === 'string') {
      targetRoute = integration.targetRoute;
    } else if (Array.isArray(integration.targetRoute) && integration.targetRoute.length > 0) {
      // If it's an array (from picker multiselect), keep the first item as object to preserve metadata
      targetRoute = integration.targetRoute[0];
    } else if (integration.targetRoute && typeof integration.targetRoute === 'object') {
      // If it's an object (from picker), keep it as object to preserve metadata
      targetRoute = integration.targetRoute;
    }
    
    if (!targetRoute) {
      loggingCustom(LogType.INTEGRATION_LOG, 'error', 'Integration targetRoute is not configured or invalid');
      return NextResponse.json(
        {
          success: false,
          error: 'Integration targetRoute is not configured or invalid'
        },
        { status: 400 }
      );
    }
    
    // Resolve targetRoute to URL (handles objects with metadata, IDs, and direct URLs)
    const resolvedTargetRoute = resolveRouteToUrl(targetRoute);
    if (!resolvedTargetRoute) {
      loggingCustom(LogType.INTEGRATION_LOG, 'error', `Failed to resolve targetRoute: ${targetRoute}`);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to resolve targetRoute: ${targetRoute}`
        },
        { status: 400 }
      );
    }
    
    loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target route: ${resolvedTargetRoute}`);
    
    // Extract sourceRoute - handle string, object, or array (from picker fields)
    // Keep the full object if it's an object/array to preserve metadata
    loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Extracting sourceRoute from integration');
    let sourceRoute: string | object | null = null;
    if (typeof integration.sourceRoute === 'string') {
      sourceRoute = integration.sourceRoute;
    } else if (Array.isArray(integration.sourceRoute) && integration.sourceRoute.length > 0) {
      // If it's an array (from picker multiselect), keep the first item as object to preserve metadata
      sourceRoute = integration.sourceRoute[0];
    } else if (integration.sourceRoute && typeof integration.sourceRoute === 'object') {
      // If it's an object (from picker), keep it as object to preserve metadata
      sourceRoute = integration.sourceRoute;
    }
    
    // Resolve sourceRoute to URL (handles objects with metadata, IDs, and direct URLs)
    let resolvedSourceRoute: string | null = null;
    if (sourceRoute) {
      resolvedSourceRoute = resolveRouteToUrl(sourceRoute);
      if (resolvedSourceRoute) {
        loggingCustom(LogType.INTEGRATION_LOG, 'info', `Source route: ${resolvedSourceRoute}`);
      } else {
        loggingCustom(LogType.INTEGRATION_LOG, 'warn', `Failed to resolve sourceRoute: ${sourceRoute}`);
      }
    } else {
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'No source route configured, will call target route directly');
    }
    
    let syncResponse = null;
    let dataToSend: any = null;
    
    try {
      // Step 1: If sourceRoute exists, fetch data from it first
      if (resolvedSourceRoute) {
        loggingCustom(LogType.INTEGRATION_LOG, 'info', `Step 1: Fetching data from source route: ${resolvedSourceRoute}`);
        // Extract sourceMethod - handle string, object, or array (from picker fields)
        let sourceMethodValue: string = 'GET';
        if (typeof integration.sourceMethod === 'string') {
          sourceMethodValue = integration.sourceMethod;
        } else if (Array.isArray(integration.sourceMethod) && integration.sourceMethod.length > 0) {
          // If it's an array (from picker multiselect), get the first item's id or label
          const firstMethod = integration.sourceMethod[0];
          sourceMethodValue = firstMethod?.id || firstMethod?.label || firstMethod?.value || 'GET';
        } else if (integration.sourceMethod && typeof integration.sourceMethod === 'object') {
          sourceMethodValue = integration.sourceMethod.id || integration.sourceMethod.label || integration.sourceMethod.value || 'GET';
        }
        const sourceMethod = String(sourceMethodValue || 'GET').toUpperCase();
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Source method: ${sourceMethod}`);
        const sourceFetchOptions: RequestInit = {
          method: sourceMethod as any,
          headers: {
            'Content-Type': 'application/json',
            // Pass authorization header to source route if present
            ...(authHeader ? { 'Authorization': authHeader } : {}),
            // For tenant-based integrations, override tenant domain for source route as well
            ...(tenantDomainForHeader ? { 'x-tenant-domain': tenantDomainForHeader } : {}),
          },
        };
        
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Source route headers: ${JSON.stringify(sourceFetchOptions.headers)}`);
        
        // For POST source requests, we might need to send data
        // For now, GET is the default and most common for source routes
        if (sourceMethod === 'POST') {
          // If source is POST, we might need to send empty body or configurable body
          sourceFetchOptions.body = JSON.stringify({});
        }
        
        // Convert to absolute URL if needed
        let sourceUrl = getApiUrl(resolvedSourceRoute);
        // Append tenantIds and companyIds as query parameters when provided
        try {
          const urlObj = new URL(sourceUrl);
          if (tenantIdsParam) {
            urlObj.searchParams.set('tenantIds', tenantIdsParam);
          }
          if (companyIdsParam) {
            urlObj.searchParams.set('companyIds', companyIdsParam);
          }
          sourceUrl = urlObj.toString();
        } catch (urlError) {
          loggingCustom(
            LogType.INTEGRATION_LOG,
            'warn',
            `Failed to append tenantIds/companyIds to source URL (${sourceUrl}): ${
              urlError instanceof Error ? urlError.message : String(urlError)
            }`,
          );
        }

        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Source URL (resolved with filters): ${sourceUrl}`);
        const sourceResponse = await fetch(sourceUrl, sourceFetchOptions);
        
        if (!sourceResponse.ok) {
          loggingCustom(LogType.INTEGRATION_LOG, 'error', `Source route failed: ${sourceResponse.status} ${sourceResponse.statusText}`);
          throw new Error(`Source route failed: ${sourceResponse.statusText}`);
        }
        
        loggingCustom(LogType.INTEGRATION_LOG, 'info', `Source route response: ${sourceResponse.status} ${sourceResponse.statusText}`);
        const sourceData = await sourceResponse.json();
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Source data received: ${JSON.stringify(sourceData).substring(0, 200)}...`);
        
        // Step 2: Extract data using sourceDataPath if provided, otherwise default to "data"
        const sourceDataPath = integration.sourceDataPath || 'data';
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Extracting data using sourceDataPath: ${sourceDataPath}`);
        const extractedData = extractDataByPath(sourceData, sourceDataPath);
        if (extractedData === null || extractedData === undefined) {
          loggingCustom(LogType.INTEGRATION_LOG, 'error', `Failed to extract data from path: ${sourceDataPath}`);
          throw new Error(`Failed to extract data from path: ${sourceDataPath}`);
        }
        loggingCustom(LogType.INTEGRATION_LOG, 'info', `Data extracted successfully from path: ${sourceDataPath}`);
        
        // If targetDataPath is empty, post data directly without wrapping
        const targetDataPath = integration.targetDataPath?.trim();
        if (!targetDataPath || targetDataPath === '') {
          loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Target Data Path is empty, posting data directly without wrapping');
          dataToSend = extractedData;
        } else {
          // Wrap extracted data in an object with targetDataPath key
          loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Wrapping data with targetDataPath: ${targetDataPath}`);
          dataToSend = { [targetDataPath]: extractedData };
        }
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Data to send size: ${JSON.stringify(dataToSend).length} characters`);
      }
      
      // Step 3: POST data to targetRoute
      // If we have data from source route, always POST it to target route
      // Otherwise, use the configured targetMethod (or default to POST)
      loggingCustom(LogType.INTEGRATION_LOG, 'info', `Step 3: Calling target route: ${resolvedTargetRoute}`);
      let targetMethodValue: string = 'POST';
      if (dataToSend) {
        // When we have data from source route, always use POST
        targetMethodValue = 'POST';
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Using POST method (data available from source route)');
      } else {
        // Only use configured method if there's no data to send
        if (typeof integration.targetMethod === 'string') {
          targetMethodValue = integration.targetMethod;
        } else if (Array.isArray(integration.targetMethod) && integration.targetMethod.length > 0) {
          // If it's an array (from picker multiselect), get the first item's id or label
          const firstMethod = integration.targetMethod[0];
          targetMethodValue = firstMethod?.id || firstMethod?.label || firstMethod?.value || 'POST';
        } else if (integration.targetMethod && typeof integration.targetMethod === 'object') {
          targetMethodValue = integration.targetMethod.id || integration.targetMethod.label || integration.targetMethod.value || 'POST';
        }
      }
      const method = String(targetMethodValue || 'POST').toUpperCase();
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Target method: ${method}`);
      // Convert to absolute URL if needed
      const targetUrl = getApiUrl(resolvedTargetRoute);
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Target URL (resolved): ${targetUrl}`);
      
      // Build headers for target route
      const targetHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (tenantDomainForHeader) {
        // Use lowercase key to match default header naming, and rely on HTTP case-insensitivity
        targetHeaders['x-tenant-domain'] = tenantDomainForHeader;
        loggingCustom(
          LogType.INTEGRATION_LOG,
          'info',
          `Using tenant-based x-tenant-domain header for target route: ${tenantDomainForHeader}`
        );
      } else if (integration.isTenantBased) {
        loggingCustom(
          LogType.INTEGRATION_LOG,
          'warn',
          `Tenant-based integration but no tenant domain resolved. Headers will NOT include x-tenant-domain. tenantId: ${tenantId}`
        );
      }
      
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Target route headers: ${JSON.stringify(targetHeaders)}`);
      
      // Check if system token should be used instead of client JWT
      let finalAuthHeader: string | null = null;
      const systemToken = await getSystemTokenForTargetRoute(integration.targetRoute);
      
      if (systemToken) {
        // Use system token instead of client JWT
        finalAuthHeader = systemToken;
        loggingCustom(LogType.INTEGRATION_LOG, 'info', 'Using system token for target route authorization');
      } else if (authHeader) {
        // Fall back to client JWT, but add audienceId if available
        try {
          const audienceId = await getAudienceIdFromTargetRoute(integration.targetRoute);
          if (audienceId) {
            // Extract token from Bearer header
            const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
            // Add audienceId to the token
            const tokenWithAudience = addAudienceToToken(token, audienceId);
            finalAuthHeader = `Bearer ${tokenWithAudience}`;
            loggingCustom(LogType.INTEGRATION_LOG, 'info', `Using client JWT with audienceId: ${audienceId}`);
          } else {
            finalAuthHeader = authHeader;
            loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Using client JWT for target route authorization (no audienceId found)');
          }
        } catch (error) {
          // If adding audience fails, use original token
          finalAuthHeader = authHeader;
          loggingCustom(
            LogType.INTEGRATION_LOG,
            'warn',
            `Failed to add audienceId to token: ${error instanceof Error ? error.message : String(error)}. Using original token.`
          );
        }
      }
      
      // Pass authorization header to target route if present
      if (finalAuthHeader) {
        targetHeaders['Authorization'] = finalAuthHeader;
        const headerPrefix = finalAuthHeader.substring(0, 10);
        const headerLength = finalAuthHeader.length;
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Adding Authorization header to target route: ${headerPrefix}... (length: ${headerLength})`);
      } else {
        loggingCustom(LogType.INTEGRATION_LOG, 'warn', 'No Authorization header available to forward to target route');
      }
      
      const fetchOptions: RequestInit = {
        method: method as any,
        headers: targetHeaders,
      };
      
      // Log all headers being sent (with masked authorization)
      const loggedHeaders = { ...targetHeaders };
      if (loggedHeaders['Authorization']) {
        loggedHeaders['Authorization'] = `${finalAuthHeader?.substring(0, 10)}... (masked)`;
      }
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Target route headers: ${JSON.stringify(loggedHeaders)}`);
      
      // Include body for POST/PUT/PATCH requests when we have data
      if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && dataToSend) {
        fetchOptions.body = JSON.stringify(dataToSend);
        const bodyString = fetchOptions.body;
        const bodyLength = bodyString.length;
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Request body size: ${bodyLength} characters`);
        
        // Log body content (truncated if long)
        const maxBodyLogLength = 500;
        if (bodyLength > maxBodyLogLength) {
          loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Request body (first ${maxBodyLogLength} chars): ${bodyString.substring(0, maxBodyLogLength)}...`);
        } else {
          loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Request body: ${bodyString}`);
        }
      } else if (method === 'GET' && dataToSend) {
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Using GET method with query parameters');
        // For GET requests, append data as query parameters (fallback case)
        try {
          // Check if it's an absolute URL
          if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
            const url = new URL(targetUrl);
            if (typeof dataToSend === 'object') {
              Object.entries(dataToSend).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                  url.searchParams.append(key, String(value));
                }
              });
            }
            const urlWithParams = url.toString();
            loggingCustom(LogType.INTEGRATION_LOG, 'debug', `GET request URL with params: ${urlWithParams}`);
            const targetResponse = await fetch(urlWithParams, fetchOptions);
            
            if (!targetResponse.ok) {
              let errorResponseData: any = null;
              try {
                errorResponseData = await targetResponse.json();
                loggingCustom(LogType.INTEGRATION_LOG, 'error', `Target route failed: ${targetResponse.status} ${targetResponse.statusText}`);
                loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Error response data: ${JSON.stringify(errorResponseData).substring(0, 200)}...`);
              } catch (parseError) {
                loggingCustom(LogType.INTEGRATION_LOG, 'warn', `Failed to parse error response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
              }
              
              // Extract error message from response (check message, error, or messages)
              const errorMessage = errorResponseData?.message || errorResponseData?.error || null;
              
              // If we have messages in the error response, include them and return
              if (errorResponseData?.messages && Array.isArray(errorResponseData.messages) && errorResponseData.messages.length > 0) {
                loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target response contains ${errorResponseData.messages.length} message(s) in error response`);
                
                // Transform messages from { path, en } to { path, message: { en } } format
                const transformedMessages = errorResponseData.messages.map((msg: any) => {
                  if (msg.en && !msg.message) {
                    return {
                      path: msg.path,
                      message: { en: msg.en }
                    };
                  }
                  return msg;
                });
                
                return NextResponse.json({
                  success: false,
                  error: errorMessage || `Target route failed: ${targetResponse.statusText}`,
                  messages: transformedMessages,
                  statusCode: targetResponse.status
                }, { status: targetResponse.status });
              }
              
              // If we have a single message field, use it in the error
              if (errorMessage) {
                loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target response contains error message: ${errorMessage}`);
                return NextResponse.json({
                  success: false,
                  error: errorMessage,
                  statusCode: targetResponse.status
                }, { status: targetResponse.status });
              }
              
              throw new Error(`Target route failed: ${targetResponse.statusText}`);
            }
            
            loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target route response: ${targetResponse.status} ${targetResponse.statusText}`);
            syncResponse = await targetResponse.json();
            // Log full response if it contains failures, otherwise truncate for readability
            const responseString1 = JSON.stringify(syncResponse);
            if (syncResponse?.summary?.failures && syncResponse.summary.failures.length > 0) {
              loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Target response data (full): ${responseString1}`);
              loggingCustom(LogType.INTEGRATION_LOG, 'info', `Failures detected: ${JSON.stringify(syncResponse.summary.failures)}`);
            } else {
              const maxLogLength = 2000;
              if (responseString1.length > maxLogLength) {
                loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Target response data (first ${maxLogLength} chars): ${responseString1.substring(0, maxLogLength)}...`);
              } else {
                loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Target response data: ${responseString1}`);
              }
            }
            
            // Extract messages from target response if present
            let getResponseMessages1 = syncResponse?.messages || [];
            const getResponseMessage1 = syncResponse?.message;
            
            // Transform messages from { path, en } to { path, message: { en } } format if needed
            if (getResponseMessages1.some((msg: any) => msg.en && !msg.message)) {
              getResponseMessages1 = getResponseMessages1.map((msg: any) => {
                if (msg.en && !msg.message) {
                  return {
                    path: msg.path,
                    message: { en: msg.en }
                  };
                }
                return msg;
              });
            }
            
            if (integration) {
              const syncMessage = formatSyncMessage(syncResponse);
              integration = await updateIntegrationLastSyncedTimestamp(id, integration, useLocalData, syncMessage);
            }
            
            loggingCustom(LogType.INTEGRATION_LOG, 'info', `Integration sync completed successfully for id: ${id}`);
            
            // Build response with messages if available
            const getResponse1: any = {
              success: true,
              data: syncResponse,
              integration: integration
            };
            
            if (getResponseMessages1.length > 0) {
              getResponse1.messages = getResponseMessages1;
              loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Including ${getResponseMessages1.length} message(s) in response`);
            }
            
            if (getResponseMessage1) {
              getResponse1.message = getResponseMessage1;
              loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Including single message in response');
            }
            
            return NextResponse.json(getResponse1);
          } else {
            // Relative URL - construct with base
            const url = new URL(targetUrl, 'http://localhost');
            if (typeof dataToSend === 'object') {
              Object.entries(dataToSend).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                  url.searchParams.append(key, String(value));
                }
              });
            }
            const urlWithParams = url.pathname + url.search;
            loggingCustom(LogType.INTEGRATION_LOG, 'debug', `GET request URL with params: ${urlWithParams}`);
            const targetResponse = await fetch(getApiUrl(urlWithParams), fetchOptions);
            
            if (!targetResponse.ok) {
              let errorResponseData: any = null;
              try {
                errorResponseData = await targetResponse.json();
                loggingCustom(LogType.INTEGRATION_LOG, 'error', `Target route failed: ${targetResponse.status} ${targetResponse.statusText}`);
                loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Error response data: ${JSON.stringify(errorResponseData).substring(0, 200)}...`);
              } catch (parseError) {
                loggingCustom(LogType.INTEGRATION_LOG, 'warn', `Failed to parse error response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
              }
              
              // Extract error message from response (check message, error, or messages)
              const errorMessage = errorResponseData?.message || errorResponseData?.error || null;
              
              // If we have messages in the error response, include them and return
              if (errorResponseData?.messages && Array.isArray(errorResponseData.messages) && errorResponseData.messages.length > 0) {
                loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target response contains ${errorResponseData.messages.length} message(s) in error response`);
                
                // Transform messages from { path, en } to { path, message: { en } } format
                const transformedMessages = errorResponseData.messages.map((msg: any) => {
                  if (msg.en && !msg.message) {
                    return {
                      path: msg.path,
                      message: { en: msg.en }
                    };
                  }
                  return msg;
                });
                
                // Save error message to integration before returning
                if (integration) {
                  const errorSyncMessage = formatSyncMessage({ messages: transformedMessages, message: errorMessage });
                  await updateIntegrationLastSyncedTimestamp(id, integration, useLocalData, errorSyncMessage);
                }
                
                return NextResponse.json({
                  success: false,
                  error: errorMessage || `Target route failed: ${targetResponse.statusText}`,
                  messages: transformedMessages,
                  statusCode: targetResponse.status
                }, { status: targetResponse.status });
              }
              
              // If we have a single message field, use it in the error
              if (errorMessage) {
                loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target response contains error message: ${errorMessage}`);
                
                // Save error message to integration before returning
                if (integration) {
                  await updateIntegrationLastSyncedTimestamp(id, integration, useLocalData, errorMessage);
                }
                
                return NextResponse.json({
                  success: false,
                  error: errorMessage,
                  statusCode: targetResponse.status
                }, { status: targetResponse.status });
              }
              
              throw new Error(`Target route failed: ${targetResponse.statusText}`);
            }
            
            loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target route response: ${targetResponse.status} ${targetResponse.statusText}`);
            syncResponse = await targetResponse.json();
            // Log full response if it contains failures, otherwise truncate for readability
            const responseString2 = JSON.stringify(syncResponse);
            if (syncResponse?.summary?.failures && syncResponse.summary.failures.length > 0) {
              loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Target response data (full): ${responseString2}`);
              loggingCustom(LogType.INTEGRATION_LOG, 'info', `Failures detected: ${JSON.stringify(syncResponse.summary.failures)}`);
            } else {
              const maxLogLength = 2000;
              if (responseString2.length > maxLogLength) {
                loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Target response data (first ${maxLogLength} chars): ${responseString2.substring(0, maxLogLength)}...`);
              } else {
                loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Target response data: ${responseString2}`);
              }
            }
            
            // Extract messages from target response if present
            let getResponseMessages2 = syncResponse?.messages || [];
            const getResponseMessage2 = syncResponse?.message;
            
            // Transform messages from { path, en } to { path, message: { en } } format if needed
            if (getResponseMessages2.some((msg: any) => msg.en && !msg.message)) {
              getResponseMessages2 = getResponseMessages2.map((msg: any) => {
                if (msg.en && !msg.message) {
                  return {
                    path: msg.path,
                    message: { en: msg.en }
                  };
                }
                return msg;
              });
            }
            
            if (integration) {
              const syncMessage = formatSyncMessage(syncResponse);
              integration = await updateIntegrationLastSyncedTimestamp(id, integration, useLocalData, syncMessage);
            }
            
            loggingCustom(LogType.INTEGRATION_LOG, 'info', `Integration sync completed successfully for id: ${id}`);
            
            // Build response with messages if available
            const getResponse2: any = {
              success: true,
              data: syncResponse,
              integration: integration
            };
            
            if (getResponseMessages2.length > 0) {
              getResponse2.messages = getResponseMessages2;
              loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Including ${getResponseMessages2.length} message(s) in response`);
            }
            
            if (getResponseMessage2) {
              getResponse2.message = getResponseMessage2;
              loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Including single message in response');
            }
            
            return NextResponse.json(getResponse2);
          }
        } catch (error) {
          // If URL parsing fails, just use the original URL
          loggingCustom(LogType.INTEGRATION_LOG, 'warn', `Failed to parse URL for GET request: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      const targetResponse = await fetch(targetUrl, fetchOptions);
      
      // Parse response regardless of status to extract messages
      let errorResponseData: any = null;
      if (!targetResponse.ok) {
        try {
          errorResponseData = await targetResponse.json();
          loggingCustom(LogType.INTEGRATION_LOG, 'error', `Target route failed: ${targetResponse.status} ${targetResponse.statusText}`);
          loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Error response data: ${JSON.stringify(errorResponseData).substring(0, 200)}...`);
        } catch (parseError) {
          loggingCustom(LogType.INTEGRATION_LOG, 'warn', `Failed to parse error response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }
        
        // Extract error message from response (check message, error, or messages)
        const errorMessage = errorResponseData?.message || errorResponseData?.error || null;
        
        // If we have messages in the error response, include them and return
        if (errorResponseData?.messages && Array.isArray(errorResponseData.messages) && errorResponseData.messages.length > 0) {
          loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target response contains ${errorResponseData.messages.length} message(s) in error response`);
          
          // Transform messages from { path, en } to { path, message: { en } } format
          const transformedMessages = errorResponseData.messages.map((msg: any) => {
            if (msg.en && !msg.message) {
              return {
                path: msg.path,
                message: { en: msg.en }
              };
            }
            return msg;
          });
          
          // Save error message to integration before returning
          if (integration) {
            const errorSyncMessage = formatSyncMessage({ messages: transformedMessages, message: errorMessage });
            await updateIntegrationLastSyncedTimestamp(id, integration, useLocalData, errorSyncMessage);
          }
          
          return NextResponse.json({
            success: false,
            error: errorMessage || `Target route failed: ${targetResponse.statusText}`,
            messages: transformedMessages,
            statusCode: targetResponse.status
          }, { status: targetResponse.status });
        }
        
        // If we have a single message field, use it in the error
        if (errorMessage) {
          loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target response contains error message: ${errorMessage}`);
          
          // Save error message to integration before returning
          if (integration) {
            await updateIntegrationLastSyncedTimestamp(id, integration, useLocalData, errorMessage);
          }
          
          return NextResponse.json({
            success: false,
            error: errorMessage,
            statusCode: targetResponse.status
          }, { status: targetResponse.status });
        }
        
        // No messages, throw error as before
        throw new Error(`Target route failed: ${targetResponse.statusText}`);
      }
      
      loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target route response: ${targetResponse.status} ${targetResponse.statusText}`);
      syncResponse = await targetResponse.json();
      // Log full response if it contains failures, otherwise truncate for readability
      const responseString = JSON.stringify(syncResponse);
      if (syncResponse?.summary?.failures && syncResponse.summary.failures.length > 0) {
        loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Target response data (full): ${responseString}`);
        loggingCustom(LogType.INTEGRATION_LOG, 'info', `Failures detected: ${JSON.stringify(syncResponse.summary.failures)}`);
      } else {
        const maxLogLength = 2000;
        if (responseString.length > maxLogLength) {
          loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Target response data (first ${maxLogLength} chars): ${responseString.substring(0, maxLogLength)}...`);
        } else {
          loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Target response data: ${responseString}`);
        }
      }
      
      // Extract messages from target response if present
      if (syncResponse?.messages && syncResponse.messages.length > 0) {
        loggingCustom(LogType.INTEGRATION_LOG, 'info', `Target response contains ${syncResponse.messages.length} message(s)`);
        
        // Transform messages from { path, en } to { path, message: { en } } format if needed
        if (syncResponse.messages.some((msg: any) => msg.en && !msg.message)) {
          syncResponse.messages = syncResponse.messages.map((msg: any) => {
            if (msg.en && !msg.message) {
              return {
                path: msg.path,
                message: { en: msg.en }
              };
            }
            return msg;
          });
        }
      }
      
      if (integration) {
        const syncMessage = formatSyncMessage(syncResponse);
        integration = await updateIntegrationLastSyncedTimestamp(id, integration, useLocalData, syncMessage);
      }
      
      loggingCustom(LogType.INTEGRATION_LOG, 'info', `Integration sync completed successfully for id: ${id}`);
    } catch (error) {
      loggingCustom(LogType.INTEGRATION_LOG, 'error', `Sync request failed: ${error instanceof Error ? error.message : String(error)}`);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Sync request failed'
        },
        { status: 500 }
      );
    }
    
    // Extract messages from syncResponse if present
    let responseMessages = syncResponse?.messages || [];
    const responseMessage = syncResponse?.message;
    
    // Transform messages from { path, en } to { path, message: { en } } format if needed
    if (responseMessages.some((msg: any) => msg.en && !msg.message)) {
      responseMessages = responseMessages.map((msg: any) => {
        if (msg.en && !msg.message) {
          return {
            path: msg.path,
            message: { en: msg.en }
          };
        }
        return msg;
      });
    }
    
    // Build response with messages if available
    const response: any = {
      success: true,
      data: syncResponse,
      integration: integration
    };
    
    // Include messages from target response if present
    if (responseMessages.length > 0) {
      response.messages = responseMessages;
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', `Including ${responseMessages.length} message(s) in response`);
    }
    
    // Include single message if present
    if (responseMessage) {
      response.message = responseMessage;
      loggingCustom(LogType.INTEGRATION_LOG, 'debug', 'Including single message in response');
    }
    
    return NextResponse.json(response);
  } catch (error) {
    loggingCustom(LogType.INTEGRATION_LOG, 'error', `Failed to sync integration: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync integration'
      },
      { status: 500 }
    );
  }
}
