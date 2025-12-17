/**
 * Schema Statistics Utilities
 * Functions to calculate statistics for schemas (records count, size, etc.)
 * 
 * SERVER-ONLY: This file uses server-only data storage utilities and can only be used in server-side code
 * (API routes, server components)
 * 
 * Import directly: '@/gradian-ui/schema-manager/utils/schema-statistics-utils'
 * Do NOT import from '@/gradian-ui/schema-manager/utils' to avoid bundling issues
 */

import 'server-only';

import { readSchemaData } from '@/gradian-ui/shared/domain/utils/data-storage.util';

/**
 * Calculate the number of records for a schema
 * @param schemaId - The ID of the schema
 * @returns The number of records (0 if schema has no data or error occurs)
 */
export function calculateSchemaRecords(schemaId: string): number {
  try {
    const data = readSchemaData(schemaId);
    const count = Array.isArray(data) ? data.length : 0;
    console.log(`[schema-statistics] Schema "${schemaId}" - Data type: ${Array.isArray(data) ? 'array' : typeof data}, Count: ${count}`);
    return count;
  } catch (error) {
    console.error(`[schema-statistics] Failed to calculate records for schema "${schemaId}":`, error);
    if (error instanceof Error) {
      console.error(`[schema-statistics] Error details: ${error.message}`, error.stack);
    }
    return 0;
  }
}

/**
 * Calculate the size of schema data in megabytes
 * @param schemaId - The ID of the schema
 * @returns The size in megabytes (0 if schema has no data or error occurs)
 */
export function calculateSchemaSize(schemaId: string): number {
  try {
    const data = readSchemaData(schemaId);
    if (!Array.isArray(data) || data.length === 0) {
      return 0;
    }

    // Convert data to JSON string and calculate size in bytes using Buffer (Node.js)
    const jsonString = JSON.stringify(data);
    const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
    
    // Convert bytes to megabytes (1 MB = 1024 * 1024 bytes)
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    // Round to 2 decimal places
    const roundedSize = Math.round(sizeInMB * 100) / 100;
    if (roundedSize > 0) {
      console.log(`[schema-statistics] Schema "${schemaId}" size: ${roundedSize} MB`);
    }
    return roundedSize;
  } catch (error) {
    console.error(`[schema-statistics] Failed to calculate size for schema "${schemaId}":`, error);
    return 0;
  }
}

/**
 * Calculate the maximum updatedAt timestamp from all records in a schema
 * @param schemaId - The ID of the schema
 * @returns The maximum updatedAt timestamp as ISO string (null if schema has no data or no updatedAt fields)
 */
export function calculateMaxUpdatedAt(schemaId: string): string | null {
  try {
    const data = readSchemaData(schemaId);
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    let maxTimestamp: number | null = null;
    let maxDateString: string | null = null;

    for (const record of data) {
      if (!record || typeof record !== 'object') {
        continue;
      }

      const updatedAt = record.updatedAt || record.updated_at || record.updated;
      if (!updatedAt) {
        continue;
      }

      let timestamp: number | null = null;
      let dateString: string | null = null;

      // Handle different formats: ISO string, timestamp number, or Date object
      if (typeof updatedAt === 'string') {
        // Try parsing as ISO date string
        const date = new Date(updatedAt);
        if (!isNaN(date.getTime())) {
          timestamp = date.getTime();
          dateString = updatedAt; // Keep original string format
        }
      } else if (typeof updatedAt === 'number') {
        timestamp = updatedAt;
        // Convert to ISO string for consistency
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          dateString = date.toISOString();
        }
      } else if (updatedAt instanceof Date) {
        timestamp = updatedAt.getTime();
        dateString = updatedAt.toISOString();
      }

      // Update max if this timestamp is greater
      if (timestamp !== null && dateString && (maxTimestamp === null || timestamp > maxTimestamp)) {
        maxTimestamp = timestamp;
        maxDateString = dateString;
      }
    }

    if (maxDateString) {
      console.log(`[schema-statistics] Schema "${schemaId}" maxUpdatedAt: ${maxDateString}`);
    }
    return maxDateString;
  } catch (error) {
    console.error(`[schema-statistics] Failed to calculate maxUpdatedAt for schema "${schemaId}":`, error);
    return null;
  }
}

/**
 * Calculate all statistics for a schema
 * @param schemaId - The ID of the schema
 * @returns Statistics object with records, size, and maxUpdatedAt
 */
export function calculateSchemaStatistics(schemaId: string): {
  records: number;
  size: number; // in megabytes
  maxUpdatedAt: string | null; // ISO date string or null
} {
  console.log(`[schema-statistics] Calculating statistics for schema: "${schemaId}"`);
  const records = calculateSchemaRecords(schemaId);
  const size = calculateSchemaSize(schemaId);
  const maxUpdatedAt = calculateMaxUpdatedAt(schemaId);
  console.log(`[schema-statistics] Schema "${schemaId}" - Records: ${records}, Size: ${size} MB, MaxUpdatedAt: ${maxUpdatedAt || 'N/A'}`);
  return {
    records,
    size,
    maxUpdatedAt,
  };
}

/**
 * Calculate statistics for multiple schemas
 * @param schemaIds - Array of schema IDs
 * @returns Map of schema ID to statistics
 */
export function calculateMultipleSchemaStatistics(
  schemaIds: string[]
): Record<string, { records: number; size: number; maxUpdatedAt: string | null }> {
  const statistics: Record<string, { records: number; size: number; maxUpdatedAt: string | null }> = {};
  
  for (const schemaId of schemaIds) {
    statistics[schemaId] = calculateSchemaStatistics(schemaId);
  }
  
  return statistics;
}

