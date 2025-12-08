/**
 * Encrypted LocalStorage Utilities
 * Provides encrypted storage adapter for Zustand persist middleware
 */

import { encryptPayload, decryptPayload, type EncryptedPayload } from '@/gradian-ui/indexdb-manager/utils/crypto';
import type { PersistStorage, StorageValue } from 'zustand/middleware';

const STORAGE_PREFIX = 'encrypted:';

/**
 * Create encrypted localStorage adapter for Zustand persist
 * This adapter encrypts data before storing and decrypts when reading
 */
export function createEncryptedStorage<T = any>(): PersistStorage<T> {
  if (typeof window === 'undefined') {
    // Return a no-op storage for SSR
    return {
      getItem: async () => null as StorageValue<T> | null,
      setItem: async () => {},
      removeItem: async () => {},
    };
  }

  return {
    /**
     * Get and decrypt item from localStorage
     * Returns StorageValue<T> which is { state: T, version?: number }
     */
    getItem: async (name: string): Promise<StorageValue<T> | null> => {
      try {
        const storageKey = `${STORAGE_PREFIX}${name}`;
        const stored = localStorage.getItem(storageKey);
        
        if (!stored) {
          // Try to read unencrypted version for migration
          const unencrypted = localStorage.getItem(name);
          if (unencrypted) {
            // Migrate to encrypted storage
            try {
              const parsed: StorageValue<T> = JSON.parse(unencrypted);
              const storage = createEncryptedStorage<T>();
              await storage.setItem(name, parsed);
              // Keep unencrypted version for now, will be cleaned up later
            } catch {
              // Ignore migration errors
            }
            try {
              return JSON.parse(unencrypted) as StorageValue<T>;
            } catch {
              return null;
            }
          }
          return null;
        }

        const encrypted: EncryptedPayload = JSON.parse(stored);
        const decrypted = await decryptPayload<StorageValue<T>>(encrypted);
        
        if (decrypted === null) {
          console.warn(`[encrypted-local-storage] Failed to decrypt data for key: ${name}`);
          return null;
        }
        
        return decrypted;
      } catch (error) {
        console.error(`[encrypted-local-storage] Error retrieving encrypted data for key "${name}":`, error);
        return null;
      }
    },

    /**
     * Encrypt and store item in localStorage
     * Zustand persist passes StorageValue<T> which is { state: T, version?: number }
     */
    setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
      try {
        // Validate that value is a StorageValue object
        if (!value || typeof value !== 'object') {
          console.error(`[encrypted-local-storage] Invalid value type for key "${name}":`, typeof value);
          return;
        }

        // Check if it has the expected structure
        if (!('state' in value)) {
          console.error(`[encrypted-local-storage] Value missing 'state' property for key "${name}"`);
          return;
        }
        
        // Encrypt the StorageValue object directly
        const encrypted = await encryptPayload(value);
        
        if (!encrypted) {
          console.warn(`[encrypted-local-storage] Failed to encrypt data for key: ${name}`);
          // Fallback to unencrypted storage if encryption fails
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (fallbackError) {
            console.error(`[encrypted-local-storage] Fallback storage also failed for key "${name}":`, fallbackError);
          }
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
          localStorage.setItem(name, JSON.stringify(value));
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

