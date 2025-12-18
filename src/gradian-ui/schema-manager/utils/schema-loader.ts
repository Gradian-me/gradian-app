// Schema Loader Utility - SERVER SIDE ONLY
// Loads schemas from API endpoint and converts them to FormSchema objects
// This file is server-only and can only be imported in server components

import 'server-only';

import { FormSchema, FormField } from '../types/form-schema';
import { config } from '@/lib/config';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { loadData, loadDataById, clearCache as clearDataCache } from '@/gradian-ui/shared/utils/data-loader';
import { DEMO_MODE } from '@/gradian-ui/shared/configs/env-config';
import fs from 'fs';
import path from 'path';

const SCHEMAS_ROUTE_KEY = 'schemas';

/**
 * Safely read schemas from the local filesystem.
 * Returns null when the file is missing or invalid so callers can fall back to other strategies.
 */
function readSchemasFromFile(): FormSchema[] | null {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'all-schemas.json');

    if (!fs.existsSync(dataPath)) {
      loggingCustom(LogType.SCHEMA_LOADER, 'warn', `Schemas file not found at path: ${dataPath}`);
      return null;
    }

    const fileContents = fs.readFileSync(dataPath, 'utf8');
    const schemas = JSON.parse(fileContents);

    if (!Array.isArray(schemas)) {
      loggingCustom(LogType.SCHEMA_LOADER, 'error', 'Schemas file does not contain an array');
      return null;
    }

    return schemas.map(processSchema);
  } catch (error) {
    loggingCustom(
      LogType.SCHEMA_LOADER,
      'error',
      `Error reading schemas from filesystem: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return null;
  }
}

/**
 * Clear the schema cache (useful for testing or manual cache invalidation)
 */
export function clearSchemaCache(): void {
  clearDataCache(SCHEMAS_ROUTE_KEY);
}


/**
 * Convert a pattern string to RegExp
 * @param pattern - The pattern string
 * @returns RegExp object or undefined
 */
function stringToRegExp(pattern: string | undefined): RegExp | undefined {
  if (!pattern) return undefined;

  try {
    return new RegExp(pattern);
  } catch {
    loggingCustom(LogType.SCHEMA_LOADER, 'warn', `Invalid pattern: ${pattern}`);
    return undefined;
  }
}

/**
 * Process a field to convert string patterns to RegExp
 * @param field - The field to process
 * @returns Processed field
 */
function processField(field: any): FormField {
  const processedField = { ...field };

  // Convert pattern string to RegExp
  if (processedField.validation?.pattern && typeof processedField.validation.pattern === 'string') {
    processedField.validation.pattern = stringToRegExp(processedField.validation.pattern);
  }

  if (Array.isArray(processedField.options)) {
    processedField.options = processedField.options.map((option: any) => {
      if (!option || typeof option !== 'object') {
        return option;
      }

      if (option.id === undefined || option.id === null) {
        return option;
      }

      return {
        ...option,
        id: String(option.id),
      };
    });
  }

  return processedField;
}

/**
 * Process a schema to convert string patterns to RegExp objects
 * and transform old structure (fields in sections) to new structure (fields at schema level)
 * @param schema - The schema to process
 * @returns Processed schema
 */
function processSchema(schema: any): FormSchema {
  const processedSchema = { ...schema };

  // Ensure fields array exists
  if (!processedSchema.fields) {
    processedSchema.fields = [];
  }

  // If schema has old structure (fields in sections), transform to new structure
  if (processedSchema.sections && processedSchema.fields.length === 0) {
    const allFields: FormField[] = [];

    processedSchema.sections.forEach((section: any) => {
      if (section.fields && Array.isArray(section.fields)) {
        section.fields.forEach((field: any) => {
          allFields.push(processField({
            ...field,
            sectionId: section.id
          }));
        });
      }
      // Remove fields from section
      delete section.fields;
    });

    processedSchema.fields = allFields;
  } else if (processedSchema.fields && processedSchema.fields.length > 0) {
    // Process fields that are already at schema level
    processedSchema.fields = processedSchema.fields.map(processField);
  }

  // Ensure sections array exists
  if (!processedSchema.sections) {
    processedSchema.sections = [];
  }

  // Add virtual fields for allowDataDueDate and allowDataAssignedTo
  // Check if these fields already exist to avoid duplicates
  const hasDueDateField = processedSchema.fields.some((f: FormField) => f.name === 'dueDate' && f.role === 'duedate');
  const hasAssignedToField = processedSchema.fields.some((f: FormField) => f.name === 'assignedTo' && f.role === 'person');
  
  if (processedSchema.allowDataDueDate && !hasDueDateField) {
    // Add virtual dueDate field with role duedate
    processedSchema.fields.push({
      id: `virtual-dueDate-${processedSchema.id}`,
      name: 'dueDate',
      label: 'Due Date',
      sectionId: processedSchema.sections?.[0]?.id || 'system',
      component: 'date',
      role: 'duedate',
      order: 9999,
    } as FormField);
  }
  
  if (processedSchema.allowDataAssignedTo && !hasAssignedToField) {
    // Add virtual assignedTo field with role person
    processedSchema.fields.push({
      id: `virtual-assignedTo-${processedSchema.id}`,
      name: 'assignedTo',
      label: 'Assigned To',
      sectionId: processedSchema.sections?.[0]?.id || 'system',
      component: 'picker',
      role: 'person',
      targetSchema: 'users',
      order: 9998,
    } as FormField);
  }

  return processedSchema as FormSchema;
}

/**
 * Load all schemas from the API endpoint (with caching)
 * During build time, reads directly from file system
 * @returns Array of FormSchema objects
 */
export async function loadAllSchemas(): Promise<FormSchema[]> {
  // Check if we're in a build context - during build, read directly from file
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';
  
  if (isBuildTime) {
    const schemasFromFile = readSchemasFromFile();
    if (schemasFromFile) {
      return schemasFromFile;
    }

    loggingCustom(LogType.SCHEMA_LOADER, 'error', 'Schemas file not found during build');
    return [];
  }
  
  // Always use API endpoint with caching (works for both DEMO_MODE=true and DEMO_MODE=false)
  // When DEMO_MODE=true and schemaApi.basePath points to local API, we can read directly from file to avoid nested HTTP calls
  // When DEMO_MODE=false, we must use API route which will proxy to external backend
  const apiPath = config.schemaApi.basePath;
  const isServerRuntime = typeof window === 'undefined';
  const isLocalApiPath =
    apiPath.startsWith('/api/') ||
    apiPath.startsWith('/api') ||
    apiPath.startsWith('http://localhost') ||
    apiPath.startsWith('https://localhost');
  
  // Check demo mode - only read from file if demo mode is enabled
  const isDemoMode = DEMO_MODE;
  
  const shouldReadFromFile = isServerRuntime && isLocalApiPath && isDemoMode;

  try {
    return await loadData<FormSchema[]>(
      SCHEMAS_ROUTE_KEY,
      apiPath,
      {
        processor: (data: any) => {
          if (!Array.isArray(data)) {
            loggingCustom(LogType.SCHEMA_LOADER, 'error', 'API response does not contain an array');
            return [];
          }
          // Process each schema to convert patterns
          return data.map(processSchema);
        },
        logType: LogType.SCHEMA_LOADER,
        fetcher: shouldReadFromFile
          ? async () => {
              const fileData = readSchemasFromFile();
              if (fileData) {
                return fileData;
              }
              loggingCustom(LogType.SCHEMA_LOADER, 'warn', 'Local schemas file not found while using local API path');
              return [];
            }
          : undefined,
      }
    );
  } catch (error) {
    loggingCustom(
      LogType.SCHEMA_LOADER,
      'warn',
      `Failed to load schemas from API (${error instanceof Error ? error.message : 'Unknown error'}). ${isDemoMode ? 'Falling back to filesystem.' : 'Demo mode is disabled, cannot fallback to filesystem.'}`
    );

    // Only fallback to filesystem if demo mode is enabled
    // When demo mode is false, API failures should propagate (external API is required)
    if (isDemoMode) {
      const schemasFromFile = readSchemasFromFile();
      if (schemasFromFile) {
        return schemasFromFile;
      }
      loggingCustom(LogType.SCHEMA_LOADER, 'error', 'Schemas file not found while attempting filesystem fallback.');
    } else {
      loggingCustom(LogType.SCHEMA_LOADER, 'error', 'API request failed and demo mode is disabled. External API is required.');
    }
    
    return [];
  }
}

/**
 * Load schemas and convert to a Map indexed by schema ID
 * @returns Map of schema ID to FormSchema
 */
export async function loadSchemasAsMap(): Promise<Map<string, FormSchema>> {
  const schemas = await loadAllSchemas();
  const schemaMap = new Map<string, FormSchema>();

  schemas.forEach(schema => {
    schemaMap.set(schema.id, schema);
  });

  return schemaMap;
}

/**
 * Load schemas and convert to a Record indexed by schema ID
 * @returns Record of schema ID to FormSchema
 */
export async function loadSchemasAsRecord(): Promise<Record<string, FormSchema>> {
  const schemas = await loadAllSchemas();
  const schemaRecord: Record<string, FormSchema> = {};

  schemas.forEach(schema => {
    schemaRecord[schema.id] = schema;
  });

  return schemaRecord;
}

/**
 * Get a single schema by ID (uses cache if available)
 * Caches schemas individually in an array, fetching from /api/schemas/${schemaId}
 * During build time, reads directly from file system
 * @param schemaId - The ID of the schema to get
 * @returns The schema or null if not found
 */
export async function loadSchemaById(schemaId: string): Promise<FormSchema | null> {
  // Check if we're in a build context - during build, read directly from file
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';
  
  if (isBuildTime) {
    const schemasFromFile = readSchemasFromFile();
    if (schemasFromFile) {
      const fileSchema = schemasFromFile.find(s => s.id === schemaId);
      if (fileSchema) {
        return fileSchema; // Already processed by readSchemasFromFile
      }
    }
    return null;
  }
  
  // Check demo mode - if false, always use API (which will proxy to external backend)
  // If true, try filesystem first for performance, then fall back to API
  const shouldTryFilesystem = DEMO_MODE;
  
  // Try filesystem first only if demo mode is enabled
  if (shouldTryFilesystem) {
    const schemasFromFile = readSchemasFromFile();
    if (schemasFromFile) {
      const fileSchema = schemasFromFile.find(s => s.id === schemaId);
      if (fileSchema) {
        return fileSchema; // Already processed by readSchemasFromFile
      }
    }
  }
  
  // Runtime - use loadDataById to cache individual schemas in an array
  // This will:
  // 1. Check the cache array for the schema
  // 2. If not found, fetch from /api/schemas/${schemaId} (not /api/schemas)
  // 3. Add it to the cache array
  // 4. Return the schema
  const apiBasePath = config.schemaApi.basePath;
  
  try {
    return await loadDataById<FormSchema>(
      SCHEMAS_ROUTE_KEY, // Cache key - all schemas are cached in this array
      apiBasePath, // Base path: /api/schemas
      schemaId, // Schema ID to fetch
      {
        processor: (data: any) => {
          // Process the schema to convert patterns
          return processSchema(data);
        },
        findInCache: (cache: any, id: string) => {
          // Find schema in cache array
          if (Array.isArray(cache)) {
            const cachedSchema = cache.find((schema: any) => schema.id === id);
            if (cachedSchema) {
              return cachedSchema;
            }
          }
          return null;
        },
        logType: LogType.SCHEMA_LOADER,
      }
    );
  } catch (error) {
    loggingCustom(
      LogType.SCHEMA_LOADER,
      'warn',
      `Failed to load schema ${schemaId} from API (${error instanceof Error ? error.message : 'Unknown error'}). Filesystem already tried.`
    );
    
    // Filesystem already tried at the beginning, return null
    return null;
  }
}

