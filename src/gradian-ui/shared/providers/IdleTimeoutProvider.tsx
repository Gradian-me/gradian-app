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

const TOUCH_THROTTLE_MS = 1000;

export function IdleTimeoutProvider({ idleTimeoutMs = DEFAULT_IDLE_TIMEOUT, children }: ProviderProps) {
  const [lastInteraction, setLastInteraction] = useState<number | null>(() => readLastInteraction());
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasDispatchedIdleLogoutRef = useRef(false);
  const lastTouchRef = useRef(0);

  const touch = useCallback(() => {
    const now = Date.now();
    lastTouchRef.current = now;
    setLastInteraction(now);
    setIsIdle(false);
    writeLastInteraction(now);
  }, []);

  // One-time init: set lastInteraction if never set (run once on mount, ref guards against double-invocation in Strict Mode)
  const initDoneRef = useRef(false);
  useEffect(() => {
    if (initDoneRef.current) return;
    if (readLastInteraction() === null) {
      initDoneRef.current = true;
      touch();
    }
  }, [touch]);

  // Track user interactions (throttled to avoid "Maximum update depth" when many events fire in quick succession)
  useEffect(() => {
    const handler = () => {
      const now = Date.now();
      if (now - lastTouchRef.current < TOUCH_THROTTLE_MS) return;
      lastTouchRef.current = now;
      setLastInteraction(now);
      setIsIdle(false);
      writeLastInteraction(now);
    };
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
  }, []);

  // Single heartbeat: enforce idle logout and periodically update isIdle (no per-second setState to avoid re-render cascade and "Maximum update depth")
  useEffect(() => {
    timeoutRef.current = setInterval(() => {
      if (typeof window === 'undefined') return;

      const onLoginPage = window.location.pathname.startsWith('/authentication/login');
      if (isIdleBeyondThreshold(idleTimeoutMs) && !onLoginPage) {
        if (!hasDispatchedIdleLogoutRef.current) {
          hasDispatchedIdleLogoutRef.current = true;
          dispatchAuthEvent(AuthEventType.FORCE_LOGOUT, 'Idle timeout exceeded');
        }
      } else {
        hasDispatchedIdleLogoutRef.current = false;
      }
      const now = Date.now();
      const idle = lastInteraction !== null && now - lastInteraction > idleTimeoutMs;
      setIsIdle(idle);
    }, HEARTBEAT_MS);

    return () => {
      if (timeoutRef.current) clearInterval(timeoutRef.current);
    };
  }, [idleTimeoutMs, lastInteraction]);

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

