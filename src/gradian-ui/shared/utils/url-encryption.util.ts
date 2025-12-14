/**
 * URL Encryption Utilities
 * Edge-compatible encryption for URL parameters
 * Uses base64url encoding with timestamp and validation
 */

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
    console.error('[url-encryption] Failed to encrypt return URL:', error);
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
    console.warn('[url-encryption] Invalid encrypted URL: empty or not a string');
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
      console.warn('[url-encryption] Invalid base64 encoding:', {
        error: base64Error instanceof Error ? base64Error.message : String(base64Error),
        encryptedLength: encrypted.length,
        encryptedPreview: encrypted.substring(0, 50),
      });
      return null;
    }

    // Validate that decoded string looks like JSON
    if (!json.trim().startsWith('{')) {
      console.warn('[url-encryption] Decoded string does not appear to be JSON:', {
        decodedPreview: json.substring(0, 50),
        decodedLength: json.length,
      });
      // Try simple fallback decoding (might be old format)
      return trySimpleDecoding(encrypted);
    }

    let payload: { url?: string; timestamp?: number };
    try {
      payload = JSON.parse(json);
    } catch (jsonError) {
      console.warn('[url-encryption] Failed to parse JSON:', {
        error: jsonError instanceof Error ? jsonError.message : String(jsonError),
        jsonPreview: json.substring(0, 100),
      });
      // Try simple fallback decoding (might be old format)
      return trySimpleDecoding(encrypted);
    }

    // Validate timestamp (expires after 1 hour = 3600000ms)
    const MAX_AGE = 3600000; // 1 hour
    if (payload.timestamp) {
      const age = Date.now() - payload.timestamp;
      if (age > MAX_AGE) {
        console.warn('[url-encryption] Return URL expired', {
          age: `${Math.round(age / 1000)}s`,
          maxAge: `${MAX_AGE / 1000}s`,
        });
        return null;
      }
    }

    // Validate URL format
    if (!payload.url || typeof payload.url !== 'string') {
      console.warn('[url-encryption] Invalid return URL format in payload:', {
        hasUrl: !!payload.url,
        urlType: typeof payload.url,
      });
      return null;
    }

    // Security: Only allow relative URLs (prevent open redirect)
    if (payload.url.startsWith('http://') || payload.url.startsWith('https://')) {
      console.warn('[url-encryption] Absolute URLs not allowed for security');
      return null;
    }

    // Security: Only allow paths starting with /
    if (!payload.url.startsWith('/')) {
      console.warn('[url-encryption] Invalid URL format (must start with /):', payload.url);
      return null;
    }

    return payload.url;
  } catch (error) {
    console.error('[url-encryption] Unexpected error decrypting return URL:', {
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : undefined,
      encryptedLength: encrypted.length,
      encryptedPreview: encrypted.substring(0, 50),
    });
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
      console.log('[url-encryption] Successfully decoded using simple fallback');
      return decoded;
    }
    console.warn('[url-encryption] Simple fallback decoded but URL format invalid:', {
      decodedPreview: decoded.substring(0, 50),
    });
  } catch (fallbackError) {
    console.warn('[url-encryption] Simple fallback decoding failed:', {
      error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
    });
  }
  return null;
}

