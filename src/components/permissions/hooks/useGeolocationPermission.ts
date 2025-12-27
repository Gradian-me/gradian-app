'use client';

import { useState, useEffect, useCallback } from 'react';
import { requestGeolocationPermission } from '../utils';

export interface UseGeolocationPermissionReturn {
  isSupported: boolean;
  isRequesting: boolean;
  error: string | null;
  request: () => Promise<boolean>;
}

/**
 * Hook to request geolocation permission
 */
export const useGeolocationPermission = (): UseGeolocationPermissionReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsSupported(typeof navigator !== 'undefined' && 'geolocation' in navigator);
  }, []);

  const request = useCallback(async (): Promise<boolean> => {
    setIsRequesting(true);
    setError(null);
    
    const result = await requestGeolocationPermission();
    setError(result.error);
    setIsRequesting(false);
    return result.granted;
  }, []);

  return {
    isSupported,
    isRequesting,
    error,
    request,
  };
};

