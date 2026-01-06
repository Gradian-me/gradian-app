import { LogType, LOG_CONFIG } from '../configs/log-config';

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

const getLogFlag = (logType: LogType): boolean => {
  return LOG_CONFIG[logType] ?? false;
};

// Keys whose values must be redacted when logging authentication cookies/details
// Include both snake_case and camelCase variants
const SENSITIVE_KEYS = [
  'access_token', 'accessToken', 'access-token',
  'refresh_token', 'refreshToken', 'refresh-token',
  'authorization', 'Authorization', 'AUTHORIZATION',
  'password', 'Password', 'PASSWORD',
  'key', 'Key', 'KEY',
  'fingerprint', 'fingerPrint', 'finger-print', 'Fingerprint', 'FINGERPRINT',
  'x-fingerprint', 'x-fingerPrint', 'X-Fingerprint', 'X-FINGERPRINT',
  'deviceFingerprint', 'device_fingerprint', 'device-fingerprint', 'DeviceFingerprint',
  'apikey', 'apiKey', 'api_key', 'api-key', 'API_KEY',
  'token', 'Token', 'TOKEN',
  'bearer', 'Bearer', 'BEARER',
  'sessionToken', 'session_token', 'session-token',
  'userSessionId', 'user_session_id', 'user-session-id',
];
const MASKED_VALUE = '[MASKED]';

// Log types that should have token masking applied
const LOG_TYPES_WITH_MASKING: LogType[] = [
  LogType.LOGIN_LOG,
  LogType.CALL_BACKEND,
  LogType.CLIENT_LOG,
  LogType.INFRA_LOG,
];

/**
 * Masks sensitive tokens/keys in logs to prevent leaking secrets.
 * Applies to LOGIN_LOG, CALL_BACKEND, CLIENT_LOG, and INFRA_LOG.
 * 
 * Handles various formats:
 * - JSON: "accessToken": "eyJ...", "authorization": "Bearer ..."
 * - Key-value: access_token=eyJ..., authorization: Bearer ...
 * - JWT tokens (long base64 strings starting with eyJ)
 */
const maskSensitiveMessage = (logType: LogType, message: string): string => {
  // Only apply masking to specified log types
  if (!LOG_TYPES_WITH_MASKING.includes(logType)) {
    return message;
  }

  let masked = message;

  // Skip if message already contains masked values (avoid double-processing)
  if (masked.includes(MASKED_VALUE)) {
    // Still process to catch any unmasked tokens
    // But be more careful to not re-process already masked content
  }

  // Pattern 1: Match JSON-style key-value pairs: "key": "value" or "key":"value"
  // Handles both quoted and unquoted keys, and long JWT token values
  // Matches: "authorization": "Bearer eyJ...", "accessToken": "eyJ...", etc.
  // IMPORTANT: Match the entire value between quotes, including dots and all base64url chars
  const jsonPattern = new RegExp(
    `(["']?)(${SENSITIVE_KEYS.join('|')})\\1\\s*:\\s*"([^"]+)"`,
    'gi',
  );
  masked = masked.replace(jsonPattern, (match, quote, key, value) => {
    // Skip if already masked
    if (value.includes(MASKED_VALUE)) {
      return match;
    }
    
    // Check if this is a fingerprint-related key
    const isFingerprintKey = /fingerprint|deviceFingerprint/i.test(key);
    
    // Mask if value looks like a token:
    // - JWT tokens: start with "eyJ" and contain exactly 2 dots (header.payload.signature)
    //   JWT format: three base64url-encoded parts separated by dots
    // - Bearer tokens: start with "Bearer " followed by JWT
    // - Long base64url strings that look like tokens (for non-standard formats)
    // - Fingerprint values: long hex/base64 strings (32+ chars) for fingerprint keys
    const isJWT = /^eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/i.test(value);
    const isBearerJWT = /^Bearer\s+eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/i.test(value);
    const isLongJWTLike = /^eyJ/i.test(value) && value.length > 100 && (value.match(/\./g) || []).length >= 2;
    const isLongBearerJWTLike = /^Bearer\s+eyJ/i.test(value) && value.length > 100 && (value.match(/\./g) || []).length >= 2;
    const isVeryLongBase64 = value.length > 200 && /^[A-Za-z0-9_.-]+$/i.test(value);
    // Fingerprint: long hex/base64 string (typically 32-128 chars)
    const isFingerprint = isFingerprintKey && /^[A-Za-z0-9_-]{32,}$/i.test(value);
    
    if (isJWT || isBearerJWT || isLongJWTLike || isLongBearerJWTLike || isVeryLongBase64 || isFingerprint) {
      return `${quote}${key}${quote}: "${MASKED_VALUE}"`;
    }
    return match;
  });

  // Pattern 2: Match key=value or key: value formats (non-JSON, like in headers, cookies, or URLs)
  // Match until we hit a delimiter (semicolon, comma, quote, space, or end of string)
  // Handle hyphenated keys like "x-fingerprint" by not requiring word boundary
  const keyValuePattern = new RegExp(
    `(${SENSITIVE_KEYS.join('|')})\\s*[:=]\\s*([^;,"\\s]+)`,
    'gi',
  );
  masked = masked.replace(keyValuePattern, (match, key, value) => {
    // Skip if already masked
    if (value.includes(MASKED_VALUE)) {
      return match;
    }
    
    // Check if this is a fingerprint-related key
    const isFingerprintKey = /fingerprint|deviceFingerprint/i.test(key);
    
    // Mask if value looks like a token (same logic as Pattern 1)
    const isJWT = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/i.test(value);
    const isBearerJWT = /^Bearer\s+eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/i.test(value);
    const isLongJWTLike = /^eyJ/i.test(value) && value.length > 100 && value.includes('.');
    const isLongBearerJWTLike = /^Bearer\s+eyJ/i.test(value) && value.length > 100 && value.includes('.');
    const isVeryLongBase64 = value.length > 200 && /^[A-Za-z0-9_.-]+$/i.test(value);
    // Fingerprint: long hex/base64 string (typically 32-128 chars)
    const isFingerprint = isFingerprintKey && /^[A-Za-z0-9_-]{32,}$/i.test(value);
    
    if (isJWT || isBearerJWT || isLongJWTLike || isLongBearerJWTLike || isVeryLongBase64 || isFingerprint) {
      // Preserve the original format (key=value or key: value)
      const separator = match.includes(':') ? ':' : '=';
      return `${key}${separator}${MASKED_VALUE}`;
    }
    return match;
  });

  // Pattern 3: Match standalone JWT tokens (eyJ... long base64 strings) that might not have a key
  // JWT format: header.payload.signature (three parts separated by dots)
  // This catches tokens in URLs, headers, or other contexts where they appear without a key
  // Only match if not already masked
  // Use word boundary and ensure we match complete JWT (three parts with dots)
  const jwtPattern = /\b(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/gi;
  masked = masked.replace(jwtPattern, (match) => {
    // Skip if already masked or too short
    if (match.includes(MASKED_VALUE) || match.length < 100) {
      return match;
    }
    // Simple check: if the match is between quotes, it was likely already handled by Pattern 1
    // We'll be conservative and mask it anyway to be safe (Pattern 1 should have caught it first)
    return MASKED_VALUE;
  });

  // Pattern 4: Match "Bearer <token>" patterns specifically (even if not in JSON)
  // This handles cases where Bearer token appears without quotes
  const bearerPattern = /(Bearer\s+)(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/gi;
  masked = masked.replace(bearerPattern, (match, bearer, token) => {
    // Skip if already masked
    if (token.includes(MASKED_VALUE) || match.includes(MASKED_VALUE)) {
      return match;
    }
    // Only mask if token is a reasonable JWT length
    if (token.length >= 100) {
      return `${bearer}${MASKED_VALUE}`;
    }
    return match;
  });

  return masked;
};

/**
 * Check if logging is enabled via environment variable
 * For server: ENABLE_LOGGING=true
 * For client: NEXT_PUBLIC_ENABLE_LOGGING=true
 */
const isLoggingEnabled = (): boolean => {
  if (typeof process !== 'undefined') {
    // Server-side check
    if (process.env?.ENABLE_LOGGING === 'true') {
      return true;
    }
    
    // Client-side check (Next.js bundles process.env for client with NEXT_PUBLIC_ prefix)
    if (process.env?.NEXT_PUBLIC_ENABLE_LOGGING === 'true') {
      return true;
    }
  }
  
  return false;
};

/**
 * Custom logging function that checks if logging is enabled for the given log type
 * Requires ENABLE_LOGGING=true (server) or NEXT_PUBLIC_ENABLE_LOGGING=true (client)
 * Note: Errors and warnings are always logged regardless of ENABLE_LOGGING setting
 * @param logType - The type of logging from LogType enum
 * @param level - The log level (log, info, warn, error, debug)
 * @param message - The message to log
 */
export const loggingCustom = (logType: LogType, level: LogLevel, message: string) => {
  // Errors and warnings are always logged, bypassing ENABLE_LOGGING check
  const isCriticalLevel = level === 'error' || level === 'warn';
  
  // For non-critical levels, check if logging is enabled via environment variable
  if (!isCriticalLevel && !isLoggingEnabled()) {
    return;
  }

  // Check if logging is enabled for this log type
  const isLogEnabled = getLogFlag(logType);
  if (!isLogEnabled) {
    return;
  }

  const prefix = `[${logType}]`;
  const sanitizedMessage = maskSensitiveMessage(logType, message);
  const formattedMessage = `${prefix} ${sanitizedMessage}`;

  switch (level) {
    case 'log':
      console.log(formattedMessage);
      break;
    case 'info':
      console.info(formattedMessage);
      break;
    case 'warn':
      console.warn(formattedMessage);
      break;
    case 'error':
      console.error(formattedMessage);
      break;
    case 'debug':
      console.debug(formattedMessage);
      break;
    default:
      console.log(formattedMessage);
  }
};
