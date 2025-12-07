/**
 * Encrypted Session Storage Utilities
 * Provides functions to store and retrieve encrypted data from sessionStorage
 */

import { encryptPayload, decryptPayload, type EncryptedPayload } from '@/gradian-ui/indexdb-manager/utils/crypto';

const STORAGE_PREFIX = 'encrypted:';

/**
 * Store encrypted data in sessionStorage
 */
export async function setEncryptedSessionStorage<T>(key: string, value: T): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const encrypted = await encryptPayload(value);
    if (!encrypted) {
      console.warn(`[encrypted-session-storage] Failed to encrypt data for key: ${key}`);
      return false;
    }

    const storageKey = `${STORAGE_PREFIX}${key}`;
    sessionStorage.setItem(storageKey, JSON.stringify(encrypted));
    return true;
  } catch (error) {
    console.error(`[encrypted-session-storage] Error storing encrypted data for key "${key}":`, error);
    return false;
  }
}

/**
 * Retrieve and decrypt data from sessionStorage
 */
export async function getEncryptedSessionStorage<T>(key: string): Promise<T | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storageKey = `${STORAGE_PREFIX}${key}`;
    const stored = sessionStorage.getItem(storageKey);
    
    if (!stored) {
      return null;
    }

    const encrypted: EncryptedPayload = JSON.parse(stored);
    const decrypted = await decryptPayload<T>(encrypted);
    
    return decrypted;
  } catch (error) {
    console.error(`[encrypted-session-storage] Error retrieving encrypted data for key "${key}":`, error);
    return null;
  }
}

/**
 * Remove encrypted data from sessionStorage
 */
export function removeEncryptedSessionStorage(key: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const storageKey = `${STORAGE_PREFIX}${key}`;
  sessionStorage.removeItem(storageKey);
}

/**
 * Check if encrypted data exists in sessionStorage
 */
export function hasEncryptedSessionStorage(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const storageKey = `${STORAGE_PREFIX}${key}`;
  return sessionStorage.getItem(storageKey) !== null;
}

/**
 * Listen for changes to encrypted sessionStorage (from other tabs/windows)
 * Note: sessionStorage doesn't fire storage events for same-origin tabs,
 * but this can be used to listen for manual updates
 */
export function onEncryptedSessionStorageChange(
  key: string,
  callback: (newValue: any) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const storageKey = `${STORAGE_PREFIX}${key}`;
  
  const handleStorageChange = async (e: StorageEvent) => {
    if (e.key === storageKey && e.newValue) {
      try {
        const encrypted: EncryptedPayload = JSON.parse(e.newValue);
        const decrypted = await decryptPayload(encrypted);
        if (decrypted) {
          callback(decrypted);
        }
      } catch (error) {
        console.error(`[encrypted-session-storage] Error handling storage change for key "${key}":`, error);
      }
    }
  };

  // Listen for storage events (from other tabs/windows)
  window.addEventListener('storage', handleStorageChange);
  
  // Also listen for custom events (for same-tab updates)
  const customEventName = `encrypted-session-storage-change:${key}`;
  const handleCustomEvent = async (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };
  
  window.addEventListener(customEventName, handleCustomEvent);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener(customEventName, handleCustomEvent);
  };
}

/**
 * Dispatch a custom event to notify about encrypted sessionStorage changes
 * This is useful for same-tab updates
 */
export function notifyEncryptedSessionStorageChange(key: string, value: any): void {
  if (typeof window === 'undefined') {
    return;
  }

  const customEventName = `encrypted-session-storage-change:${key}`;
  window.dispatchEvent(new CustomEvent(customEventName, { detail: value }));
}

