/**
 * Hook for managing encrypted sessionStorage
 * Automatically syncs with sessionStorage and handles encryption/decryption
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  setEncryptedSessionStorage,
  getEncryptedSessionStorage,
  removeEncryptedSessionStorage,
  onEncryptedSessionStorageChange,
  notifyEncryptedSessionStorageChange,
} from '../utils/session-storage-encrypted';

export function useEncryptedSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => Promise<void>, () => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialMountRef = useRef(true);

  // Load initial value from sessionStorage
  useEffect(() => {
    let isMounted = true;

    const loadValue = async () => {
      try {
        const encrypted = await getEncryptedSessionStorage<T>(key);
        if (isMounted) {
          if (encrypted !== null) {
            setStoredValue(encrypted);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error(`[useEncryptedSessionStorage] Error loading value for key "${key}":`, error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadValue();

    return () => {
      isMounted = false;
    };
  }, [key]);

  // Listen for changes from other tabs/windows or manual updates
  useEffect(() => {
    const cleanup = onEncryptedSessionStorageChange(key, (newValue: T) => {
      setStoredValue(newValue);
    });

    return cleanup;
  }, [key]);

  // Save value to encrypted sessionStorage
  const setValue = useCallback(
    async (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        
        const success = await setEncryptedSessionStorage(key, valueToStore);
        if (success) {
          // Notify other components about the change
          notifyEncryptedSessionStorageChange(key, valueToStore);
        } else {
          console.warn(`[useEncryptedSessionStorage] Failed to save encrypted value for key "${key}"`);
        }
      } catch (error) {
        console.error(`[useEncryptedSessionStorage] Error setting value for key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove value from sessionStorage
  const removeValue = useCallback(() => {
    removeEncryptedSessionStorage(key);
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

