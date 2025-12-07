// Schema Registry Utilities
// Universal functions that work on both client and server side
// For server-only functions, import from './schema-registry.server'

import { FormSchema, FormField } from '../types/form-schema';
import { config } from '@/lib/config';

/**
 * Convert a pattern string to RegExp
 * @param pattern - The pattern string
 * @returns RegExp object or undefined
 */
function stringToRegExp(pattern: string | undefined): RegExp | undefined {
  if (!pattern) return undefined;
  
  try {
    return new RegExp(pattern);
  } catch (error) {
    console.warn(`Invalid pattern: ${pattern}`, error);
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
  
  // If schema has old structure (fields in sections), transform to new structure
  if (processedSchema.sections && !processedSchema.fields) {
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
  } else if (processedSchema.fields) {
    // Process fields that are already at schema level
    processedSchema.fields = processedSchema.fields.map(processField);
  } else {
    processedSchema.fields = [];
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
 * Load schemas from server (works on both client and server)
 * @returns Array of FormSchema objects
 */
async function loadSchemasFromServer(): Promise<FormSchema[]> {
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      // Server side - use dynamic import to avoid bundling fs in client
      // Direct import path works here since we're already inside server-side check
      const { loadAllSchemas } = await import('./schema-loader');
      return await loadAllSchemas();
  } else {
    // Client side - fetch from API
    const response = await fetch(config.schemaApi.basePath, {
      // Add cache-control headers to ensure fresh data
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to load schemas');
    }
    
    // Process schemas to convert string patterns to RegExp
    return result.data.map(processSchema);
  }
}

// ============================================================================
// CLIENT-SIDE COMPATIBLE ASYNC FUNCTIONS
// ============================================================================

/**
 * Fetch a schema by ID (Works on both client and server)
 * Uses optimized loading: server reads directly, client fetches from API
 * @param schemaId - The ID of the schema to fetch
 * @returns The schema if found, or null if not found
 */
export async function fetchSchemaById(schemaId: string): Promise<FormSchema | null> {
  try {
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      // Server side - use API endpoint (configured via NEXT_PUBLIC_SCHEMA_API_BASE)       
      // Direct import path works here since we're already inside server-side check        
      const { loadSchemaById } = await import('./schema-loader') as typeof import('./schema-loader');
      const schema = await loadSchemaById(schemaId);
      // loadSchemaById already returns a processed FormSchema, so no need to process again
      return schema;
    } else {
      // Client side - fetch from API with cache-busting
      const response = await fetch(`${config.schemaApi.basePath}/${schemaId}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!response.ok) {
        return null;
      }
      
      const result = await response.json();
      if (!result.success) {
        return null;
      }
      
      // Process the schema to convert string patterns to RegExp
      return processSchema(result.data);
    }
  } catch (error) {
    console.error('Error fetching schema:', error);
    return null;
  }
}

/**
 * Fetch all schemas (Works on both client and server)
 * @returns Array of all schemas
 */
export async function fetchAllSchemas(): Promise<FormSchema[]> {
  try {
    return await loadSchemasFromServer();
  } catch (error) {
    console.error('Error fetching schemas:', error);
    return [];
  }
}

/**
 * Fetch all schema IDs (Works on both client and server)
 * @returns Array of schema IDs
 */
export async function fetchSchemaIds(): Promise<string[]> {
  const schemas = await fetchAllSchemas();
  return schemas.map(s => s.id);
}

/**
 * Check if a schema exists (Works on both client and server)
 * @param schemaId - The ID of the schema to check
 * @returns True if schema exists, false otherwise
 */
export async function schemaExistsAsync(schemaId: string): Promise<boolean> {
  const schema = await fetchSchemaById(schemaId);
  return schema !== null;
}

// ============================================================================
// NOTE: For server-side synchronous functions, import from:
// './schema-registry.server' which includes:
// - getSchemaById, findSchemaById, getAvailableSchemaIds
// - schemaExists, getAllSchemasArray, getSchemaMetadata
// - isValidSchemaId, clearSchemaCache
// ============================================================================

