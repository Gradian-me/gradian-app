// Centralized auth event bus and forced logout handler
import { clearMenuItemsCache } from '@/stores/menu-items.store';
import { encryptReturnUrl } from './url-encryption.util';
import { AUTH_CONFIG } from '../configs/auth-config';

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
 * Clear all auth-related cookies by setting them to expire
 */
function clearAuthCookies() {
  if (typeof document === 'undefined') return;

  const cookiesToClear = [
    AUTH_CONFIG.ACCESS_TOKEN_COOKIE,
    AUTH_CONFIG.REFRESH_TOKEN_COOKIE,
    AUTH_CONFIG.SESSION_TOKEN_COOKIE,
    AUTH_CONFIG.USER_SESSION_ID_COOKIE,
    'access_token', // Legacy fallback
    'refresh_token', // Legacy fallback
  ];

  cookiesToClear.forEach((cookieName) => {
    // Set cookie to expire in the past to delete it
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure`;
    document.cookie = `${cookieName}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  });
}

/**
 * Clear all important localStorage keys
 */
function clearLocalStorageStores() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

  const keysToRemove = [
    'user-store',
    'company-store',
    'menu-items-store',
    'tenant-store',
    'language-store',
    'access_token', // Legacy
    'refresh_token', // Legacy
    'last_interaction', // Idle timeout tracking
  ];

  keysToRemove.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // Silently fail if localStorage is not available or key doesn't exist
    }
  });
}

/**
 * Centralized forced logout: clears tokens, cookies, persisted stores, then redirects.
 * Uses event-driven approach so callers can simply dispatch an auth event.
 */
export function handleForceLogout(reason?: string) {
  if (typeof window === 'undefined') return;

  try {
    // Clear in-memory access token
    try {
      const { authTokenManager } = require('./auth-token-manager');
      authTokenManager.clearAccessToken();
    } catch {}

    // Clear user/company/menu state from stores
    try {
      const { useUserStore } = require('@/stores/user.store');
      useUserStore.getState().clearUser();
    } catch {}

    try {
      const { useCompanyStore } = require('@/stores/company.store');
      useCompanyStore.getState().clearSelectedCompany();
    } catch {}

    try {
      const { useTenantStore } = require('@/stores/tenant.store');
      useTenantStore.getState().clearSelectedTenant();
    } catch {}

    try {
      clearMenuItemsCache();
    } catch {}

    // Clear all auth cookies
    clearAuthCookies();

    // Clear all localStorage stores
    clearLocalStorageStores();
  } catch {
    // Swallow errors to avoid masking redirect
  } finally {
    const currentPath = window.location.pathname + window.location.search;
    const target = '/authentication/login';

    // Avoid re-navigating if we're already on the login page
    if (!currentPath.startsWith('/authentication/login')) {
      // Encrypt current URL as returnUrl for post-login redirect
      const encryptedReturnUrl = encryptReturnUrl(currentPath);
      const loginUrl = `${target}?returnUrl=${encodeURIComponent(encryptedReturnUrl)}`;
      window.location.href = loginUrl;
    }
  }
}

