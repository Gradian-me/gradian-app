/**
 * Skip Key Storage Utilities
 * Encrypts and stores NEXT_PUBLIC_SKIP_KEY in localStorage for secure use in API calls
 */

import { encryptPayload } from '@/gradian-ui/indexdb-manager/utils/crypto';

const SKIP_KEY_STORAGE_KEY = 'skip_key';

/**
 * Initialize skip key storage by encrypting NEXT_PUBLIC_SKIP_KEY and storing it
 * Should be called on app initialization
 */
export async function initializeSkipKeyStorage(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const skipKey = process.env.NEXT_PUBLIC_SKIP_KEY;
    if (!skipKey) {
      console.warn('[skip-key-storage] NEXT_PUBLIC_SKIP_KEY is not defined in environment variables');
      return false;
    }

    // Check if we already have an encrypted key stored
    const existing = localStorage.getItem(SKIP_KEY_STORAGE_KEY);
    if (existing) {
      // Key already exists, no need to re-encrypt
      return true;
    }

    // Encrypt the skip key and store it
    const encrypted = await encryptPayload(skipKey);
    if (!encrypted) {
      console.error('[skip-key-storage] Failed to encrypt skip key');
      return false;
    }

    localStorage.setItem(SKIP_KEY_STORAGE_KEY, JSON.stringify(encrypted));
    return true;
  } catch (error) {
    console.error('[skip-key-storage] Error initializing skip key storage:', error);
    return false;
  }
}

/**
 * Get the encrypted skip key from localStorage
 * @param encodeForUrl - If true, URL encodes the value (for query parameters). If false, returns parsed object (for request body).
 * @returns For body: Returns the encrypted payload as an object. For URL: Returns URL-encoded JSON string.
 */
export function getEncryptedSkipKey(encodeForUrl: boolean = false): string | Record<string, string> | null {
  if (typeof window === 'undefined') {
    console.warn('[skip-key-storage] getEncryptedSkipKey called on server side');
    return null;
  }

  try {
    const stored = localStorage.getItem(SKIP_KEY_STORAGE_KEY);
    if (!stored) {
      console.warn('[skip-key-storage] No encrypted skip key found in localStorage. Make sure NEXT_PUBLIC_SKIP_KEY is set and initializeSkipKeyStorage() has been called.');
      return null;
    }

    // Parse the stored JSON string
    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(stored);
    } catch (e) {
      console.error('[skip-key-storage] Stored skip key is not valid JSON:', e);
      return null;
    }

    // Validate structure
    if (!parsed || typeof parsed !== 'object' || !parsed.ciphertext || !parsed.iv) {
      console.error('[skip-key-storage] Stored skip key does not have required structure (ciphertext, iv)');
      return null;
    }

    console.log('[skip-key-storage] Retrieved encrypted skip key:', {
      encodeForUrl,
      hasCiphertext: !!parsed.ciphertext,
      hasIv: !!parsed.iv,
    });

    // For body: return as object (will be properly JSON.stringify'd by apiRequest)
    // For URL: return as URL-encoded JSON string
    if (encodeForUrl) {
      return encodeURIComponent(stored);
    } else {
      return parsed;
    }
  } catch (error) {
    console.error('[skip-key-storage] Error retrieving encrypted skip key:', error);
    return null;
  }
}

