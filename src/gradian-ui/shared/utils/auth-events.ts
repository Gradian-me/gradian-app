// Centralized auth event bus and forced logout handler
import { performLogout } from './logout-flow';

export enum AuthEventType {
  FORCE_LOGOUT = 'FORCE_LOGOUT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  REQUIRE_LOGIN = 'REQUIRE_LOGIN',
}

type AuthEventDetail = {
  type: AuthEventType;
  reason?: string;
};

const AUTH_EVENT_NAME = 'gradian:auth:event';

export function dispatchAuthEvent(type: AuthEventType, reason?: string) {
  if (typeof window === 'undefined') return;
  const detail: AuthEventDetail = { type, reason };
  window.dispatchEvent(new CustomEvent<AuthEventDetail>(AUTH_EVENT_NAME, { detail }));
}

export function subscribeToAuthEvents(callback: (detail: AuthEventDetail) => void) {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: Event) => {
    const custom = event as CustomEvent<AuthEventDetail>;
    if (!custom?.detail) return;
    callback(custom.detail);
  };

  window.addEventListener(AUTH_EVENT_NAME, handler);
  return () => window.removeEventListener(AUTH_EVENT_NAME, handler);
}

/**
 * Centralized forced logout: uses the centralized logout flow utility.
 * Uses event-driven approach so callers can simply dispatch an auth event.
 */
export function handleForceLogout(reason?: string) {
  if (typeof window === 'undefined') return;
  
  // Use the centralized logout flow utility
  performLogout(reason, false).catch((error) => {
    // Log error but don't throw - logout should always complete
    console.error('[AUTH_EVENTS] Error during forced logout:', error);
  });
}

