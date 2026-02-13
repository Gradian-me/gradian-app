'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { NotificationService } from '../services/notification.service';
import { subscribeToNotificationCountUpdates } from '../notification-count-sync';
import { useUserStore } from '@/stores/user.store';

export interface UseNotificationCountOptions {
  /** Poll interval in ms when tab is visible. Set to 0 to disable polling. Default 60_000. */
  pollIntervalMs?: number;
  /** Refetch when window/tab gains focus (visibilitychange). Default true. */
  refetchOnFocus?: boolean;
  /** Initial count before first fetch (avoids badge flashing 0). */
  initialCount?: number;
}

const DEFAULT_POLL_INTERVAL_MS = 60_000;

/**
 * Unread notification count for the header badge. Updates via:
 * - Initial fetch and optional polling (when tab visible)
 * - Refetch when tab gains focus (visibilitychange)
 * - Refetch when notified by notification-count-sync (e.g. after mark read/unread; later WebSocket)
 *
 * For real-time updates without polling, call notifyNotificationCountUpdate() from
 * a WebSocket handler when the server pushes notification events.
 */
export function useNotificationCount(options: UseNotificationCountOptions = {}) {
  const {
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    refetchOnFocus = true,
    initialCount = 0,
  } = options;

  const currentUserId = useUserStore((s) => s.user?.id ?? null);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  const refetch = useCallback(async () => {
    if (!isMounted.current) return;
    try {
      const value = await NotificationService.getUnreadCount(currentUserId ?? undefined);
      if (isMounted.current) setCount(value);
    } catch {
      if (isMounted.current) setCount(0);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [currentUserId]);

  // Initial fetch
  useEffect(() => {
    isMounted.current = true;
    void refetch();
    return () => {
      isMounted.current = false;
    };
  }, [refetch]);

  // Subscribe to sync events (mark read/unread elsewhere, or future WebSocket)
  useEffect(() => {
    const unsubscribe = subscribeToNotificationCountUpdates(() => {
      void refetch();
    });
    return unsubscribe;
  }, [refetch]);

  // Poll when tab is visible
  useEffect(() => {
    if (pollIntervalMs <= 0) return;

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refetch();
      }
    };

    const id = setInterval(tick, pollIntervalMs);
    return () => clearInterval(id);
  }, [pollIntervalMs, refetch]);

  // Refetch when tab gains focus
  useEffect(() => {
    if (!refetchOnFocus || typeof document === 'undefined') return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refetch();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [refetchOnFocus, refetch]);

  return { count, refetch, isLoading };
}
