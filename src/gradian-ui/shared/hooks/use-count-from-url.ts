'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '../utils/api';

export interface UseCountFromUrlOptions {
  /** Poll interval in ms. Set to 0 to disable. Default 60_000. */
  pollIntervalMs?: number;
  /** Refetch when tab becomes visible. Default true. */
  refetchOnFocus?: boolean;
  /** Initial value before first fetch. Default 0. */
  initialCount?: number;
}

const DEFAULT_POLL_INTERVAL_MS = 60_000;

/**
 * Fetches a numeric count from a GET endpoint that returns { success: boolean, data: number }.
 * Reusable for favicon badge or any tab that needs a count from an API.
 */
export function useCountFromUrl(
  url: string | null,
  options: UseCountFromUrlOptions = {}
) {
  const {
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    refetchOnFocus = true,
    initialCount = 0,
  } = options;

  const [count, setCount] = useState(initialCount);
  const isMounted = useRef(true);

  const refetch = useCallback(async () => {
    if (!url || !isMounted.current) return;
    try {
      const response = await apiRequest<number>(url, {
        method: 'GET',
        callerName: 'useCountFromUrl',
      });
      if (isMounted.current && response.success && typeof response.data === 'number') {
        setCount(response.data);
      }
    } catch {
      if (isMounted.current) setCount(0);
    }
  }, [url]);

  useEffect(() => {
    isMounted.current = true;
    void refetch();
    return () => {
      isMounted.current = false;
    };
  }, [refetch]);

  useEffect(() => {
    if (pollIntervalMs <= 0 || !url) return;
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refetch();
      }
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [url, pollIntervalMs, refetch]);

  useEffect(() => {
    if (!refetchOnFocus || typeof document === 'undefined') return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refetch();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [refetchOnFocus, refetch]);

  return { count, refetch };
}
