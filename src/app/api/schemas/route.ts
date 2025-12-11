// Schemas API Route
// Serves all schemas from the JSON file

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { isDemoModeEnabled, proxySchemaRequest, normalizeSchemaData } from './utils';
import { SCHEMA_SUMMARY_EXCLUDED_KEYS } from '@/gradian-ui/shared/constants/application-variables';

const SCHEMA_SUMMARY_EXCLUDED_KEY_SET = new Set<string>(SCHEMA_SUMMARY_EXCLUDED_KEYS);
const MAX_SCHEMA_FILE_BYTES = 8 * 1024 * 1024; // 8MB safety cap
const SCHEMA_FILE_PATH = path.join(process.cwd(), 'data', 'all-schemas.json');
const SCHEMA_FILE_TMP_PATH = path.join(process.cwd(), 'data', 'all-schemas.tmp.json');

function buildSchemaSummary<T extends Record<string, any>>(schema: T): T {
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

  if (typeof fieldsCount === 'number') {
    summary.fieldsCount = fieldsCount;
  }

  if (typeof sectionsCount === 'number') {
    summary.sectionsCount = sectionsCount;
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
    console.warn(`[API] Schemas file not found at: ${SCHEMA_FILE_PATH}`);
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
      console.warn(`[API] Schemas file is empty at: ${SCHEMA_FILE_PATH}`);
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
    
    console.warn(`[API] Schemas file contains invalid data format at: ${SCHEMA_FILE_PATH}`);
    return [];
  } catch (error) {
    console.error(`[API] Error parsing schemas file at ${SCHEMA_FILE_PATH}:`, error);
    throw new Error(`Failed to parse schemas file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function writeSchemasAtomically(schemas: any[]): void {
  const payload = JSON.stringify(schemas, null, 2);
  fs.writeFileSync(SCHEMA_FILE_TMP_PATH, payload, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(SCHEMA_FILE_TMP_PATH, SCHEMA_FILE_PATH);
}

/**
 * GET - Get all schemas or a specific schema by ID
 * Example: 
 * - GET /api/schemas - returns all schemas
 * - GET /api/schemas?id=vendors - returns only vendors schema
 */
export async function GET(request: NextRequest) {
  if (!isDemoModeEnabled()) {
    return proxySchemaRequest(request, `/api/schemas${request.nextUrl.search}`);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const schemaId = searchParams.get('id');
    const schemaIdsParam = searchParams.get('schemaIds');
    const summaryParam = searchParams.get('summary');
    const isSummaryRequested = summaryParam === 'true' || summaryParam === '1';

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
        .filter((schema): schema is any => Boolean(schema));
      const responseData = isSummaryRequested
        ? matchedSchemas.map((schema) => buildSchemaSummary(schema))
        : matchedSchemas;

      return NextResponse.json({
        success: true,
        data: responseData,
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
      
      if (!schema) {
        return NextResponse.json(
          { success: false, error: `Schema with ID "${schemaId}" not found` },
          { status: 404 }
        );
      }

      const responseSchema = isSummaryRequested ? buildSchemaSummary(schema) : schema;

      return NextResponse.json({
        success: true,
        data: responseSchema
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // Return all schemas with cache-busting headers
    const responseSchemas = isSummaryRequested
      ? schemas.map((schema) => buildSchemaSummary(schema))
      : schemas;

    return NextResponse.json({
      success: true,
      data: responseSchemas
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error loading schemas:', error);
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
  try {
    const requestData = await request.json();

    // Normalize nested fields (e.g., parse repeatingConfig JSON strings to objects)
    const normalizedRequestData = Array.isArray(requestData)
      ? requestData.map(schema => normalizeSchemaData(schema))
      : normalizeSchemaData(requestData);

    // Debug: Log if repeatingConfig was normalized (in development)
    if (process.env.NODE_ENV === 'development') {
      const checkNormalization = (schema: any, path = '') => {
        if (schema?.sections) {
          schema.sections.forEach((section: any, idx: number) => {
            if (section.repeatingConfig) {
              const isString = typeof section.repeatingConfig === 'string';
              if (isString) {
                console.warn(`[POST /api/schemas] repeatingConfig is still a string at ${path}sections[${idx}].repeatingConfig:`, section.repeatingConfig.substring(0, 100));
              } else {
                console.log(`[POST /api/schemas] repeatingConfig normalized at ${path}sections[${idx}].repeatingConfig`);
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
        console.warn('Failed to clear cache after schema creation:', error);
      });
    } catch (error) {
      // Log but don't fail the request if cache clearing fails
      console.warn('Error clearing cache after schema creation:', error);
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
    console.error('Error creating schema:', error);
    
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

