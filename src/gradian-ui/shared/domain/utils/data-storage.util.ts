// Data Storage Utility
// Handles reading and writing to all-data.json file
// SERVER-ONLY: This file uses Node.js fs module and can only be used in server-side code (API routes, server components)

import fs from 'fs';
import path from 'path';
import { DataStorageError } from '../errors/domain.errors';

// Cap data file size to reduce risk of loading corrupted/oversized JSON
const MAX_DATA_FILE_BYTES = 10 * 1024 * 1024; // 10MB

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'all-data.json');
const DATA_TMP_PATH = path.join(process.cwd(), 'data', 'all-data.tmp.json');

/**
 * Ensure data directory and file exist
 */
function ensureDataFile(): void {
  const dataDir = path.join(process.cwd(), 'data');
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(DATA_FILE_PATH)) {
    const initialData = {
      vendors: [],
      tenders: [],
      purchaseOrders: [],
      products: [],
      shipments: [],
      invoices: [],
      users: [],
    };
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(initialData, null, 2), { encoding: 'utf-8', mode: 0o600 });
  }
}

/**
 * Read all data from the JSON file
 */
export function readAllData(): Record<string, any[]> {
  try {
    ensureDataFile();
    const { size } = fs.statSync(DATA_FILE_PATH);
    if (size > MAX_DATA_FILE_BYTES) {
      throw new DataStorageError('read', 'Data file exceeds safe size limit');
    }
    const rawData = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    throw new DataStorageError('read', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Write all data to the JSON file
 */
export function writeAllData(data: Record<string, any[]>): void {
  try {
    ensureDataFile();
    const payload = JSON.stringify(data, null, 2);
    // Write atomically to reduce risk of partial writes
    fs.writeFileSync(DATA_TMP_PATH, payload, { encoding: 'utf-8', mode: 0o600 });
    fs.renameSync(DATA_TMP_PATH, DATA_FILE_PATH);
  } catch (error) {
    throw new DataStorageError('write', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Migrate data from legacy files to all-data.json
 */
function migrateLegacyData(schemaId: string): void {
  const dataDir = path.join(process.cwd(), 'data');
  let legacyFilePath: string | null = null;
  
  // Check for legacy files
  if (schemaId === 'companies') {
    legacyFilePath = path.join(dataDir, 'all-companies.json');
  } else if (schemaId === 'relation-types') {
    legacyFilePath = path.join(dataDir, 'all-relation-types.json');
  }
  
  if (legacyFilePath && fs.existsSync(legacyFilePath)) {
    try {
      // Read legacy file
      const legacyData = JSON.parse(fs.readFileSync(legacyFilePath, 'utf-8'));
      const allData = readAllData();
      
      // Migrate to all-data.json if not already present
      if (!allData[schemaId] || allData[schemaId].length === 0) {
        allData[schemaId] = Array.isArray(legacyData) ? legacyData : [];
        writeAllData(allData);
      }
    } catch (error) {
      console.warn(`Failed to migrate legacy data for ${schemaId}:`, error);
    }
  }
}

/**
 * Read data for a specific schema
 */
export function readSchemaData<T = any>(schemaId: string): T[] {
  try {
    // Migrate legacy data if needed
    migrateLegacyData(schemaId);
    
    const allData = readAllData();
    
    // If schema doesn't exist, initialize it and return empty array
    if (!allData[schemaId]) {
      allData[schemaId] = [];
      writeAllData(allData);
    }
    
    return (allData[schemaId] || []) as T[];
  } catch (error) {
    // If it's a DataStorageError, re-throw it
    if (error instanceof DataStorageError) {
      throw error;
    }
    // For other errors, wrap in DataStorageError
    throw new DataStorageError(`read ${schemaId}`, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Write data for a specific schema
 */
export function writeSchemaData<T = any>(schemaId: string, data: T[]): void {
  try {
    const allData = readAllData();
    allData[schemaId] = data;
    writeAllData(allData);
  } catch (error) {
    throw new DataStorageError(`write ${schemaId}`, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Initialize schema collection if it doesn't exist
 */
export function ensureSchemaCollection(schemaId: string): void {
  try {
    // Migrate legacy data if needed
    migrateLegacyData(schemaId);
    
    const allData = readAllData();
    if (!allData[schemaId]) {
      allData[schemaId] = [];
      writeAllData(allData);
    }
  } catch (error) {
    throw new DataStorageError(`ensure ${schemaId}`, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Get all available schema IDs from data file
 */
export function getAvailableDataSchemas(): string[] {
  try {
    const allData = readAllData();
    return Object.keys(allData);
  } catch (error) {
    return [];
  }
}

