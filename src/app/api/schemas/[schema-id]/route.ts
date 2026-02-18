// Schemas API Route - Dynamic Route for individual schemas
// Serves a specific schema by ID from the JSON file

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { isDemoModeEnabled, proxySchemaRequest, normalizeSchemaData, ensurePasswordFieldsAreSensitive } from '../utils';
import { applyMockSchemaPermissions } from '@/gradian-ui/shared/configs/mock-schema-permissions';
import { getCacheConfigByPath } from '@/gradian-ui/shared/configs/cache-config';
import { clearCache as clearSharedSchemaCache } from '@/gradian-ui/shared/utils/data-loader';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { readAllRelations } from '@/gradian-ui/shared/domain/utils/relations-storage.util';
import { readAllData } from '@/gradian-ui/shared/domain/utils/data-storage.util';
import { getValueByRole, getSingleValueByRole } from '@/gradian-ui/form-builder/form-elements/utils/field-resolver';
import { isTranslationArray } from '@/gradian-ui/shared/utils/translation-utils';

const MAX_SCHEMA_FILE_BYTES = 8 * 1024 * 1024; // 8MB safety cap
const SCHEMA_FILE_PATH = path.join(process.cwd(), 'data', 'all-schemas.json');
const SCHEMA_FILE_TMP_PATH = path.join(process.cwd(), 'data', 'all-schemas.tmp.json');

/**
 * Get CORS headers for cross-origin requests
 * Prepares for future API key authentication
 */
function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.FORM_EMBED_ALLOWED_ORIGINS
    ? process.env.FORM_EMBED_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  const isAllowed = origin ? allowedOrigins.includes(origin) : false;

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  };

  if (isAllowed && origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

/**
 * Handle OPTIONS request for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  return NextResponse.json({}, { headers: corsHeaders });
}

// Get cache TTL from configuration (this route handles /api/schemas/:id)
const CACHE_CONFIG = getCacheConfigByPath('/api/schemas/placeholder-id');
const CACHE_TTL_MS = CACHE_CONFIG.ttl;

/** Bounded per-schema cache to avoid holding the full all-schemas.json array in memory. */
const MAX_SCHEMA_CACHE_ENTRIES = 100;
interface SchemaCacheEntry {
  schema: any;
  fileMtime: number;
  timestamp: number;
}
const schemaCacheById = new Map<string, SchemaCacheEntry>();
/** LRU order: first key is oldest. */
const schemaCacheOrder: string[] = [];

/** Full-array cache (used by write paths and getRelatedApplications when loading all schemas). */
let cachedSchemas: any[] | null = null;
let cacheTimestamp: number | null = null;
let cachedFileMtime: number | null = null;

/**
 * Clear schema cache (useful for development and after PUT/DELETE).
 * Not exported to avoid Next.js route handler type conflicts.
 */
function clearSchemaCache() {
  cachedSchemas = null;
  cacheTimestamp = null;
  cachedFileMtime = null;
  schemaCacheById.clear();
  schemaCacheOrder.length = 0;
}

/**
 * Load a single schema by ID with a bounded per-schema cache (max 100 entries).
 * On cache miss reads the file once and caches the requested schema plus optional alsoCacheIds.
 * Avoids keeping the full all-schemas.json array in memory.
 * @param id - Schema ID to load
 * @param alsoCacheIds - Optional schema IDs to also cache from the same read (e.g. ['applications'])
 * @param bypassCache - If true, read from file and refresh cache
 */
function loadSchemaById(id: string, alsoCacheIds: string[] = [], bypassCache?: boolean): any | null {
  if (!fs.existsSync(SCHEMA_FILE_PATH)) {
    return null;
  }

  let currentMtime: number | null = null;
  try {
    const stats = fs.statSync(SCHEMA_FILE_PATH);
    if (stats.size > MAX_SCHEMA_FILE_BYTES) {
      throw new Error('Schemas file exceeds safe size limit');
    }
    currentMtime = stats.mtimeMs;
  } catch {
    return null;
  }

  const now = Date.now();

  if (!bypassCache) {
    const entry = schemaCacheById.get(id);
    if (entry && entry.fileMtime === currentMtime && now - entry.timestamp < CACHE_TTL_MS) {
      return entry.schema;
    }
  }

  const fileContents = fs.readFileSync(SCHEMA_FILE_PATH, 'utf8');
  if (!fileContents || fileContents.trim().length === 0) {
    return null;
  }

  const parsed = JSON.parse(fileContents);
  let normalizedSchemas: any[] = [];
  if (Array.isArray(parsed)) {
    normalizedSchemas = parsed;
  } else if (typeof parsed === 'object' && parsed !== null) {
    if (Array.isArray(parsed.data)) {
      normalizedSchemas = parsed.data;
    } else if (Object.keys(parsed).length > 0) {
      normalizedSchemas = Object.values(parsed);
    }
  }

  let requested: any = null;

  // Fill per-schema cache from this parse (up to MAX_SCHEMA_CACHE_ENTRIES); evict oldest when full
  for (const schema of normalizedSchemas) {
    if (!schema || typeof schema.id !== 'string') continue;
    const sid = String(schema.id);
    if (sid === id) requested = schema;

    while (schemaCacheById.size >= MAX_SCHEMA_CACHE_ENTRIES && schemaCacheOrder.length > 0) {
      const oldest = schemaCacheOrder.shift()!;
      schemaCacheById.delete(oldest);
    }
    if (schemaCacheById.size >= MAX_SCHEMA_CACHE_ENTRIES) continue;
    if (schemaCacheById.has(sid)) {
      const idx = schemaCacheOrder.indexOf(sid);
      if (idx !== -1) schemaCacheOrder.splice(idx, 1);
    }
    schemaCacheById.set(sid, { schema, fileMtime: currentMtime!, timestamp: now });
    schemaCacheOrder.push(sid);
  }

  return requested;
}

/**
 * Load all schemas with full-array caching (used by write paths and when full list is needed).
 * When bypassCache is true (e.g. client sent cacheBust), always read from file.
 */
function loadSchemas(bypassCache?: boolean): any[] {
  if (!fs.existsSync(SCHEMA_FILE_PATH)) {
    return [];
  }

  if (bypassCache) {
    cachedSchemas = null;
    cacheTimestamp = null;
    cachedFileMtime = null;
  }

  let currentMtime: number | null = null;
  try {
    const stats = fs.statSync(SCHEMA_FILE_PATH);
    if (stats.size > MAX_SCHEMA_FILE_BYTES) {
      throw new Error('Schemas file exceeds safe size limit');
    }
    currentMtime = stats.mtimeMs;
  } catch {
    cachedFileMtime = null;
    return [];
  }

  const now = Date.now();
  const fileUnchanged = cachedFileMtime !== null && currentMtime === cachedFileMtime;
  const cacheNotExpired = cacheTimestamp !== null && (now - cacheTimestamp) < CACHE_TTL_MS;

  if (cachedSchemas !== null && fileUnchanged && cacheNotExpired) {
    return cachedSchemas;
  }

  const fileContents = fs.readFileSync(SCHEMA_FILE_PATH, 'utf8');
  if (!fileContents || fileContents.trim().length === 0) {
    cachedSchemas = [];
    cacheTimestamp = now;
    cachedFileMtime = currentMtime;
    return [];
  }

  const parsed = JSON.parse(fileContents);
  let normalizedSchemas: any[] = [];
  if (Array.isArray(parsed)) {
    normalizedSchemas = parsed;
  } else if (typeof parsed === 'object' && parsed !== null) {
    if (Array.isArray(parsed.data)) {
      normalizedSchemas = parsed.data;
    } else if (Object.keys(parsed).length > 0) {
      normalizedSchemas = Object.values(parsed);
    }
  }

  cachedSchemas = normalizedSchemas;
  cacheTimestamp = now;
  cachedFileMtime = currentMtime;
  return cachedSchemas;
}

function writeSchemasAtomically(schemas: any[]): void {
  const payload = JSON.stringify(schemas, null, 2);
  fs.writeFileSync(SCHEMA_FILE_TMP_PATH, payload, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(SCHEMA_FILE_TMP_PATH, SCHEMA_FILE_PATH);
}

/**
 * Get related applications for a schema
 * Uses the same method as /api/data/all-relations to find applications
 * that have a HAS_SCHEMA relation to this schema
 *
 * Relation structure: application (source) -> schema (target) with relationTypeId "HAS_SCHEMA"
 *
 * NOTE: Application names can now be either:
 * - a plain string, or
 * - a multilingual translation array like [{ en: "..." }, { fa: "..." }, ...]
 *
 * We preserve multilingual structures instead of stringifying them so that
 * the frontend can resolve them based on the active language (similar to menu titles).
 */
function getRelatedApplications(
  schemaId: string,
  tenantIds?: string[],
): Array<{ id: string; name: string | Array<Record<string, string>> | Record<string, string>; icon?: string }> {
  try {
    // Read all relations
    const allRelations = readAllRelations();
    
    // Filter relations where:
    // - targetSchema is "schemas" and targetId is the schemaId (schema is the target)
    // - sourceSchema is "applications" (application is the source)
    // - relationTypeId is "HAS_SCHEMA"
    // Note: We include inactive relations to show all applications that have been linked,
    // even if the relation was later marked as inactive (for historical context)
    const filteredRelations = allRelations.filter((r) => {
      return (
        r.targetSchema === 'schemas' &&
        r.targetId === schemaId &&
        r.sourceSchema === 'applications' &&
        r.relationTypeId === 'HAS_SCHEMA'
      );
    });

    if (filteredRelations.length === 0) {
      return [];
    }

    // Read all data to get application entities
    const allData = readAllData();
    const applications = allData['applications'] || [];

    // Get application IDs from relations (sourceId is the application ID)
    const applicationIds = new Set<string>(
      filteredRelations.map((r) => r.sourceId).filter((id): id is string => Boolean(id))
    );

    // Get application schema to resolve name and icon fields (use per-schema cache)
    const applicationSchema = loadSchemaById('applications');

    // Build result array with id, name, and icon
    const result: Array<{
      id: string;
      name: string | Array<Record<string, string>> | Record<string, string>;
      icon?: string;
    }> = [];
    
    for (const applicationId of applicationIds) {
      const application = applications.find((app: any) => app.id === applicationId);
      
      if (application) {
        // Filter by tenant if provided
        if (tenantIds && tenantIds.length > 0) {
          const appTenantId = application.companyId || application.tenantId;
          if (appTenantId && !tenantIds.includes(appTenantId)) {
            continue;
          }
        }

        // Get name and icon: prefer raw application.name when it's a translation array (same format as all-data.json).
        const icon = applicationSchema
          ? (getSingleValueByRole(applicationSchema, application, 'icon') || application.icon)
          : application.icon;

        let name: string | Array<Record<string, string>> | Record<string, string>;
        const rawNameFromData = application.name;
        if (isTranslationArray(rawNameFromData)) {
          name = rawNameFromData;
        } else {
          const resolved =
            applicationSchema
              ? (getValueByRole(applicationSchema, application, 'title') || application.name || application.title || applicationId)
              : (application.name || application.title || applicationId);
          if (Array.isArray(resolved)) {
            name = resolved as Array<Record<string, string>>;
          } else if (resolved && typeof resolved === 'object') {
            name = resolved as Record<string, string>;
          } else if (typeof resolved === 'string') {
            name = resolved;
          } else if (resolved != null) {
            name = String(resolved);
          } else {
            name = applicationId;
          }
        }

        result.push({
          id: applicationId,
          name,
          icon: icon ? String(icon) : undefined,
        });
      }
    }

    return result;
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'warn',
      `[API] Failed to get related applications for schema "${schemaId}": ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

/**
 * GET - Get a specific schema by ID
 * Example: 
 * - GET /api/schemas/vendors - returns only vendors schema
 * - GET /api/schemas/tenders - returns only tenders schema
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ 'schema-id': string }> }
) {
  // Check authentication (unless route is excluded)
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return 401 if not authenticated
  }
  
  const { 'schema-id': schemaId } = await params;

  if (!schemaId) {
    return NextResponse.json(
      { success: false, error: 'Schema ID is required' },
      { status: 400 }
    );
  }

  if (!isDemoModeEnabled()) {
    // Try to proxy to backend first
    const proxyResponse = await proxySchemaRequest(
      request,
      `/api/schemas/${schemaId}${request.nextUrl.search}`
    );
    
    // If backend returns success (2xx), return it immediately
    if (proxyResponse.status >= 200 && proxyResponse.status < 300) {
      return proxyResponse;
    }
    
    // If backend returns 404 or 5xx error, try to fallback to local schema file
    if (proxyResponse.status === 404 || (proxyResponse.status >= 500 && proxyResponse.status < 600)) {
      try {
        // Clone the response to read it without consuming the original
        const clonedResponse = proxyResponse.clone();
        let proxyData: any = null;
        try {
          proxyData = await clonedResponse.json();
        } catch {
          // If response is not JSON, treat as error
        }
        
        // If backend explicitly says schema not found or returns 404, try local fallback
        if (proxyResponse.status === 404 || (proxyData && proxyData.success === false)) {
          loggingCustom(
            LogType.INFRA_LOG,
            'warn',
            `[Schema API] Backend returned ${proxyResponse.status} for schema "${schemaId}", attempting local fallback`
          );
          
          // Fallback to local schema file
          try {
            const schemas = loadSchemas();
            const schema = schemas.find((s: any) => s.id === schemaId);
            
            if (schema) {
              loggingCustom(
                LogType.INFRA_LOG,
                'info',
                `[Schema API] Found schema "${schemaId}" in local fallback`
              );
              
              // Get tenantIds from query params if available
              const searchParams = request.nextUrl.searchParams;
              const tenantIdsParam = searchParams.get('tenantIds');
              const tenantIds = tenantIdsParam
                ?.split(',')
                .map((id) => id.trim())
                .filter((id) => id.length > 0);
              
              // Get related applications for this schema
              const relatedApplications = getRelatedApplications(schemaId, tenantIds);
              
              // Add applications and mock permissions to response
              const responseData = applyMockSchemaPermissions({
                ...schema,
                applications: relatedApplications,
              });
              
              const corsHeaders = getCorsHeaders(request);
              return NextResponse.json({
                success: true,
                data: responseData
              }, {
                headers: {
                  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                  'Pragma': 'no-cache',
                  'Expires': '0',
                  ...corsHeaders,
                },
              });
            } else {
              loggingCustom(
                LogType.INFRA_LOG,
                'warn',
                `[Schema API] Schema "${schemaId}" not found in local fallback either`
              );
            }
          } catch (loadError) {
            loggingCustom(
              LogType.INFRA_LOG,
              'error',
              `[Schema API] Failed to load local schemas for fallback: ${loadError instanceof Error ? loadError.message : String(loadError)}`
            );
          }
        }
      } catch (fallbackError) {
        // If fallback fails, log and return original proxy response
        loggingCustom(
          LogType.INFRA_LOG,
          'warn',
          `[Schema API] Fallback failed for schema "${schemaId}": ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
        );
      }
    }
    
    // Return proxy response (either success or error)
    return proxyResponse;
  }

  try {
    // Bypass in-memory cache when client sends cache-bust (e.g. builder refresh)
    const searchParams = request.nextUrl.searchParams;
    const hasCacheBust = searchParams.has('cacheBust') || searchParams.has('_t');
    const schema = loadSchemaById(schemaId, ['applications'], hasCacheBust);
    
    if (!schema) {
      return NextResponse.json(
        { success: false, error: `Schema with ID "${schemaId}" not found` },
        { status: 404 }
      );
    }

    // Get tenantIds from query params if available (searchParams already declared above)
    const tenantIdsParam = searchParams.get('tenantIds');
    const tenantIds = tenantIdsParam
      ?.split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
    
    // Get related applications for this schema
    const relatedApplications = getRelatedApplications(schemaId, tenantIds);
    
    // Add applications and mock permissions to response
    const responseData = applyMockSchemaPermissions({
      ...schema,
      applications: relatedApplications,
    });

    // Get CORS headers
    const corsHeaders = getCorsHeaders(request);

    // Return response with cache-busting headers to prevent browser caching
    return NextResponse.json({
      success: true,
      data: responseData
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...corsHeaders,
      },
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error loading schema: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to load schema' 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update a specific schema by ID
 * Example: PUT /api/schemas/vendors - updates the vendors schema
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ 'schema-id': string }> }
) {
  const { 'schema-id': schemaId } = await params;

  if (!schemaId) {
    return NextResponse.json(
      { success: false, error: 'Schema ID is required' },
      { status: 400 }
    );
  }

  if (!isDemoModeEnabled()) {
    const updatedSchemaRaw = await request.json();
    // Normalize nested fields (e.g., parse repeatingConfig JSON strings to objects)
    const updatedSchema = normalizeSchemaData(updatedSchemaRaw);
    return proxySchemaRequest(request, `/api/schemas/${schemaId}`, {
      body: updatedSchema,
      method: 'PUT',
    });
  }

  try {
    const updatedSchemaRaw = await request.json();

    // Normalize nested fields (e.g., parse repeatingConfig JSON strings to objects)
    // Also ensure password fields are marked as sensitive
    const updatedSchema = ensurePasswordFieldsAreSensitive(normalizeSchemaData(updatedSchemaRaw));

    // Load schemas (with caching)
    const schemas = loadSchemas();
    
    if (!schemas || schemas.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Schemas file not found or empty' },
        { status: 404 }
      );
    }

    // Find the schema index
    const schemaIndex = schemas.findIndex((s: any) => s.id === schemaId);
    
    if (schemaIndex === -1) {
      return NextResponse.json(
        { success: false, error: `Schema with ID "${schemaId}" not found` },
        { status: 404 }
      );
    }

    // Update the schema
    schemas[schemaIndex] = { ...schemas[schemaIndex], ...updatedSchema };

    // Write back to file atomically
    writeSchemasAtomically(schemas);
    
    // Clear caches to force reload on next request
    clearSchemaCache();
    clearSharedSchemaCache('schemas');

    return NextResponse.json({
      success: true,
      data: schemas[schemaIndex]
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error updating schema: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update schema' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a specific schema by ID
 * Example: 
 * - DELETE /api/schemas/vendors - soft delete (sets inactive)
 * - DELETE /api/schemas/vendors?hardDelete=true - hard delete (removes schema, data, and relations)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ 'schema-id': string }> }
) {
  // Check authentication (unless route is excluded)
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return 401 if not authenticated
  }
  const { 'schema-id': schemaId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const hardDelete = searchParams.get('hardDelete') === 'true';

  if (!schemaId) {
    return NextResponse.json(
      { success: false, error: 'Schema ID is required' },
      { status: 400 }
    );
  }

  if (!isDemoModeEnabled()) {
    return proxySchemaRequest(request, `/api/schemas/${schemaId}${hardDelete ? '?hardDelete=true' : ''}`, {
      method: 'DELETE',
    });
  }

  try {
    // Load schemas (with caching)
    const schemas = loadSchemas();
    
    if (!schemas || schemas.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Schemas file not found or empty' },
        { status: 404 }
      );
    }

    // Find the schema index
    const schemaIndex = schemas.findIndex((s: any) => s.id === schemaId);
    
    if (schemaIndex === -1) {
      return NextResponse.json(
        { success: false, error: `Schema with ID "${schemaId}" not found` },
        { status: 404 }
      );
    }

    const deletedSchema = schemas[schemaIndex];

    if (hardDelete) {
      // Hard delete: Remove schema, all its data, and all relations
      const { readAllData, writeAllData } = await import('@/gradian-ui/shared/domain/utils/data-storage.util');
      const { readAllRelations, writeAllRelations } = await import('@/gradian-ui/shared/domain/utils/relations-storage.util');

      // 1. Delete all data for this schema
      try {
        const allData = readAllData();
        if (allData[schemaId]) {
          delete allData[schemaId];
          writeAllData(allData);
        }
      } catch (dataError) {
        loggingCustom(
          LogType.INFRA_LOG,
          'warn',
          `Failed to delete data for schema ${schemaId}: ${dataError instanceof Error ? dataError.message : String(dataError)}`,
        );
      }

      // 2. Delete all relations involving this schema (as source or target)
      try {
        const allRelations = readAllRelations();
        const filteredRelations = allRelations.filter(
          (r: any) => r.sourceSchema !== schemaId && r.targetSchema !== schemaId
        );
        writeAllRelations(filteredRelations);
      } catch (relationError) {
        loggingCustom(
          LogType.INFRA_LOG,
          'warn',
          `Failed to delete relations for schema ${schemaId}: ${relationError instanceof Error ? relationError.message : String(relationError)}`,
        );
      }

      // 3. Remove the schema itself
      schemas.splice(schemaIndex, 1);
    } else {
      // Soft delete: Just set inactive (this shouldn't happen via DELETE, but handle it)
      schemas[schemaIndex] = { ...deletedSchema, inactive: true };
    }

    // Write back to file atomically
    writeSchemasAtomically(schemas);
    
    // Clear caches to force reload on next request
    clearSchemaCache();
    clearSharedSchemaCache('schemas');

    // Clear all schema-related caches directly
    try {
      // Clear schema-loader cache
      const { clearSchemaCache: clearSchemaLoaderCache } = await import('@/gradian-ui/schema-manager/utils/schema-loader');
      clearSchemaLoaderCache();
    } catch (error) {
      console.warn('Could not clear schema-loader cache:', error);
    }

    try {
      // Clear schema-registry cache
      const { clearSchemaCache: clearSchemaRegistryCache } = await import('@/gradian-ui/schema-manager/utils/schema-registry.server');
      clearSchemaRegistryCache();
    } catch (error) {
      console.warn('Could not clear schema-registry cache:', error);
    }

    try {
      // Clear companies-loader cache (in case schema was companies-related)
      const { clearCompaniesCache } = await import('@/gradian-ui/shared/utils/companies-loader');
      clearCompaniesCache();
    } catch (error) {
      console.warn('Could not clear companies-loader cache:', error);
    }

    return NextResponse.json({
      success: true,
      data: deletedSchema,
      message: hardDelete 
        ? `Schema "${schemaId}" and all its data have been permanently deleted`
        : `Schema "${schemaId}" deleted successfully`
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error deleting schema: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete schema' 
      },
      { status: 500 }
    );
  }
}

