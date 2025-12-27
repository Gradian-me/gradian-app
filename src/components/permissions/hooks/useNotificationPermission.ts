'use client';

import { useState, useEffect, useCallback } from 'react';
import { requestNotificationPermission } from '../utils';

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied';

export interface UseNotificationPermissionReturn {
  status: NotificationPermissionStatus | null;
  isSupported: boolean;
  isRequesting: boolean;
  error: string | null;
  request: () => Promise<boolean>;
  check: () => void;
}

/**
 * Hook to check and request notification permission
 */
export const useNotificationPermission = (): UseNotificationPermissionReturn => {
  const [status, setStatus] = useState<NotificationPermissionStatus | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setStatus(Notification.permission as NotificationPermissionStatus);
    } else {
      setIsSupported(false);
      setStatus(null);
    }
  }, []);

  const request = useCallback(async (): Promise<boolean> => {
    setIsRequesting(true);
    setError(null);
    
    const result = await requestNotificationPermission();
    setError(result.error);
    check(); // Refresh status after request
    setIsRequesting(false);
    return result.granted;
  }, [check]);

  useEffect(() => {
    check();
  }, [check]);

  return {
    status,
    isSupported,
    isRequesting,
    error,
    request,
    check,
  };
};

