/**
 * URL Encryption Utilities
 * Edge-compatible encryption for URL parameters
 * Uses base64url encoding with timestamp and validation
 */

import { loggingCustom } from './logging-custom';
import { LogType } from '../constants/application-variables';

/**
 * Encrypt/encode a return URL for use in query parameters
 * This is not true encryption but provides obfuscation and validation
 */
export function encryptReturnUrl(url: string): string {
  try {
    // Add timestamp for validation
    const payload = {
      url,
      timestamp: Date.now(),
    };

    // Encode to base64url (URL-safe base64)
    const json = JSON.stringify(payload);
    const base64 = btoa(json);
    // Convert to base64url (replace + with -, / with _, remove = padding)
    const base64url = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return base64url;
  } catch (error) {
    loggingCustom(LogType.CLIENT_LOG, 'error', `[url-encryption] Failed to encrypt return URL: ${error instanceof Error ? error.message : String(error)}`);
    // Fallback to simple encoding
    return btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}

/**
 * Decrypt/decode a return URL from query parameters
 * Validates the timestamp (expires after 1 hour)
 */
export function decryptReturnUrl(encrypted: string): string | null {
  if (!encrypted || typeof encrypted !== 'string' || encrypted.trim().length === 0) {
    loggingCustom(LogType.CLIENT_LOG, 'warn', '[url-encryption] Invalid encrypted URL: empty or not a string');
    return null;
  }

  try {
    // Convert base64url back to base64
    let base64 = encrypted.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }

    // Decode from base64
    let json: string;
    try {
      json = atob(base64);
    } catch (base64Error) {
      loggingCustom(LogType.CLIENT_LOG, 'warn', `[url-encryption] Invalid base64 encoding: ${JSON.stringify({
        error: base64Error instanceof Error ? base64Error.message : String(base64Error),
        encryptedLength: encrypted.length,
        encryptedPreview: encrypted.substring(0, 50),
      })}`);
      return null;
    }

    // Validate that decoded string looks like JSON
    if (!json.trim().startsWith('{')) {
      loggingCustom(LogType.CLIENT_LOG, 'warn', `[url-encryption] Decoded string does not appear to be JSON: ${JSON.stringify({
        decodedPreview: json.substring(0, 50),
        decodedLength: json.length,
      })}`);
      // Try simple fallback decoding (might be old format)
      return trySimpleDecoding(encrypted);
    }

    let payload: { url?: string; timestamp?: number };
    try {
      payload = JSON.parse(json);
    } catch (jsonError) {
      loggingCustom(LogType.CLIENT_LOG, 'warn', `[url-encryption] Failed to parse JSON: ${JSON.stringify({
        error: jsonError instanceof Error ? jsonError.message : String(jsonError),
        jsonPreview: json.substring(0, 100),
      })}`);
      // Try simple fallback decoding (might be old format)
      return trySimpleDecoding(encrypted);
    }

    // Validate timestamp (expires after 1 hour = 3600000ms)
    const MAX_AGE = 3600000; // 1 hour
    if (payload.timestamp) {
      const age = Date.now() - payload.timestamp;
      if (age > MAX_AGE) {
        loggingCustom(LogType.CLIENT_LOG, 'warn', `[url-encryption] Return URL expired: ${JSON.stringify({
          age: `${Math.round(age / 1000)}s`,
          maxAge: `${MAX_AGE / 1000}s`,
        })}`);
        return null;
      }
    }

    // Validate URL format
    if (!payload.url || typeof payload.url !== 'string') {
      loggingCustom(LogType.CLIENT_LOG, 'warn', `[url-encryption] Invalid return URL format in payload: ${JSON.stringify({
        hasUrl: !!payload.url,
        urlType: typeof payload.url,
      })}`);
      return null;
    }

    // Security: Only allow relative URLs (prevent open redirect)
    if (payload.url.startsWith('http://') || payload.url.startsWith('https://')) {
      loggingCustom(LogType.CLIENT_LOG, 'warn', '[url-encryption] Absolute URLs not allowed for security');
      return null;
    }

    // Security: Only allow paths starting with /
    if (!payload.url.startsWith('/')) {
      loggingCustom(LogType.CLIENT_LOG, 'warn', `[url-encryption] Invalid URL format (must start with /): ${payload.url}`);
      return null;
    }

    return payload.url;
  } catch (error) {
    loggingCustom(LogType.CLIENT_LOG, 'error', `[url-encryption] Unexpected error decrypting return URL: ${JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : undefined,
      encryptedLength: encrypted.length,
      encryptedPreview: encrypted.substring(0, 50),
    })}`);
    // Try simple fallback decoding
    return trySimpleDecoding(encrypted);
  }
}

/**
 * Try simple base64 decoding (for backward compatibility with old format)
 */
function trySimpleDecoding(encrypted: string): string | null {
  try {
    let base64 = encrypted.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = atob(base64);
    // Validate it's a relative URL
    if (decoded.startsWith('/') && !decoded.startsWith('http')) {
      loggingCustom(LogType.CLIENT_LOG, 'log', '[url-encryption] Successfully decoded using simple fallback');
      return decoded;
    }
    loggingCustom(LogType.CLIENT_LOG, 'warn', `[url-encryption] Simple fallback decoded but URL format invalid: ${JSON.stringify({
      decodedPreview: decoded.substring(0, 50),
    })}`);
  } catch (fallbackError) {
    loggingCustom(LogType.CLIENT_LOG, 'warn', `[url-encryption] Simple fallback decoding failed: ${JSON.stringify({
      error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
    })}`);
  }
  return null;
}

