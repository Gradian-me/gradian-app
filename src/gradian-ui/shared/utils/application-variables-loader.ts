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
    ACCESS_TOKEN_COOKIE: 'access_token',
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
  LOGIN_LOCALLY: false,
  AD_MODE: false,
  REQUIRE_LOGIN: false,
  EXCLUDED_LOGIN_ROUTES: ['/authentication'],
  FORBIDDEN_ROUTES_PRODUCTION: [],
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
  LOGIN_LOCALLY?: boolean;
  AD_MODE: boolean;
  REQUIRE_LOGIN?: boolean;
  EXCLUDED_LOGIN_ROUTES?: string[];
  FORBIDDEN_ROUTES_PRODUCTION?: string[];
}

let cachedVariables: ApplicationVariablesData | null = null;
let cachedFileMtime: number | null = null;

const toBoolean = (value: unknown, fallback: boolean): boolean => {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

/**
 * Load application variables from JSON file
 * Uses caching to avoid reading from disk on every call
 * Cache is invalidated if file modification time changes
 */
export function loadApplicationVariables(): ApplicationVariablesData {
  const envDemoMode = process.env.DEMO_MODE;
  // Require explicit opt-in for demo in production to avoid accidental exposure
  const canSetDemoMode = toBoolean(process.env.CAN_SET_DEMO_MODE, false);

  // Check if file exists and get its modification time
  let currentMtime: number | null = null;
  try {
    if (fs.existsSync(APPLICATION_VARIABLES_FILE)) {
      const stats = fs.statSync(APPLICATION_VARIABLES_FILE);
      currentMtime = stats.mtimeMs;
    }
  } catch {
    // File doesn't exist or can't be accessed, will use defaults
  }

  // Return cached version if available and file hasn't changed
  if (cachedVariables && cachedFileMtime !== null && currentMtime === cachedFileMtime) {
    return cachedVariables;
  }

  // File changed or cache is empty, need to reload
  cachedFileMtime = currentMtime;

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
      // Allow env override for DEMO_MODE; still require opt-in in production
      defaultData.DEMO_MODE = toBoolean(envDemoMode, defaultData.DEMO_MODE);
      if (process.env.NODE_ENV !== 'development' && !canSetDemoMode) {
        defaultData.DEMO_MODE = false;
      }
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

    // Respect DEMO_MODE env override, but gate production with CAN_SET_DEMO_MODE
    data.DEMO_MODE = toBoolean(envDemoMode, data.DEMO_MODE);
    if (process.env.NODE_ENV !== 'development' && !canSetDemoMode) {
      data.DEMO_MODE = false;
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
  cachedFileMtime = null;
}

