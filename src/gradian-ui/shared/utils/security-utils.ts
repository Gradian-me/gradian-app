/**
 * Security Utilities
 * Shared security helper functions for preventing common vulnerabilities
 */

/**
 * Prototype pollution protection keys
 */
const PROTOTYPE_POLLUTION_KEYS = ['__proto__', 'constructor', 'prototype'] as const;

/**
 * Check if a key is a prototype pollution key
 */
export function isPrototypePollutionKey(key: string): boolean {
  return PROTOTYPE_POLLUTION_KEYS.includes(key as typeof PROTOTYPE_POLLUTION_KEYS[number]);
}

/**
 * Safely get a property from an object, preventing prototype pollution
 * @param obj - The object to access
 * @param key - The property key
 * @returns The property value or undefined if key is unsafe or doesn't exist
 */
export function safeGetProperty(obj: any, key: string): any {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  // SECURITY: Block prototype pollution keys
  if (isPrototypePollutionKey(key)) {
    return undefined;
  }

  // SECURITY: Use hasOwnProperty to prevent prototype chain access
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      return undefined;
    }
  }

  return obj[key];
}

/**
 * Safely access nested object properties using a path, preventing prototype pollution
 * @param obj - The root object
 * @param path - Dot-separated path (e.g., "user.profile.name")
 * @returns The value at the path or undefined
 */
export function safeGetByPath(obj: any, path: string): any {
  if (!path || typeof path !== 'string') {
    return obj;
  }

  const parts = path.split('.').filter(Boolean);
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // SECURITY: Block prototype pollution keys
    if (isPrototypePollutionKey(part)) {
      return undefined;
    }

    // SECURITY: Use hasOwnProperty for object access
    if (typeof current === 'object' && !Array.isArray(current)) {
      if (!Object.prototype.hasOwnProperty.call(current, part)) {
        return undefined;
      }
    }

    // SECURITY: Safe property access - part is validated above to not be a prototype pollution key
    // and hasOwnProperty check ensures it exists on the object (not from prototype chain)
    // nosemgrep: javascript.lang.security.audit.prototype-pollution.prototype-pollution-loop
    current = current[part];
  }

  return current;
}

/**
 * Safely iterate over object keys, excluding prototype pollution keys
 * @param obj - The object to iterate
 * @returns Array of safe keys
 */
export function safeObjectKeys(obj: any): string[] {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return [];
  }

  // SECURITY: Use Object.keys() instead of for...in to avoid prototype chain
  // Filter out prototype pollution keys as an extra safety measure
  return Object.keys(obj).filter(key => !isPrototypePollutionKey(key));
}

/**
 * Safely iterate over object entries, excluding prototype pollution keys
 * @param obj - The object to iterate
 * @returns Array of [key, value] pairs with safe keys only
 */
export function safeObjectEntries<T = any>(obj: Record<string, T> | null | undefined): Array<[string, T]> {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return [];
  }

  // SECURITY: Use Object.entries() instead of for...in to avoid prototype chain
  // Filter out prototype pollution keys as an extra safety measure
  return Object.entries(obj).filter(([key]) => !isPrototypePollutionKey(key));
}

/**
 * Validate and sanitize a file path to prevent path traversal attacks
 * @param filePath - The file path to validate
 * @param baseDir - The base directory that the path must be within
 * @returns The resolved absolute path if valid, null otherwise
 */
export function validateFilePath(filePath: string, baseDir: string): string | null {
  if (!filePath || typeof filePath !== 'string') {
    return null;
  }

  // SECURITY: Normalize path separators and remove path traversal sequences
  // This prevents attacks like ../../../etc/passwd
  const normalized = filePath.replace(/\\/g, '/').replace(/\.\./g, '');

  try {
    const path = require('path');
    const resolvedBase = path.resolve(baseDir);
    const resolvedPath = path.resolve(baseDir, normalized);

    // SECURITY: Ensure resolved path is within base directory
    // This prevents directory traversal even after normalization
    if (!resolvedPath.startsWith(resolvedBase)) {
      return null;
    }

    // SECURITY: Additional check to ensure no remaining dangerous patterns
    if (resolvedPath.includes('..') || resolvedPath.includes('//')) {
      return null;
    }

    return resolvedPath;
  } catch {
    return null;
  }
}

/**
 * Validate URL to prevent SSRF attacks
 * Only allows HTTP/HTTPS protocols and blocks dangerous hosts
 * @param url - The URL to validate
 * @param allowedOrigins - Optional list of allowed origins (if empty, blocks localhost/private IPs)
 * @returns Object with valid flag and sanitized URL or error message
 */
export function validateUrl(url: string, allowedOrigins?: string[]): { valid: boolean; sanitized?: string; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  try {
    const parsed = new URL(url);

    // SECURITY: Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // SECURITY: Block localhost and private IP ranges (SSRF protection)
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '[::1]',
    ];

    if (blockedHosts.includes(hostname)) {
      return { valid: false, error: 'Localhost and loopback addresses are not allowed' };
    }

    // SECURITY: Block private IP ranges
    const privateIpPatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^fc00:/,
      /^fe80:/,
    ];

    if (privateIpPatterns.some(pattern => pattern.test(hostname))) {
      return { valid: false, error: 'Private IP ranges are not allowed' };
    }

    // If allowedOrigins provided, validate against them
    if (allowedOrigins && allowedOrigins.length > 0) {
      const isAllowed = allowedOrigins.some(origin => {
        try {
          const allowedUrl = new URL(origin);
          return parsed.origin === allowedUrl.origin;
        } catch {
          return false;
        }
      });

      if (!isAllowed) {
        return { valid: false, error: 'URL origin not in allowed list' };
      }
    }

    return { valid: true, sanitized: parsed.href };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Generate a cryptographically secure random string
 * Uses crypto.randomBytes for security-critical IDs
 * @param length - Length of the random string (default: 16)
 * @returns Cryptographically secure random string
 */
export function generateSecureId(length: number = 16): string {
  try {
    // SECURITY: Use crypto.randomBytes for cryptographically secure randomness
    // Fallback to crypto.getRandomValues for browser environments
    if (typeof require !== 'undefined') {
      const crypto = require('crypto');
      return crypto.randomBytes(length).toString('hex');
    } else if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint8Array(length);
      window.crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback (not secure, but better than throwing)
      console.warn('[SECURITY] Crypto API not available, using Math.random() fallback');
      return Math.random().toString(36).substring(2, 2 + length);
    }
  } catch (error) {
    // Fallback (not secure, but better than throwing)
    console.warn('[SECURITY] Crypto API error, using Math.random() fallback:', error);
    return Math.random().toString(36).substring(2, 2 + length);
  }
}
