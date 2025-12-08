/**
 * Encrypted LocalStorage Utilities
 * Provides encrypted storage adapter for Zustand persist middleware
 */

import { encryptPayload, decryptPayload, type EncryptedPayload } from '@/gradian-ui/indexdb-manager/utils/crypto';

const STORAGE_PREFIX = 'encrypted:';

/**
 * Create encrypted localStorage adapter for Zustand persist
 * This adapter encrypts data before storing and decrypts when reading
 */
export function createEncryptedStorage() {
  if (typeof window === 'undefined') {
    // Return a no-op storage for SSR
    return {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    };
  }

  return {
    /**
     * Get and decrypt item from localStorage
     */
    getItem: async (name: string): Promise<string | null> => {
      try {
        const storageKey = `${STORAGE_PREFIX}${name}`;
        const stored = localStorage.getItem(storageKey);
        
        if (!stored) {
          // Try to read unencrypted version for migration
          const unencrypted = localStorage.getItem(name);
          if (unencrypted) {
            // Migrate to encrypted storage
            try {
              const parsed = JSON.parse(unencrypted);
              await createEncryptedStorage().setItem(name, unencrypted);
              // Keep unencrypted version for now, will be cleaned up later
            } catch {
              // Ignore migration errors
            }
            return unencrypted;
          }
          return null;
        }

        const encrypted: EncryptedPayload = JSON.parse(stored);
        const decrypted = await decryptPayload<any>(encrypted);
        
        if (decrypted === null) {
          console.warn(`[encrypted-local-storage] Failed to decrypt data for key: ${name}`);
          return null;
        }
        
        return JSON.stringify(decrypted);
      } catch (error) {
        console.error(`[encrypted-local-storage] Error retrieving encrypted data for key "${name}":`, error);
        return null;
      }
    },

    /**
     * Encrypt and store item in localStorage
     * Zustand persist middleware serializes state to JSON string before calling this
     */
    setItem: async (name: string, value: string): Promise<void> => {
      try {
        // Ensure value is a string (Zustand persist should pass JSON string)
        let valueString: string;
        if (typeof value === 'string') {
          valueString = value;
          // Check if it's the problematic "[object Object]" string
          if (valueString === '[object Object]') {
            console.error(`[encrypted-local-storage] Received "[object Object]" string for key "${name}". This indicates a serialization issue.`);
            // Skip encryption and fallback to unencrypted
            localStorage.setItem(name, '{}');
            return;
          }
        } else if (value === null || value === undefined) {
          // Handle null/undefined
          localStorage.removeItem(`${STORAGE_PREFIX}${name}`);
          localStorage.removeItem(name);
          return;
        } else {
          // Convert object to JSON string if needed (shouldn't happen with Zustand persist)
          try {
            valueString = JSON.stringify(value);
          } catch (stringifyError) {
            console.error(`[encrypted-local-storage] Failed to stringify value for key "${name}":`, stringifyError);
            // Fallback: try to store empty object
            localStorage.setItem(name, '{}');
            return;
          }
        }

        // Validate that valueString is valid JSON before parsing
        if (!valueString || valueString.trim() === '') {
          console.warn(`[encrypted-local-storage] Empty value for key "${name}"`);
          localStorage.removeItem(`${STORAGE_PREFIX}${name}`);
          localStorage.removeItem(name);
          return;
        }

        // Parse the JSON string to get the actual data
        // Zustand persist wraps state in { state: {...}, version: 0 }
        let parsed: any;
        try {
          parsed = JSON.parse(valueString);
        } catch (parseError) {
          console.error(`[encrypted-local-storage] Failed to parse JSON for key "${name}":`, parseError);
          console.error(`[encrypted-local-storage] Value that failed to parse:`, valueString.substring(0, 200));
          // Fallback to unencrypted storage if parsing fails
          localStorage.setItem(name, valueString);
          return;
        }
        
        // Encrypt the parsed data
        const encrypted = await encryptPayload(parsed);
        
        if (!encrypted) {
          console.warn(`[encrypted-local-storage] Failed to encrypt data for key: ${name}`);
          // Fallback to unencrypted storage if encryption fails
          localStorage.setItem(name, valueString);
          return;
        }

        const storageKey = `${STORAGE_PREFIX}${name}`;
        localStorage.setItem(storageKey, JSON.stringify(encrypted));
        
        // Remove unencrypted version if it exists (migration cleanup)
        if (localStorage.getItem(name)) {
          localStorage.removeItem(name);
        }
      } catch (error) {
        console.error(`[encrypted-local-storage] Error storing encrypted data for key "${name}":`, error);
        // Fallback to unencrypted storage if encryption fails
        try {
          const valueString = typeof value === 'string' ? value : JSON.stringify(value);
          if (valueString && valueString !== '[object Object]') {
            localStorage.setItem(name, valueString);
          }
        } catch (fallbackError) {
          console.error(`[encrypted-local-storage] Fallback storage also failed for key "${name}":`, fallbackError);
        }
      }
    },

    /**
     * Remove item from localStorage (both encrypted and unencrypted versions)
     */
    removeItem: async (name: string): Promise<void> => {
      try {
        const storageKey = `${STORAGE_PREFIX}${name}`;
        localStorage.removeItem(storageKey);
        // Also remove unencrypted version if it exists
        localStorage.removeItem(name);
      } catch (error) {
        console.error(`[encrypted-local-storage] Error removing encrypted data for key "${name}":`, error);
      }
    },
  };
}

