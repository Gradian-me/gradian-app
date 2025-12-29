'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { dispatchAuthEvent, AuthEventType } from '../utils/auth-events';

type IdleContextValue = {
  lastInteraction: number | null;
  idleTimeoutMs: number;
  isIdle: boolean;
  touch: () => void;
};

const IdleContext = createContext<IdleContextValue | undefined>(undefined);

const LAST_INTERACTION_KEY = 'last_interaction';
const DEFAULT_IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const HEARTBEAT_MS = 30 * 1000; // periodic check

function readLastInteraction(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(LAST_INTERACTION_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function writeLastInteraction(value: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_INTERACTION_KEY, String(value));
  } catch {
    // ignore
  }
}

export function isIdleBeyondThreshold(thresholdMs: number): boolean {
  if (typeof window === 'undefined') return false;
  const last = readLastInteraction();
  if (!last) return false;
  return Date.now() - last > thresholdMs;
}

type ProviderProps = {
  idleTimeoutMs?: number;
  children: React.ReactNode;
};

export function IdleTimeoutProvider({ idleTimeoutMs = DEFAULT_IDLE_TIMEOUT, children }: ProviderProps) {
  const [lastInteraction, setLastInteraction] = useState<number | null>(() => readLastInteraction());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasDispatchedIdleLogoutRef = useRef(false);

  const touch = useCallback(() => {
    const now = Date.now();
    setLastInteraction(now);
    writeLastInteraction(now);
  }, []);

  // Track user interactions
  useEffect(() => {
    const handler = () => touch();
    // Track various user interactions to extend session
    // Includes clicks, touches, keyboard input, mouse movement, scrolling, and visibility changes
    const events = [
      'click',
      'touchstart',
      'keydown',
      'keypress',
      'mousemove',
      'scroll',
      'visibilitychange',
    ];
    events.forEach((evt) => document.addEventListener(evt, handler, { passive: true }));
    return () => {
      events.forEach((evt) => document.removeEventListener(evt, handler));
    };
  }, [touch]);

  // Heartbeat to enforce idle logout even without new interactions
  useEffect(() => {
    // Initialize if absent
    if (!lastInteraction) {
      touch();
    }

    timeoutRef.current = setInterval(() => {
      if (typeof window === 'undefined') {
        return;
      }

      const onLoginPage = window.location.pathname.startsWith('/authentication/login');

      if (isIdleBeyondThreshold(idleTimeoutMs) && !onLoginPage) {
        if (!hasDispatchedIdleLogoutRef.current) {
          hasDispatchedIdleLogoutRef.current = true;
          dispatchAuthEvent(AuthEventType.FORCE_LOGOUT, 'Idle timeout exceeded');
        }
      } else {
        // Reset so we can trigger again after user becomes active and idle later
        hasDispatchedIdleLogoutRef.current = false;
      }
    }, HEARTBEAT_MS);

    return () => {
      if (timeoutRef.current) clearInterval(timeoutRef.current);
    };
  }, [idleTimeoutMs, lastInteraction, touch]);

  // Use state to track current time instead of calling Date.now() during render
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  
  useEffect(() => {
    // Update current time periodically to check idle status
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, []);

  const isIdle = useMemo(() => {
    if (!lastInteraction) return false;
    return currentTime - lastInteraction > idleTimeoutMs;
  }, [lastInteraction, idleTimeoutMs, currentTime]);

  const value = useMemo<IdleContextValue>(
    () => ({
      lastInteraction,
      idleTimeoutMs,
      isIdle,
      touch,
    }),
    [isIdle, idleTimeoutMs, lastInteraction, touch]
  );

  return <IdleContext.Provider value={value}>{children}</IdleContext.Provider>;
}

export function useIdleTimeout() {
  const ctx = useContext(IdleContext);
  if (!ctx) {
    throw new Error('useIdleTimeout must be used within IdleTimeoutProvider');
  }
  return ctx;
}

