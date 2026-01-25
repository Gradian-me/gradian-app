// Schemas API Route
// Serves all schemas from the JSON file

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { isDemoModeEnabled, proxySchemaRequest, normalizeSchemaData, ensurePasswordFieldsAreSensitive } from './utils';
import { SCHEMA_SUMMARY_EXCLUDED_KEYS } from '@/gradian-ui/shared/configs/general-config';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { calculateSchemaStatistics } from '@/gradian-ui/schema-manager/utils/schema-statistics-utils';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { readAllRelations } from '@/gradian-ui/shared/domain/utils/relations-storage.util';
import { readAllData } from '@/gradian-ui/shared/domain/utils/data-storage.util';
import { getValueByRole, getSingleValueByRole } from '@/gradian-ui/form-builder/form-elements/utils/field-resolver';

const SCHEMA_SUMMARY_EXCLUDED_KEY_SET = new Set<string>(SCHEMA_SUMMARY_EXCLUDED_KEYS);
const MAX_SCHEMA_FILE_BYTES = 8 * 1024 * 1024; // 8MB safety cap
const SCHEMA_FILE_PATH = path.join(process.cwd(), 'data', 'all-schemas.json');
const SCHEMA_FILE_TMP_PATH = path.join(process.cwd(), 'data', 'all-schemas.tmp.json');

function buildSchemaSummary<T extends Record<string, any>>(schema: T, includeStatistics: boolean = false): T {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return schema;
  }

  const fieldsCount =
    Array.isArray((schema as Record<string, any>).fields) ? (schema as Record<string, any>).fields.length : undefined;
  const sectionsCount =
    Array.isArray((schema as Record<string, any>).sections) ? (schema as Record<string, any>).sections.length : undefined;

  const summary = Object.keys(schema).reduce<Record<string, any>>((acc, key) => {
    if (!SCHEMA_SUMMARY_EXCLUDED_KEY_SET.has(key)) {
      acc[key] = schema[key];
    }
    return acc;
  }, {});

  // Always surface tenant scope + sync strategy in summaries so the builder table can show them.
  summary.applyToAllTenants = schema.applyToAllTenants ?? false;
  summary.relatedTenants = Array.isArray(schema.relatedTenants) ? schema.relatedTenants : [];
  summary.syncStrategy = schema.syncStrategy ?? 'schema-only';
  summary.syncToDatabases = Array.isArray(schema.syncToDatabases) ? schema.syncToDatabases : [];

  if (typeof fieldsCount === 'number') {
    summary.fieldsCount = fieldsCount;
  }

  if (typeof sectionsCount === 'number') {
    summary.sectionsCount = sectionsCount;
  }

  // Include statistics if requested
  if (includeStatistics) {
    const schemaId = schema.id as string;
    if (schemaId) {
      try {
        // Calculate records and size from all-data.json
        const calculatedStats = calculateSchemaStatistics(schemaId);
        
        // Merge with existing statistics (preserve hasPartition and isIndexed from schema if available)
        summary.statistics = {
          hasPartition: schema.statistics?.hasPartition ?? false,
          isIndexed: schema.statistics?.isIndexed ?? false,
          records: calculatedStats.records,
          size: calculatedStats.size, // in megabytes
          maxUpdatedAt: calculatedStats.maxUpdatedAt, // ISO date string or null
        };
      } catch (error) {
        loggingCustom(
          LogType.INFRA_LOG,
          'warn',
          `[API] Failed to calculate statistics for schema "${schemaId}": ${error instanceof Error ? error.message : String(error)}`,
        );
        // Fallback to defaults if calculation fails
        summary.statistics = schema.statistics || {
          hasPartition: false,
          isIndexed: false,
          records: 0,
          size: 0, // in megabytes
          maxUpdatedAt: null,
        };
      }
    } else {
      // Fallback if no schema ID
      summary.statistics = schema.statistics || {
        hasPartition: false,
        isIndexed: false,
        records: 0,
        size: 0, // in megabytes
        maxUpdatedAt: null,
      };
    }
  }

  return summary as T;
}

/**
 * Clear schema cache (no-op, kept for compatibility)
 * Note: Not exported to avoid Next.js route handler type conflicts
 */
function clearSchemaCache() {
  // No-op: caching is disabled
}

/**
 * Load schemas (always fresh, no caching)
 */
async function loadSchemas(): Promise<any[]> {
  if (!fs.existsSync(SCHEMA_FILE_PATH)) {
    loggingCustom(
      LogType.INFRA_LOG,
      'warn',
      `[API] Schemas file not found at: ${SCHEMA_FILE_PATH}`,
    );
    return [];
  }
  
  try {
    const { size } = fs.statSync(SCHEMA_FILE_PATH);
    if (size > MAX_SCHEMA_FILE_BYTES) {
      throw new Error('Schemas file exceeds safe size limit');
    }

    const fileContents = fs.readFileSync(SCHEMA_FILE_PATH, 'utf8');
    
    // Check if file is empty or just whitespace
    if (!fileContents || fileContents.trim().length === 0) {
      loggingCustom(
        LogType.INFRA_LOG,
        'warn',
        `[API] Schemas file is empty at: ${SCHEMA_FILE_PATH}`,
      );
      return [];
    }
    
    const parsed = JSON.parse(fileContents);
    
    // Ensure we return an array
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    // If it's an object, try to extract an array from it
    if (typeof parsed === 'object' && parsed !== null) {
      if (Array.isArray(parsed.data)) {
        return parsed.data;
      }
      // If it's an object with schema IDs as keys, convert to array
      if (Object.keys(parsed).length > 0) {
        return Object.values(parsed);
      }
    }
    
    loggingCustom(
      LogType.INFRA_LOG,
      'warn',
      `[API] Schemas file contains invalid data format at: ${SCHEMA_FILE_PATH}`,
    );
    return [];
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `[API] Error parsing schemas file at ${SCHEMA_FILE_PATH}: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw new Error(`Failed to parse schemas file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
 */
function getRelatedApplications(schemaId: string, tenantIds?: string[]): Array<{ id: string; name: string; icon?: string }> {
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

    // Get application schema to resolve name and icon fields
    const schemas = loadSchemasSync();
    const applicationSchema = schemas.find((s: any) => s.id === 'applications');

    // Build result array with id, name, and icon
    const result: Array<{ id: string; name: string; icon?: string }> = [];
    
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

        // Get name and icon using field roles
        // name field has role "title" in applications schema
        // icon field has role "icon" in applications schema
        const name = applicationSchema
          ? (getValueByRole(applicationSchema, application, 'title') || application.name || application.title || applicationId)
          : (application.name || application.title || applicationId);
        
        const icon = applicationSchema
          ? (getSingleValueByRole(applicationSchema, application, 'icon') || application.icon)
          : application.icon;

        result.push({
          id: applicationId,
          name: typeof name === 'string' ? name : String(name),
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
 * Synchronous version of loadSchemas for use in helper functions
 */
function loadSchemasSync(): any[] {
  if (!fs.existsSync(SCHEMA_FILE_PATH)) {
    return [];
  }
  
  try {
    const { size } = fs.statSync(SCHEMA_FILE_PATH);
    if (size > MAX_SCHEMA_FILE_BYTES) {
      return [];
    }

    const fileContents = fs.readFileSync(SCHEMA_FILE_PATH, 'utf8');
    
    if (!fileContents || fileContents.trim().length === 0) {
      return [];
    }
    
    const parsed = JSON.parse(fileContents);
    
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    if (typeof parsed === 'object' && parsed !== null) {
      if (Array.isArray(parsed.data)) {
        return parsed.data;
      }
      if (Object.keys(parsed).length > 0) {
        return Object.values(parsed);
      }
    }
    
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * GET - Get all schemas or a specific schema by ID
 * Example: 
 * - GET /api/schemas - returns all schemas
 * - GET /api/schemas?id=vendors - returns only vendors schema
 */
export async function GET(request: NextRequest) {
  // Check authentication (unless route is excluded)
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return 401 if not authenticated
  }
  
  const searchParams = request.nextUrl.searchParams;

  try {
    // In live mode, first try to proxy to backend with all query params preserved.
    // If backend is unavailable (404 or 5xx), fall back to local schemas.json using
    // the same query params (id, schemaIds, tenantIds, summary, includeStatistics, etc.).
    if (!isDemoModeEnabled()) {
      const targetPath = `/api/schemas${request.nextUrl.search}`;
      const proxyResponse = await proxySchemaRequest(request, targetPath);

      // If backend returns success (2xx), return it immediately
      if (proxyResponse.status >= 200 && proxyResponse.status < 300) {
        return proxyResponse;
      }

      // If backend returns 404 or 5xx error, log and try local fallback
      if (proxyResponse.status === 404 || (proxyResponse.status >= 500 && proxyResponse.status < 600)) {
        try {
          const cloned = proxyResponse.clone();
          let proxyData: any = null;
          try {
            proxyData = await cloned.json();
          } catch {
            // Non‑JSON or empty body – just treat as generic error
          }

          loggingCustom(
            LogType.INFRA_LOG,
            'warn',
            `[API] /api/schemas backend returned ${proxyResponse.status} (summary=${searchParams.get('summary')}, includeStatistics=${searchParams.get('includeStatistics')}, tenantIds=${searchParams.get('tenantIds') || 'none'}) – attempting local fallback from filesystem`
          );
          // Fall through to local filesystem logic below
        } catch (fallbackError) {
          loggingCustom(
            LogType.INFRA_LOG,
            'warn',
            `[API] /api/schemas fallback preparation failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
          );
          // If fallback setup fails, return original proxy response
          return proxyResponse;
        }
      } else {
        // Non‑404/5xx errors (e.g. 401/403/422) should propagate from backend
        return proxyResponse;
      }
    }
    const schemaId = searchParams.get('id');
    const schemaIdsParam = searchParams.get('schemaIds');
    const tenantIdsParam = searchParams.get('tenantIds');
    const summaryParam = searchParams.get('summary');
    const isSummaryRequested = summaryParam === 'true' || summaryParam === '1';
    const includeStatisticsParam = searchParams.get('includeStatistics');
    const includeStatistics = includeStatisticsParam === 'true' || includeStatisticsParam === '1';
    
    // Get hostname to check if we're on localhost
    const hostHeader = request.headers.get('host');
    const xForwardedHost = request.headers.get('x-forwarded-host');
    const nextUrlHostname = request.nextUrl?.hostname;
    const rawHost = xForwardedHost || hostHeader || nextUrlHostname || '';
    const normalizedHost = rawHost.trim().toLowerCase().split(':')[0];
    const isLocalhost = normalizedHost === 'localhost' || normalizedHost === '127.0.0.1' || normalizedHost.startsWith('localhost:');
    
    // Require tenantIds always when host is not localhost
    if (!isLocalhost) {
      if (!tenantIdsParam || tenantIdsParam.trim().length === 0) {
        loggingCustom(
          LogType.INFRA_LOG,
          'warn',
          `[API] /api/schemas called without tenantIds on non-localhost host: ${normalizedHost}`,
        );
        return NextResponse.json(
          {
            success: false,
            error: 'tenantIds parameter is required on non-localhost hosts',
            message: 'The tenantIds query parameter must be provided to filter schemas by tenant.',
          },
          { status: 400 }
        );
      }
    }
    
    // Log for debugging
    if (includeStatistics) {
      loggingCustom(
        LogType.INFRA_LOG,
        'info',
        `[API] /api/schemas called with includeStatistics=true`,
      );
    }
    const tenantIds = tenantIdsParam
      ?.split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
    const hasTenantFilter = Array.isArray(tenantIds) && tenantIds.length > 0;

    const matchesTenantFilter = (schema: any) => {
      // When no tenant filter is provided, all schemas are visible.
      if (!hasTenantFilter) return true;
      // System schemas are always visible for any tenantIds/companyIds.
      if (schema?.schemaType === 'system') return true;
      // Non-system schemas: respect applyToAllTenants and relatedTenants configuration.
      if (schema?.applyToAllTenants) return true;
      const related = Array.isArray(schema?.relatedTenants)
        ? schema.relatedTenants
            .filter(Boolean)
            .map((item: any) => {
              if (typeof item === 'string') return item;
              if (item?.id) return `${item.id}`;
              return undefined;
            })
            .filter(Boolean) as string[]
        : [];
      if (related.length === 0) return false;
      return related.some((id: string) => tenantIds.includes(id));
    };

    // Load schemas (always fresh, no caching)
    const schemas = await loadSchemas();
    
    if (!schemas || schemas.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Schemas file not found or empty' },
        { status: 404 }
      );
    }

    // If multiple schema IDs requested, return only those schemas
    if (schemaIdsParam) {
      const schemaIds = schemaIdsParam
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
      const uniqueSchemaIds = Array.from(new Set(schemaIds));

      const matchedSchemas = uniqueSchemaIds
        .map((id) => schemas.find((s: any) => s.id === id))
        .filter((schema): schema is any => Boolean(schema) && matchesTenantFilter(schema));
      const responseData = isSummaryRequested
        ? matchedSchemas.map((schema) => buildSchemaSummary(schema, includeStatistics))
        : matchedSchemas;

      // Add applications to each schema
      const schemasWithApplications = responseData.map((schema: any) => {
        const relatedApplications = getRelatedApplications(schema.id, tenantIds);
        return {
          ...schema,
          applications: relatedApplications,
        };
      });

      return NextResponse.json({
        success: true,
        data: schemasWithApplications,
        meta: {
          requestedIds: uniqueSchemaIds,
          returnedCount: matchedSchemas.length,
        },
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // If specific schema ID requested, return only that schema
    if (schemaId) {
      const schema = schemas.find((s: any) => s.id === schemaId);
      
      if (!schema || !matchesTenantFilter(schema)) {
        return NextResponse.json(
          { success: false, error: `Schema with ID "${schemaId}" not found` },
          { status: 404 }
        );
      }

      const responseSchema = isSummaryRequested ? buildSchemaSummary(schema, includeStatistics) : schema;

      // Get related applications for this schema
      const relatedApplications = getRelatedApplications(schemaId, tenantIds);
      
      // Add applications to response
      const responseData = {
        ...responseSchema,
        applications: relatedApplications,
      };

      return NextResponse.json({
        success: true,
        data: responseData
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // Return all schemas with cache-busting headers
    const filteredSchemas = hasTenantFilter ? schemas.filter(matchesTenantFilter) : schemas;
    const responseSchemas = isSummaryRequested
      ? filteredSchemas.map((schema) => buildSchemaSummary(schema, includeStatistics))
      : filteredSchemas;

    // Add applications to each schema
    const schemasWithApplications = responseSchemas.map((schema: any) => {
      const relatedApplications = getRelatedApplications(schema.id, tenantIds);
      return {
        ...schema,
        applications: relatedApplications,
      };
    });

    return NextResponse.json({
      success: true,
      data: schemasWithApplications
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error loading schemas: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to load schemas' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new schema or multiple schemas
 * Example: 
 * - POST /api/schemas - creates a new schema (single object)
 * - POST /api/schemas - creates multiple schemas (array of objects)
 */
export async function POST(request: NextRequest) {
  // Check authentication (unless route is excluded)
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return 401 if not authenticated
  }
  
  try {
    const requestData = await request.json();

    // Normalize nested fields (e.g., parse repeatingConfig JSON strings to objects)
    // Also ensure password fields are marked as sensitive
    const normalizedRequestData = Array.isArray(requestData)
      ? requestData.map(schema => {
          const normalized = normalizeSchemaData(schema);
          return ensurePasswordFieldsAreSensitive(normalized);
        })
      : ensurePasswordFieldsAreSensitive(normalizeSchemaData(requestData));

    // Debug: Log if repeatingConfig was normalized (in development)
    if (process.env.NODE_ENV === 'development') {
      const checkNormalization = (schema: any, path = '') => {
        if (schema?.sections) {
          schema.sections.forEach((section: any, idx: number) => {
            if (section.repeatingConfig) {
              const isString = typeof section.repeatingConfig === 'string';
              if (isString) {
                loggingCustom(
                  LogType.INFRA_LOG,
                  'warn',
                  `[POST /api/schemas] repeatingConfig is still a string at ${path}sections[${idx}].repeatingConfig: ${section.repeatingConfig.substring(0, 100)}`,
                );
              } else {
                loggingCustom(
                  LogType.INFRA_LOG,
                  'info',
                  `[POST /api/schemas] repeatingConfig normalized at ${path}sections[${idx}].repeatingConfig`,
                );
              }
            }
          });
        }
      };
      if (Array.isArray(normalizedRequestData)) {
        normalizedRequestData.forEach((schema, idx) => checkNormalization(schema, `[${idx}].`));
      } else {
        checkNormalization(normalizedRequestData);
      }
    }

    // Normalize to array: if single object, wrap it in an array
    const schemasToCreate = Array.isArray(normalizedRequestData) ? normalizedRequestData : [normalizedRequestData];

    // Validate that we received valid schema objects
    if (!schemasToCreate || schemasToCreate.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: must be a schema object or an array of schema objects' },
        { status: 400 }
      );
    }

    // Validate each schema
    for (let i = 0; i < schemasToCreate.length; i++) {
      const schema = schemasToCreate[i];
      
      if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
        return NextResponse.json(
          { success: false, error: `Invalid schema at index ${i}: must be an object` },
          { status: 400 }
        );
      }

      if (!schema.id || typeof schema.id !== 'string') {
        return NextResponse.json(
          { success: false, error: `Invalid schema at index ${i}: missing or invalid "id" field` },
          { status: 400 }
        );
      }
    }

    if (!isDemoModeEnabled()) {
      return proxySchemaRequest(request, '/api/schemas', { body: normalizedRequestData });
    }

    // Load schemas (with caching)
    const schemas = await loadSchemas();
    
    if (!schemas || schemas.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Schemas file not found or empty' },
        { status: 404 }
      );
    }

    // Check for duplicate IDs in the request
    const requestIds = schemasToCreate.map(s => s.id);
    const duplicateIds = requestIds.filter((id, index) => requestIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      return NextResponse.json(
        { success: false, error: `Duplicate schema IDs in request: ${duplicateIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if any schema with same ID already exists
    const existingSchemas: any[] = [];
    const newSchemas: any[] = [];
    
    for (const newSchema of schemasToCreate) {
      const existingSchema = schemas.find((s: any) => s.id === newSchema.id);
      
      if (existingSchema) {
        existingSchemas.push(newSchema.id);
      } else {
        newSchemas.push(newSchema);
      }
    }

    if (existingSchemas.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Schema(s) with ID(s) "${existingSchemas.join(', ')}" already exist(s)` 
        },
        { status: 409 }
      );
    }

    // Add all new schemas
    schemas.push(...newSchemas);

    // Write back to file atomically
    writeSchemasAtomically(schemas);

    // Always call clear-cache API endpoint after creating schemas
    // This ensures caches are cleared even when demo mode is off (will proxy to remote)
    try {
      const url = new URL(request.url);
      const baseUrl = `${url.protocol}//${url.host}`;
      const clearCacheUrl = `${baseUrl}/api/schemas/clear-cache`;
      
      await fetch(clearCacheUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch((error) => {
        // Log but don't fail the request if cache clearing fails
        loggingCustom(
          LogType.INFRA_LOG,
          'warn',
          `Failed to clear cache after schema creation: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    } catch (error) {
      // Log but don't fail the request if cache clearing fails
      loggingCustom(
        LogType.INFRA_LOG,
        'warn',
        `Error clearing cache after schema creation: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Return single object if single was sent, array if array was sent
    const responseData = Array.isArray(normalizedRequestData) ? newSchemas : newSchemas[0];
    const message = newSchemas.length === 1
      ? `Schema "${newSchemas[0].id}" created successfully`
      : `${newSchemas.length} schemas created successfully`;

    return NextResponse.json({
      success: true,
      data: responseData,
      message
    }, { status: 201 });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error creating schema: ${error instanceof Error ? error.message : String(error)}`,
    );
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create schema' 
      },
      { status: 500 }
    );
  }
}

