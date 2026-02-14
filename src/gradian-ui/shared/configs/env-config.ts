// Environment Configuration
// Clean and obvious environment-based flags

/**
 * Normalize boolean values from environment variables
 */
function toBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

/**
 * Get environment variable value (checks both NEXT_PUBLIC_ and non-prefixed versions)
 */
function getEnvVar(name: string, publicName?: string): string | undefined {
  if (typeof process === 'undefined') return undefined;
  return process.env[publicName || `NEXT_PUBLIC_${name}`] || process.env[name];
}

// ===========================================
// Environment Detection
// ===========================================

/**
 * Check if running in development mode
 */
export const IS_DEV = typeof process !== 'undefined' 
  ? process.env.NODE_ENV === 'development'
  : false;

/**
 * Check if running in production mode
 */
export const IS_PRODUCTION = typeof process !== 'undefined'
  ? process.env.NODE_ENV === 'production'
  : true;

// ===========================================
// Demo Mode Configuration
// ===========================================

/**
 * Demo mode flag
 * Driven by NEXT_PUBLIC_DEMO_MODE (works on both server and client)
 * However, in production mode, DEMO_MODE is always false regardless of env variable
 */
export const DEMO_MODE: boolean = (() => {
  if (typeof process === 'undefined') return false;
   
  const value = process.env.NEXT_PUBLIC_DEMO_MODE;
  return toBoolean(value, false);
})();

// ===========================================
// Authentication Configuration
// ===========================================

/**
 * Login locally flag (use local demo users instead of external auth)
 */
export const LOGIN_LOCALLY: boolean = toBoolean(
  getEnvVar('LOGIN_LOCALLY'),
  false
);

/**
 * Active Directory mode flag
 */
export const AD_MODE: boolean = toBoolean(
  getEnvVar('AD_MODE'),
  false
);

/**
 * Require login flag
 */
export const REQUIRE_LOGIN: boolean = toBoolean(
  getEnvVar('REQUIRE_LOGIN'),
  false
);

/**
 * Enable notifications (header button, notifications page, API access)
 * Server: ENABLE_NOTIFICATION=true
 * Client: NEXT_PUBLIC_ENABLE_NOTIFICATION=true
 * 
 * Note: In Next.js, NEXT_PUBLIC_* variables are embedded at build/start time.
 * You must restart the dev server after changing this variable.
 */
export const ENABLE_NOTIFICATION: boolean = (() => {
  if (typeof process === 'undefined') return false;
  
  // Directly access NEXT_PUBLIC_ENABLE_NOTIFICATION first (client-side)
  // Then fall back to ENABLE_NOTIFICATION (server-side)
  const value = process.env.NEXT_PUBLIC_ENABLE_NOTIFICATION || process.env.ENABLE_NOTIFICATION;
  const result = toBoolean(value, false);
    
  return result;
})();

/**
 * Enable builder UI (/builder and all sub-routes)
 * Server: ENABLE_BUILDER=true
 * Client: NEXT_PUBLIC_ENABLE_BUILDER=true
 * 
 * Note: In Next.js, NEXT_PUBLIC_* variables are embedded at build/start time.
 * You must restart the dev server after changing this variable.
 */
export const ENABLE_BUILDER: boolean = (() => {
  if (typeof process === 'undefined') return false;
  
  // Directly access NEXT_PUBLIC_ENABLE_BUILDER first (client-side)
  // Then fall back to ENABLE_BUILDER (server-side)
  const value = process.env.NEXT_PUBLIC_ENABLE_BUILDER || process.env.ENABLE_BUILDER;
  const result = toBoolean(value, false);
    
  return result;
})();

/**
 * Enable sign-up (Create Account link on login, access to /authentication/sign-up)
 * Server: ENABLE_SIGN_UP=true
 * Client: NEXT_PUBLIC_ENABLE_SIGN_UP=true
 */
export const ENABLE_SIGN_UP: boolean = (() => {
  if (typeof process === 'undefined') return false;
  const value = process.env.NEXT_PUBLIC_ENABLE_SIGN_UP || process.env.ENABLE_SIGN_UP;
  return toBoolean(value, false);
})();

// ===========================================
// Localization
// ===========================================

/**
 * Comma-separated list of language codes to show in the app.
 * Set via NEXT_PUBLIC_AVAILABLE_LANGUAGES (required for client) or AVAILABLE_LANGUAGES.
 * Formats accepted: "en,fa,ar" or "['en','fa','ar']". When unset or empty, returns [] so all locales are shown.
 * Uses static process.env access so Next.js inlines the value in the client bundle.
 */
export function getAvailableLanguageCodes(): string[] {
  const raw =
    process.env.NEXT_PUBLIC_AVAILABLE_LANGUAGES || process.env.AVAILABLE_LANGUAGES;
  if (raw === undefined || raw === null || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (trimmed === '') return [];
  const normalized = trimmed.replace(/^\[|\]$/g, ''); // strip leading/trailing brackets
  return normalized
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, '').toLowerCase()) // strip quotes, then lowercase
    .filter(Boolean);
}

/**
 * Default app language (e.g. 'en', 'fa'). Used when no language is persisted.
 * Set via NEXT_PUBLIC_DEFAULT_LANGUAGE (client and server).
 * Resolved in getDefaultLanguage() from translation-utils.
 */

// ===========================================
// Convenience Exports
// ===========================================

export const DEMO_MODE_PARAMS = { DEMO_MODE } as const;
export const LOGIN_LOCALLY_PARAMS = { LOGIN_LOCALLY } as const;
export const AD_MODE_PARAMS = { AD_MODE } as const;

