// Application Variables Loader Utility
// SERVER-ONLY: This file uses Node.js fs module and can only be used in server-side code

import 'server-only';
import fs from 'fs';
import path from 'path';

const APPLICATION_VARIABLES_FILE = path.join(process.cwd(), 'data', 'application-variables.json');

// Default values (should match data/application-variables.json and application-variables-defaults.ts)
// Defined here to avoid importing from client-accessible files
const getDefaultData = (): ApplicationVariablesData => ({
  LOG_CONFIG: {
    FORM_DATA: true,
    REQUEST_BODY: true,
    REQUEST_RESPONSE: true,
    SCHEMA_LOADER: true,
    CALL_BACKEND: true,
    INDEXDB_CACHE: true,
    INTEGRATION_LOG: true,
  },
  AUTH_CONFIG: {
    JWT_SECRET: process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-default-secret-key-change-in-production',
    ACCESS_TOKEN_EXPIRY: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRY || '3600', 10),
    REFRESH_TOKEN_EXPIRY: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY || '604800', 10),
    ACCESS_TOKEN_COOKIE: 'auth_token',
    REFRESH_TOKEN_COOKIE: 'refresh_token',
    USERS_API_PATH: '/api/data/users',
    ERROR_MESSAGES: {
      USER_NOT_FOUND: 'User does not exist',
      INVALID_PASSWORD: 'Password is incorrect',
      INVALID_TOKEN: 'Invalid or expired token',
      MISSING_TOKEN: 'Authentication token is required',
      TOKEN_EXPIRED: 'Token has expired',
      UNAUTHORIZED: 'Unauthorized access',
      LOGIN_REQUIRED: 'Please log in to continue',
    },
  },
  UI_PARAMS: {
    CARD_INDEX_DELAY: {
      STEP: 0.05,
      MAX: 0.4,
      SKELETON_MAX: 0.25,
    },
  },
  SCHEMA_SUMMARY_EXCLUDED_KEYS: ['fields', 'sections', 'detailPageMetadata'],
  DEMO_MODE: true,
});

interface ApplicationVariablesData {
  LOG_CONFIG: Record<string, boolean>;
  AUTH_CONFIG: {
    JWT_SECRET: string;
    ACCESS_TOKEN_EXPIRY: number;
    REFRESH_TOKEN_EXPIRY: number;
    ACCESS_TOKEN_COOKIE: string;
    REFRESH_TOKEN_COOKIE: string;
    USERS_API_PATH: string;
    ERROR_MESSAGES: Record<string, string>;
  };
  UI_PARAMS: {
    CARD_INDEX_DELAY: {
      STEP: number;
      MAX: number;
      SKELETON_MAX: number;
    };
  };
  SCHEMA_SUMMARY_EXCLUDED_KEYS: string[];
  DEMO_MODE: boolean;
}

let cachedVariables: ApplicationVariablesData | null = null;

/**
 * Load application variables from JSON file
 * Uses caching to avoid reading from disk on every call
 */
export function loadApplicationVariables(): ApplicationVariablesData {
  // Return cached version if available
  if (cachedVariables) {
    return cachedVariables;
  }

  try {
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Read from JSON file
    if (!fs.existsSync(APPLICATION_VARIABLES_FILE)) {
      // If file doesn't exist, use defaults
      const defaultData = getDefaultData();
      cachedVariables = defaultData;
      return defaultData;
    }

    const fileContent = fs.readFileSync(APPLICATION_VARIABLES_FILE, 'utf-8');
    const data = JSON.parse(fileContent) as ApplicationVariablesData;

    // Merge with environment variables for AUTH_CONFIG
    if (data.AUTH_CONFIG) {
      data.AUTH_CONFIG.JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || data.AUTH_CONFIG.JWT_SECRET;
      data.AUTH_CONFIG.ACCESS_TOKEN_EXPIRY = parseInt(
        process.env.JWT_ACCESS_TOKEN_EXPIRY || String(data.AUTH_CONFIG.ACCESS_TOKEN_EXPIRY),
        10
      );
      data.AUTH_CONFIG.REFRESH_TOKEN_EXPIRY = parseInt(
        process.env.JWT_REFRESH_TOKEN_EXPIRY || String(data.AUTH_CONFIG.REFRESH_TOKEN_EXPIRY),
        10
      );
    }

    cachedVariables = data;
    return data;
  } catch (error) {
    console.error('Error loading application variables:', error);
    // Return defaults on error
    const defaultData = getDefaultData();
    cachedVariables = defaultData;
    return defaultData;
  }
}

/**
 * Clear the cache (useful when variables are updated)
 */
export function clearApplicationVariablesCache(): void {
  cachedVariables = null;
}

