// Schemas API Route - Dynamic Route for individual schemas
// Serves a specific schema by ID from the JSON file

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { isDemoModeEnabled, proxySchemaRequest, normalizeSchemaData } from '../utils';
import { getCacheConfigByPath } from '@/gradian-ui/shared/configs/cache-config';
import { clearCache as clearSharedSchemaCache } from '@/gradian-ui/shared/utils/data-loader';

/**
 * Get CORS headers for cross-origin requests
 * Prepares for future API key authentication
 */
function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.FORM_EMBED_ALLOWED_ORIGINS
    ? process.env.FORM_EMBED_ALLOWED_ORIGINS.split(',')
    : ['*']; // Default to allow all for development

  // Check if origin is allowed
  const isAllowed = allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin));

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  };

  if (isAllowed && origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else if (allowedOrigins.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*';
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

// Cache for loaded schemas
let cachedSchemas: any[] | null = null;
let cacheTimestamp: number | null = null;
let cachedFileMtime: number | null = null;
// Get cache TTL from configuration (this route handles /api/schemas/:id)
// Use a placeholder ID for pattern matching - the config will match 'schemas/:id' pattern
const CACHE_CONFIG = getCacheConfigByPath('/api/schemas/placeholder-id');
const CACHE_TTL_MS = CACHE_CONFIG.ttl;

/**
 * Clear schema cache (useful for development)
 * Note: Not exported to avoid Next.js route handler type conflicts
 */
function clearSchemaCache() {
  cachedSchemas = null;
  cacheTimestamp = null;
  cachedFileMtime = null;
}

/**
 * Load schemas with caching
 * Cache is invalidated if file modification time changes or TTL expires
 */
function loadSchemas(): any[] {
  const dataPath = path.join(process.cwd(), 'data', 'all-schemas.json');
  
  if (!fs.existsSync(dataPath)) {
    return [];
  }
  
  // Check file modification time
  let currentMtime: number | null = null;
  try {
    const stats = fs.statSync(dataPath);
    currentMtime = stats.mtimeMs;
  } catch {
    // If we can't get file stats, invalidate cache and reload
    cachedFileMtime = null;
  }
  
  const now = Date.now();
  
  // Check if cache is valid:
  // 1. Cache exists
  // 2. File modification time hasn't changed
  // 3. Cache hasn't expired (TTL check)
  const fileUnchanged = cachedFileMtime !== null && currentMtime === cachedFileMtime;
  const cacheNotExpired = cacheTimestamp !== null && (now - cacheTimestamp) < CACHE_TTL_MS;
  
  if (cachedSchemas !== null && fileUnchanged && cacheNotExpired) {
    return cachedSchemas;
  }
  
  // Cache miss, expired, or file changed - read from file and update cache
  const fileContents = fs.readFileSync(dataPath, 'utf8');
  cachedSchemas = JSON.parse(fileContents);
  cacheTimestamp = now;
  cachedFileMtime = currentMtime;
  
  return cachedSchemas || [];
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
  const { 'schema-id': schemaId } = await params;

  if (!schemaId) {
    return NextResponse.json(
      { success: false, error: 'Schema ID is required' },
      { status: 400 }
    );
  }

  if (!isDemoModeEnabled()) {
    return proxySchemaRequest(
      request,
      `/api/schemas/${schemaId}${request.nextUrl.search}`
    );
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

    // Find the specific schema
    const schema = schemas.find((s: any) => s.id === schemaId);
    
    if (!schema) {
      return NextResponse.json(
        { success: false, error: `Schema with ID "${schemaId}" not found` },
        { status: 404 }
      );
    }

    // Get CORS headers
    const corsHeaders = getCorsHeaders(request);

    // Return response with cache-busting headers to prevent browser caching
    return NextResponse.json({
      success: true,
      data: schema
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Error loading schema:', error);
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
    const updatedSchema = normalizeSchemaData(updatedSchemaRaw);

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

    // Write back to file
    const dataPath = path.join(process.cwd(), 'data', 'all-schemas.json');
    fs.writeFileSync(dataPath, JSON.stringify(schemas, null, 2), 'utf8');
    
    // Clear caches to force reload on next request
    cachedSchemas = null;
    cacheTimestamp = null;
    cachedFileMtime = null;
    clearSharedSchemaCache('schemas');

    return NextResponse.json({
      success: true,
      data: schemas[schemaIndex]
    });
  } catch (error) {
    console.error('Error updating schema:', error);
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
        console.warn(`Failed to delete data for schema ${schemaId}:`, dataError);
      }

      // 2. Delete all relations involving this schema (as source or target)
      try {
        const allRelations = readAllRelations();
        const filteredRelations = allRelations.filter(
          (r: any) => r.sourceSchema !== schemaId && r.targetSchema !== schemaId
        );
        writeAllRelations(filteredRelations);
      } catch (relationError) {
        console.warn(`Failed to delete relations for schema ${schemaId}:`, relationError);
      }

      // 3. Remove the schema itself
      schemas.splice(schemaIndex, 1);
    } else {
      // Soft delete: Just set inactive (this shouldn't happen via DELETE, but handle it)
      schemas[schemaIndex] = { ...deletedSchema, inactive: true };
    }

    // Write back to file
    const dataPath = path.join(process.cwd(), 'data', 'all-schemas.json');
    fs.writeFileSync(dataPath, JSON.stringify(schemas, null, 2), 'utf8');
    
    // Clear caches to force reload on next request
    cachedSchemas = null;
    cacheTimestamp = null;
    cachedFileMtime = null;
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
      const { clearSchemaRegistryCache } = await import('@/gradian-ui/schema-manager/utils/schema-registry.server');
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
    console.error('Error deleting schema:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete schema' 
      },
      { status: 500 }
    );
  }
}

