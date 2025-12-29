// Authentication Configuration
// Supports environment variable overrides for sensitive values

export interface AuthConfig {
  JWT_SECRET: string;
  ACCESS_TOKEN_EXPIRY: number;
  REFRESH_TOKEN_EXPIRY: number;
  ACCESS_TOKEN_COOKIE: string;
  REFRESH_TOKEN_COOKIE: string;
  SESSION_TOKEN_COOKIE: string;
  USER_SESSION_ID_COOKIE: string;
  USERS_API_PATH: string;
  ERROR_MESSAGES: {
    USER_NOT_FOUND: string;
    INVALID_PASSWORD: string;
    INVALID_TOKEN: string;
    MISSING_TOKEN: string;
    TOKEN_EXPIRED: string;
    UNAUTHORIZED: string;
    LOGIN_REQUIRED: string;
  };
}

// Default authentication configuration
const defaultAuthConfig: AuthConfig = {
  JWT_SECRET: 'your-default-secret-key-change-in-production',
  ACCESS_TOKEN_EXPIRY: 3600,
  REFRESH_TOKEN_EXPIRY: 604800,
  ACCESS_TOKEN_COOKIE: 'access_token',
  REFRESH_TOKEN_COOKIE: 'refresh_token',
  SESSION_TOKEN_COOKIE: 'session_token',
  USER_SESSION_ID_COOKIE: 'user_session_id',
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
};

// Load configuration with environment variable overrides
function loadAuthConfig(): AuthConfig {
  const config = { ...defaultAuthConfig };

  // Override with environment variables if present
  if (typeof process !== 'undefined') {
    if (process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET) {
      config.JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || config.JWT_SECRET;
    }
    if (process.env.JWT_ACCESS_TOKEN_EXPIRY) {
      config.ACCESS_TOKEN_EXPIRY = parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRY, 10) || config.ACCESS_TOKEN_EXPIRY;
    }
    if (process.env.JWT_REFRESH_TOKEN_EXPIRY) {
      config.REFRESH_TOKEN_EXPIRY = parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY, 10) || config.REFRESH_TOKEN_EXPIRY;
    }
  }

  return config;
}

export const AUTH_CONFIG = loadAuthConfig();

// Routes excluded from login requirements
// These routes are accessible without authentication
// Supports exact matches and wildcard patterns (e.g., /api/auth/*)
export const EXCLUDED_LOGIN_ROUTES: string[] = [
  // Page routes
  '/authentication',
  '/health',
  
  // API auth routes (login, logout, token refresh, etc.)
  '/api/auth/*',
  
  // API health routes
  '/api/health',
  '/api/health/*',
];

// Routes forbidden in production environment
export const FORBIDDEN_ROUTES_PRODUCTION: string[] = [];

