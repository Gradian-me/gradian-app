'use client';

import { useState, useCallback } from 'react';
import type { MediaDeviceType } from '../types';
import {
  requestMicrophonePermission,
  requestCameraPermission,
  requestMediaDevicePermission,
} from '../utils';

export interface UseMediaPermissionReturn {
  isRequesting: boolean;
  error: string | null;
  requestMicrophone: () => Promise<boolean>;
  requestCamera: () => Promise<boolean>;
  requestMediaDevice: (type: MediaDeviceType) => Promise<boolean>;
}

/**
 * Hook to request media device permissions
 */
export const useMediaPermission = (): UseMediaPermissionReturn => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestMicrophone = useCallback(async (): Promise<boolean> => {
    setIsRequesting(true);
    setError(null);
    
    const result = await requestMicrophonePermission();
    setError(result.error);
    setIsRequesting(false);
    return result.granted;
  }, []);

  const requestCamera = useCallback(async (): Promise<boolean> => {
    setIsRequesting(true);
    setError(null);
    
    const result = await requestCameraPermission();
    setError(result.error);
    setIsRequesting(false);
    return result.granted;
  }, []);

  const requestMediaDevice = useCallback(async (type: MediaDeviceType): Promise<boolean> => {
    setIsRequesting(true);
    setError(null);
    
    const result = await requestMediaDevicePermission(type);
    setError(result.error);
    setIsRequesting(false);
    return result.granted;
  }, []);

  return {
    isRequesting,
    error,
    requestMicrophone,
    requestCamera,
    requestMediaDevice,
  };
};

