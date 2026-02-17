/**
 * Centralized logout flow utility
 * 
 * This module provides a single source of truth for logout functionality,
 * preventing code duplication across the application.
 * 
 * SECURITY:
 * - Calls logout API to invalidate server-side session
 * - Clears all authentication tokens and cookies
 * - Clears all persisted stores (localStorage, Zustand stores)
 * - Ensures complete cleanup even if API call fails
 */

'use client';

import { AUTH_CONFIG } from '../configs/auth-config';
import { loggingCustom } from './logging-custom';
import { LogType } from '../configs/log-config';
import { encryptReturnUrl } from './url-encryption.util';
import { authTokenManager } from './auth-token-manager';

/**
 * Clear all auth-related cookies by setting them to expire
 */
function clearAuthCookies(): void {
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
    try {
      // Set cookie to expire in the past to delete it
      // Try multiple variations to ensure deletion across different cookie settings
      document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure`;
      document.cookie = `${cookieName}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      
      // Also try without domain for localhost
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGOUT_FLOW] Failed to clear cookie: ${cookieName} ${JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      })}`);
    }
  });
}

/**
 * Clear all important localStorage keys
 */
function clearLocalStorageStores(): void {
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
      loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGOUT_FLOW] Failed to remove localStorage key: ${key} ${JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      })}`);
    }
  });
}

/**
 * Clear in-memory access token
 */
function clearInMemoryAccessToken(): void {
  try {
    authTokenManager.clearAccessToken();
    loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGOUT_FLOW] In-memory access token cleared');
  } catch (error) {
    loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGOUT_FLOW] Failed to clear in-memory access token ${JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    })}`);
  }
}

/**
 * Clear all Zustand stores
 */
function clearZustandStores(): void {
  try {
    const { useUserStore } = require('@/stores/user.store');
    useUserStore.getState().clearUser();
    loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGOUT_FLOW] User store cleared');
  } catch (error) {
    loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGOUT_FLOW] Failed to clear user store ${JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    })}`);
  }

  try {
    const { useCompanyStore } = require('@/stores/company.store');
    useCompanyStore.getState().clearSelectedCompany();
    loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGOUT_FLOW] Company store cleared');
  } catch (error) {
    loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGOUT_FLOW] Failed to clear company store ${JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    })}`);
  }

  try {
    const { useTenantStore } = require('@/stores/tenant.store');
    useTenantStore.getState().clearSelectedTenant();
    loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGOUT_FLOW] Tenant store cleared');
  } catch (error) {
    loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGOUT_FLOW] Failed to clear tenant store ${JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    })}`);
  }

  try {
    const { clearMenuItemsCache } = require('@/stores/menu-items.store');
    clearMenuItemsCache();
    loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGOUT_FLOW] Menu items cache cleared');
  } catch (error) {
    loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGOUT_FLOW] Failed to clear menu items cache ${JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    })}`);
  }
}

/**
 * Call clear-cache API and trigger client-side cache clear (IndexedDB, React Query, etc.)
 * so that after logout/force-logout the next login gets fresh keys.
 * Runs while credentials are still present; if API returns 401 we still dispatch the
 * client clear event so local caches are cleared.
 */
async function callClearCacheAndNotifyClient(): Promise<void> {
  try {
    loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGOUT_FLOW] Calling clear-cache API...');
    const response = await fetch('/api/schemas/clear-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    const data = await response.json().catch(() => ({}));
    const queryKeys = Array.isArray(data?.reactQueryKeys) && data.reactQueryKeys.length > 0
      ? data.reactQueryKeys
      : ['schemas', 'companies'];
    if (response.ok && data?.clearReactQueryCache) {
      loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGOUT_FLOW] Clear-cache API success, dispatching client cache clear');
    } else {
      loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGOUT_FLOW] Clear-cache API returned ${response.status}, still clearing client caches`);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('react-query-cache-clear', { detail: { queryKeys } }));
    }
  } catch (error) {
    loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGOUT_FLOW] Clear-cache request failed, still dispatching client cache clear: ${error instanceof Error ? error.message : String(error)}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('react-query-cache-clear', { detail: { queryKeys: ['schemas', 'companies'] } }));
    }
  }
}

/**
 * Call logout API endpoint to invalidate server-side session
 * Returns true if successful, false otherwise
 */
async function callLogoutAPI(): Promise<boolean> {
  try {
    loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGOUT_FLOW] Calling logout API...');
    
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: send cookies with request
    });

    const data = await response.json().catch(() => ({}));
    
    if (response.ok && data.success) {
      loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGOUT_FLOW] Logout API call successful');
      return true;
    } else {
      loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGOUT_FLOW] Logout API call failed ${JSON.stringify({
        status: response.status,
        success: data.success,
        error: data.error,
      })}`);
      return false;
    }
  } catch (error) {
    loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGOUT_FLOW] Logout API call error ${JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    })}`);
    return false;
  }
}

/**
 * Redirect to login page with optional return URL
 */
function redirectToLogin(currentPath?: string): void {
  if (typeof window === 'undefined') return;

  const target = '/authentication/login';
  const pathToUse = currentPath || (window.location.pathname + window.location.search);

  // Avoid re-navigating if we're already on the login page
  if (pathToUse.startsWith('/authentication/login')) {
    loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGOUT_FLOW] Already on login page, skipping redirect');
    return;
  }

  // Encrypt current URL as returnUrl for post-login redirect
  const encryptedReturnUrl = encryptReturnUrl(pathToUse);
  const loginUrl = `${target}?returnUrl=${encodeURIComponent(encryptedReturnUrl)}`;
  
  loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGOUT_FLOW] Redirecting to login: ${loginUrl}`);
  
  // Use window.location for full page navigation (handles hard refresh, initial load)
  window.location.href = loginUrl;
}

/**
 * Unified logout flow
 * 
 * This function performs a complete logout:
 * 1. Calls clear-cache API and dispatches client cache clear (IndexedDB, React Query) so keys are fresh after next login
 * 2. Calls logout API to invalidate server-side session
 * 3. Clears in-memory access token
 * 4. Clears all Zustand stores
 * 5. Clears all auth cookies
 * 6. Clears all localStorage stores
 * 7. Redirects to login page
 * 
 * @param reason - Optional reason for logout (for logging)
 * @param skipRedirect - If true, skip redirect to login page (useful for testing or special cases)
 */
export async function logoutFlow(reason?: string, skipRedirect: boolean = false): Promise<void> {
  if (typeof window === 'undefined') {
    loggingCustom(LogType.CLIENT_LOG, 'warn', '[LOGOUT_FLOW] logoutFlow called on server, skipping');
    return;
  }

  loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGOUT_FLOW] ========== LOGOUT STARTED ========== ${JSON.stringify({
    reason: reason || 'User requested logout',
    timestamp: new Date().toISOString(),
  })}`);

  try {
    // Step 1: Clear server and client caches (schemas, IndexedDB, React Query) while credentials still valid
    await callClearCacheAndNotifyClient();

    // Step 2: Call logout API (non-blocking - we'll continue cleanup even if it fails)
    const apiSuccess = await callLogoutAPI();
    
    // Step 3: Clear in-memory access token
    clearInMemoryAccessToken();
    
    // Step 4: Clear all Zustand stores
    clearZustandStores();
    
    // Step 5: Clear all auth cookies
    clearAuthCookies();
    
    // Step 6: Clear all localStorage stores
    clearLocalStorageStores();
    
    loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGOUT_FLOW] ========== LOGOUT CLEANUP COMPLETED ========== ${JSON.stringify({
      apiSuccess,
      reason: reason || 'User requested logout',
    })}`);
  } catch (error) {
    // Swallow errors to avoid masking redirect
    // We still want to redirect even if cleanup partially fails
    loggingCustom(LogType.CLIENT_LOG, 'error', `[LOGOUT_FLOW] Error during logout cleanup ${JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })}`);
  } finally {
    // Step 7: Redirect to login page (unless skipRedirect is true)
    if (!skipRedirect) {
      redirectToLogin();
    } else {
      loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGOUT_FLOW] Skipping redirect (skipRedirect=true)');
    }
  }
}

// Export performLogout as alias for backward compatibility
export const performLogout = logoutFlow;

