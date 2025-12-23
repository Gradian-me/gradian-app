// Centralized auth event bus and forced logout handler
import { clearMenuItemsCache } from '@/stores/menu-items.store';

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
 * Centralized forced logout: clears tokens and persisted stores, then redirects.
 * Uses event-driven approach so callers can simply dispatch an auth event.
 */
export function handleForceLogout(reason?: string) {
  if (typeof window === 'undefined') return;

  try {
    try {
      const { authTokenManager } = require('./auth-token-manager');
      authTokenManager.clearAccessToken();
    } catch {}

    // Clear user/company/menu state
    try {
      const { useUserStore } = require('@/stores/user.store');
      useUserStore.getState().clearUser();
    } catch {}

    try {
      const { useCompanyStore } = require('@/stores/company.store');
      useCompanyStore.getState().clearSelectedCompany();
    } catch {}

    try {
      clearMenuItemsCache();
    } catch {}

    // Remove legacy tokens from localStorage
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } catch {}
  } catch {
    // Swallow errors to avoid masking redirect
  } finally {
    const currentPath = window.location.pathname;
    const target = '/authentication/login';

    // Avoid re-navigating if we're already on the login page
    if (!currentPath.startsWith('/authentication/login')) {
      window.location.href = target;
    }
  }
}

