'use client';

import { useEffect, useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { PUBLIC_PAGES } from '@/gradian-ui/shared/configs/auth-config';
import { REQUIRE_LOGIN } from '@/gradian-ui/shared/configs/env-config';
import { AuthEventType, dispatchAuthEvent } from '@/gradian-ui/shared/utils/auth-events';

/**
 * AuthGuard Component
 *
 * - When REQUIRE_LOGIN is true: runs session check (GET /api/auth/token/validate with cookies).
 *   If invalid (401/400), timeout, or error: dispatches FORCE_LOGOUT so centralized logout runs and redirects to login.
 * - When REQUIRE_LOGIN is false: skips auth check; app never redirects to login (profile selector
 *   still hides when user store is empty after clearing storage).
 *
 * UserProfileSelector visibility is driven only by useUserStore().user (persisted in localStorage).
 * To get "force logout" (redirect to login when cookies/storage are cleared), set REQUIRE_LOGIN=true.
 */
const AUTH_CHECK_TIMEOUT_MS = 15_000;

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Check authentication status via API with timeout.
 * Validate endpoint accepts access_token (header/cookie) or refresh_token (cookie).
 * Returns true only when response is ok and data.valid === true.
 */
async function checkAuthViaAPI(): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch('/api/auth/token/validate', {
      method: 'GET',
      credentials: 'include',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return data.valid === true;
    }
    // 401 Unauthorized or 400 Bad Request (e.g. missing token) → not authenticated
    return false;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[AuthGuard] Auth check timed out');
    } else {
      console.error('[AuthGuard] Error checking auth via API:', error);
    }
    return false;
  }
}

/** Trigger centralized logout (clear cookies, stores, redirect to login). Used when session is invalid or check times out. */
function triggerForceLogout(reason: string) {
  dispatchAuthEvent(AuthEventType.FORCE_LOGOUT, reason);
}

export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  
  // Determine if current path requires authentication
  // Default to true (requires auth) if pathname is not yet available
  const requiresAuth = useMemo(() => {
    // Skip auth check if REQUIRE_LOGIN is false
    if (!REQUIRE_LOGIN) {
      return false;
    }

    // If pathname is not available yet, assume auth is required (will check once available)
    if (!pathname) {
      return true;
    }

    // Check if pathname matches any public page
    for (const publicPage of PUBLIC_PAGES) {
      // Exact match
      if (pathname === publicPage) {
        return false;
      }
      
      // Prefix match (e.g., /authentication matches /authentication/login)
      if (pathname.startsWith(publicPage + '/')) {
        return false;
      }
    }

    return true;
  }, [pathname]);

  const [isChecking, setIsChecking] = useState(requiresAuth); // Start checking if auth is required
  const [isAuthenticated, setIsAuthenticated] = useState(!requiresAuth); // Assume authenticated if auth not required

  useEffect(() => {
    // If auth is not required, allow rendering immediately
    if (!requiresAuth) {
      setIsChecking(false);
      setIsAuthenticated(true);
      return;
    }

    // Perform auth check: call validate API (with credentials) so server can see refresh_token cookie (including HttpOnly)
    const checkAuth = async () => {
      try {
        const isValid = await checkAuthViaAPI();

        if (!isValid) {
          triggerForceLogout('Session invalid or expired');
          return;
        }

        // Authentication verified - allow rendering
        setIsAuthenticated(true);
      } catch (error) {
        console.error('[AuthGuard] Error during auth check:', error);
        triggerForceLogout('Auth check failed');
      } finally {
        setIsChecking(false);
      }
    };

    // Run check immediately
    checkAuth();
  }, [pathname, requiresAuth]);

  // ALWAYS show loading spinner during auth check - this prevents any content flash
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Only render children if authenticated
  // If not authenticated, we've already redirected, so this won't render
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

