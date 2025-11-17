// Application logging enums and variables
export enum LogType {
  FORM_DATA = 'FORM_DATA',
  REQUEST_BODY = 'REQUEST_BODY',
  REQUEST_RESPONSE = 'REQUEST_RESPONSE',
  SCHEMA_LOADER = 'SCHEMA_LOADER',
  CALL_BACKEND = 'CALL_BACKEND',
  INDEXDB_CACHE = 'INDEXDB_CACHE',
  INTEGRATION_LOG = 'INTEGRATION_LOG',
}

// Log flags configuration
export const LOG_CONFIG = {
  [LogType.FORM_DATA]: true,
  [LogType.REQUEST_BODY]: true,
  [LogType.REQUEST_RESPONSE]: true,
  [LogType.SCHEMA_LOADER]: true,
  [LogType.CALL_BACKEND]: true,
  [LogType.INDEXDB_CACHE]: true,
  [LogType.INTEGRATION_LOG]: true,
};

// Authentication configuration
export const AUTH_CONFIG = {
  // JWT Secret key from environment (fallback for development)
  JWT_SECRET: process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-default-secret-key-change-in-production',
  
  // Token expiration times (in seconds)
  ACCESS_TOKEN_EXPIRY: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRY || '3600', 10), // 1 hour default
  REFRESH_TOKEN_EXPIRY: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY || '604800', 10), // 7 days default
  
  // Token cookie names
  ACCESS_TOKEN_COOKIE: 'auth_token',
  REFRESH_TOKEN_COOKIE: 'refresh_token',
  
  // API endpoints
  USERS_API_PATH: '/api/data/users',
  
  // Error messages
  ERROR_MESSAGES: {
    USER_NOT_FOUND: 'User does not exist',
    INVALID_PASSWORD: 'Password is incorrect',
    INVALID_TOKEN: 'Invalid or expired token',
    MISSING_TOKEN: 'Authentication token is required',
    TOKEN_EXPIRED: 'Token has expired',
    UNAUTHORIZED: 'Unauthorized access',
    LOGIN_REQUIRED: 'Please log in to continue'
  }
};

// Shared animation delays for card collections
export const UI_PARAMS = {
  CARD_INDEX_DELAY: {
    STEP: 0.05,
    MAX: 0.4,
    SKELETON_MAX: 0.25,
  },
} as const;

// Schema summary configuration
export const SCHEMA_SUMMARY_EXCLUDED_KEYS = [
  'fields',
  'sections',
  'detailPageMetadata',
] as const;