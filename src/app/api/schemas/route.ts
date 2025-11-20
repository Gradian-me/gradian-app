// Schemas API Route
// Serves all schemas from the JSON file

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { isDemoModeEnabled, proxySchemaRequest } from './utils';
import { SCHEMA_SUMMARY_EXCLUDED_KEYS } from '@/gradian-ui/shared/constants/application-variables';

const SCHEMA_SUMMARY_EXCLUDED_KEY_SET = new Set<string>(SCHEMA_SUMMARY_EXCLUDED_KEYS);

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
 */
export function clearSchemaCache() {
  // No-op: caching is disabled
}

/**
 * Load schemas (always fresh, no caching)
 */
async function loadSchemas(): Promise<any[]> {
  const dataPath = path.join(process.cwd(), 'data', 'all-schemas.json');
  
  if (!fs.existsSync(dataPath)) {
    return [];
  }
  
  const fileContents = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(fileContents);
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
 * POST - Create a new schema
 * Example: POST /api/schemas - creates a new schema
 */
export async function POST(request: NextRequest) {
  try {
    const newSchema = await request.json();

    // Validate that we received a valid schema object
    if (!newSchema || typeof newSchema !== 'object' || Array.isArray(newSchema)) {
      return NextResponse.json(
        { success: false, error: 'Invalid schema: must be an object' },
        { status: 400 }
      );
    }

    if (!newSchema.id || typeof newSchema.id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid schema: missing or invalid "id" field' },
        { status: 400 }
      );
    }

    if (!isDemoModeEnabled()) {
      return proxySchemaRequest(request, '/api/schemas', { body: newSchema });
    }

    // Load schemas (with caching)
    const schemas = await loadSchemas();
    
    if (!schemas || schemas.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Schemas file not found or empty' },
        { status: 404 }
      );
    }

    // Check if schema with same ID already exists
    const existingSchema = schemas.find((s: any) => s.id === newSchema.id);
    
    if (existingSchema) {
      return NextResponse.json(
        { success: false, error: `Schema with ID "${newSchema.id}" already exists` },
        { status: 409 }
      );
    }

    // Add the new schema
    schemas.push(newSchema);

    // Write back to file
    const schemaFilePath = path.join(process.cwd(), 'data', 'all-schemas.json');
    fs.writeFileSync(schemaFilePath, JSON.stringify(schemas, null, 2), 'utf8');

    return NextResponse.json({
      success: true,
      data: newSchema,
      message: `Schema "${newSchema.id}" created successfully`
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

