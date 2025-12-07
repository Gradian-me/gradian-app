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
  try {
    // Convert base64url back to base64
    let base64 = encrypted.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }

    // Decode from base64
    const json = atob(base64);
    const payload = JSON.parse(json);

    // Validate timestamp (expires after 1 hour = 3600000ms)
    const MAX_AGE = 3600000; // 1 hour
    const age = Date.now() - payload.timestamp;
    if (age > MAX_AGE) {
      console.warn('[url-encryption] Return URL expired');
      return null;
    }

    // Validate URL format
    if (!payload.url || typeof payload.url !== 'string') {
      console.warn('[url-encryption] Invalid return URL format');
      return null;
    }

    // Security: Only allow relative URLs (prevent open redirect)
    if (payload.url.startsWith('http://') || payload.url.startsWith('https://')) {
      console.warn('[url-encryption] Absolute URLs not allowed for security');
      return null;
    }

    // Security: Only allow paths starting with /
    if (!payload.url.startsWith('/')) {
      console.warn('[url-encryption] Invalid URL format (must start with /)');
      return null;
    }

    return payload.url;
  } catch (error) {
    console.error('[url-encryption] Failed to decrypt return URL:', error);
    // Try simple fallback decoding
    try {
      let base64 = encrypted.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const decoded = atob(base64);
      // Validate it's a relative URL
      if (decoded.startsWith('/') && !decoded.startsWith('http')) {
        return decoded;
      }
    } catch (fallbackError) {
      console.error('[url-encryption] Fallback decoding also failed:', fallbackError);
    }
    return null;
  }
}

