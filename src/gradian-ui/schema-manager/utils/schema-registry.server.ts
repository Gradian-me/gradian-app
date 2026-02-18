// Schema Registry - SERVER SIDE ONLY
// Server-side functions that use API endpoint access

import 'server-only';

import { applyMockSchemaPermissions } from '@/gradian-ui/shared/configs/mock-schema-permissions';
import { FormSchema } from '../types/form-schema';
import { loadAllSchemas, loadSchemasAsRecord, loadSchemaById } from './schema-loader';

// Cache for loaded schemas (incremental - schemas are cached one by one)
// This cache is populated by loadSchemaById which uses loadDataById
// Each schema is fetched individually from /api/schemas/${schemaId}
let schemasCache: Record<string, FormSchema> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = process.env.NODE_ENV === 'production' ? 0 : 5000; // No cache in production to allow dynamic updates

/**
 * Get all schemas (cached) - async version for server-side only
 * Only loads all schemas if explicitly needed (e.g., for schema manager page)
 * @returns Record of schema ID to FormSchema
 */
export const getAllSchemasSync = async (): Promise<Record<string, FormSchema>> => {
  // Always reload if cache is expired or if we're in production (to support dynamic schema updates)
  const now = Date.now();
  if (!schemasCache || CACHE_TTL_MS === 0 || now - cacheTimestamp > CACHE_TTL_MS) {
    schemasCache = await loadSchemasAsRecord();
    cacheTimestamp = now;
  }
  return schemasCache;
};

/**
 * Clear the schema cache (useful for testing or hot-reloading)
 */
export const clearSchemaCache = (): void => {
  schemasCache = null;
};

/**
 * Check if a schema exists (Server-side only)
 * Uses loadSchemaById to cache schemas individually
 * @param schemaId - The ID of the schema to check
 * @returns True if schema exists, false otherwise
 */
export const schemaExists = async (schemaId: string): Promise<boolean> => {
  // Try to load the schema individually - this will cache it if found
  const schema = await loadSchemaById(schemaId);
  return schema !== null;
};

/**
 * Find a schema by its ID (Server-side only)
 * Uses loadSchemaById to cache schemas individually
 * @param schemaId - The ID of the schema to find
 * @returns The schema if found, or null if not found
 */
export const findSchemaById = async (schemaId: string): Promise<FormSchema | null> => {
  // Load schema individually - this will cache it if found
  // This avoids loading all schemas when we only need one
  const schema = await loadSchemaById(schemaId);
  if (!schema) {
    console.warn(`Schema with ID "${schemaId}" not found`);
    return null;
  }
  return applyMockSchemaPermissions(schema);
};

/**
 * Get a schema by ID (Server-side only), throws error if not found
 * Uses loadSchemaById to cache schemas individually
 * @param schemaId - The ID of the schema to get
 * @returns The schema
 * @throws Error if schema not found
 */
export const getSchemaById = async (schemaId: string): Promise<FormSchema> => {
  // Load schema individually - this will cache it if found
  // This avoids loading all schemas when we only need one
  const schema = await loadSchemaById(schemaId);
  
  if (!schema) {
    throw new Error(`Schema with ID "${schemaId}" not found`);
  }
  
  return applyMockSchemaPermissions(schema);
};

/**
 * Get all available schema IDs (Server-side only)
 * @returns Array of schema IDs
 */
export const getAvailableSchemaIds = async (): Promise<string[]> => {
  const schemas = await getAllSchemasSync();
  return Object.keys(schemas);
};

/**
 * Get all schemas (Server-side only)
 * @returns Array of all schemas
 */
export const getAllSchemasArray = async (): Promise<FormSchema[]> => {
  return await loadAllSchemas();
};

/**
 * Get schema metadata (Server-side only)
 * @param schemaId - The ID of the schema
 * @returns Metadata about the schema
 */
export const getSchemaMetadata = async (schemaId: string) => {
  const schema = await findSchemaById(schemaId);
  
  if (!schema) {
    return null;
  }
  
  return {
    id: schema.id,
    description: schema.description,
    singularName: schema.singular_name,
    pluralName: schema.plural_name,
  };
};

/**
 * Validate if a schema ID is valid (Server-side only)
 * @param schemaId - The ID to validate
 * @returns True if valid, false otherwise
 */
export const isValidSchemaId = async (schemaId: string): Promise<boolean> => {
  return await schemaExists(schemaId);
};

