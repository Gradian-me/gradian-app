'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PermissionName, PermissionStatus } from '../types';
import { queryPermission, isPermissionsAPISupported } from '../utils';

export interface UsePermissionReturn {
  status: PermissionStatus | null;
  error: string | null;
  isSupported: boolean;
  isLoading: boolean;
  check: () => Promise<void>;
}

/**
 * Hook to check and monitor permission status
 * Automatically listens for permission changes
 */
export const usePermission = (name: PermissionName): UsePermissionReturn => {
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const permissionStatusRef = useRef<PermissionStatus | null>(null);

  const check = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const result = await queryPermission(name);
    setStatus(result.status);
    setError(result.error);
    setIsSupported(result.isSupported);
    permissionStatusRef.current = result.status;
    setIsLoading(false);
  }, [name]);

  useEffect(() => {
    check();

    // Listen for permission changes if Permissions API is supported
    if (isPermissionsAPISupported()) {
      let permissionStatus: PermissionStatus | null = null;
      
      const setupListener = async () => {
        try {
          const result = await navigator.permissions.query({ name: name as PermissionName });
          permissionStatus = result.state as PermissionStatus;
          
          // Listen for changes
          result.onchange = () => {
            const newStatus = result.state as PermissionStatus;
            if (newStatus !== permissionStatusRef.current) {
              permissionStatusRef.current = newStatus;
              setStatus(newStatus);
            }
          };
        } catch (err) {
          // Permission query failed, but we already handled this in check()
        }
      };

      setupListener();

      // Also set up a periodic check as a fallback (every 5 seconds)
      // This helps catch changes that might not trigger the onchange event
      // Only check if status is prompt or null (not yet determined)
      const intervalId = setInterval(() => {
        if (permissionStatusRef.current === 'prompt' || permissionStatusRef.current === null) {
          check();
        }
      }, 5000);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [check, name]);

  return {
    status,
    error,
    isSupported,
    isLoading,
    check,
  };
};

