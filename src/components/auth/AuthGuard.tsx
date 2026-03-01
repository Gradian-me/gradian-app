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
const AUTH_CHECK_TIMEOUT_MS = 20_000;
const AUTH_CHECK_RETRY_DELAY_MS = 800;

interface AuthGuardProps {
  children: React.ReactNode;
}

function isPublicPath(pathname: string): boolean {
  for (const publicPage of PUBLIC_PAGES) {
    if (pathname === publicPage) return true;
    if (pathname.startsWith(publicPage + '/')) return true;
  }
  return false;
}

/**
 * Single attempt: check authentication status via API with timeout.
 * Validate endpoint accepts access_token (header/cookie) or refresh_token (cookie).
 * Returns true only when response is ok and data.valid === true.
 */
async function checkAuthViaAPIOnce(signal: AbortSignal | undefined): Promise<boolean> {
  const response = await fetch('/api/auth/token/validate', {
    method: 'GET',
    credentials: 'include',
    signal,
  });

  if (response.ok) {
    const data = await response.json();
    return data.valid === true;
  }
  return false;
}

/**
 * Check authentication status via API with timeout and one retry on failure/timeout.
 * Reduces spurious logouts when validate is slow or briefly fails (e.g. cold start, network blip).
 */
async function checkAuthViaAPI(): Promise<boolean> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AUTH_CHECK_TIMEOUT_MS);

    try {
      const valid = await checkAuthViaAPIOnce(controller.signal);
      clearTimeout(timeoutId);
      if (valid) return true;
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, AUTH_CHECK_RETRY_DELAY_MS));
      } else {
        return false;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`[AuthGuard] Auth check timed out (attempt ${attempt}/2)`);
      } else {
        console.error('[AuthGuard] Error checking auth via API:', error);
      }
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, AUTH_CHECK_RETRY_DELAY_MS));
      } else {
        return false;
      }
    }
  }
  return false;
}

/** Trigger centralized logout (clear cookies, stores, redirect to login). Used when session is invalid or check times out. */
function triggerForceLogout(reason: string) {
  dispatchAuthEvent(AuthEventType.FORCE_LOGOUT, reason);
}

export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  // Fallback when router pathname is not yet available (e.g. during hydration) so we don't block login page
  const [pathnameFallback, setPathnameFallback] = useState<string>('');

  useEffect(() => {
    if (pathname) return;
    if (typeof window !== 'undefined') setPathnameFallback(window.location.pathname);
  }, [pathname]);

  const effectivePathname = (pathname && pathname.length > 0) ? pathname : pathnameFallback;

  // Determine if current path requires authentication
  const requiresAuth = useMemo(() => {
    if (!REQUIRE_LOGIN) return false;
    if (!effectivePathname) return true;
    return !isPublicPath(effectivePathname);
  }, [effectivePathname]);

  const [isChecking, setIsChecking] = useState(requiresAuth);
  const [isAuthenticated, setIsAuthenticated] = useState(!requiresAuth);

  useEffect(() => {
    if (!requiresAuth) {
      setIsChecking(false);
      setIsAuthenticated(true);
      return;
    }

    let cancelled = false;

    const checkAuth = async () => {
      try {
        const isValid = await checkAuthViaAPI();
        if (cancelled) return;

        if (!isValid) {
          if (typeof window !== 'undefined' && isPublicPath(window.location.pathname)) {
            setIsAuthenticated(true);
          } else {
            triggerForceLogout('Session invalid or expired');
          }
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        if (cancelled) return;
        console.error('[AuthGuard] Error during auth check:', error);
        if (typeof window !== 'undefined' && isPublicPath(window.location.pathname)) {
          setIsAuthenticated(true);
        } else {
          triggerForceLogout('Auth check failed');
        }
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    };

    checkAuth();

    // If auth check or API hangs (e.g. both attempts timeout), stop showing loading so user can see login
    const safetyTimeoutMs = AUTH_CHECK_TIMEOUT_MS * 2 + AUTH_CHECK_RETRY_DELAY_MS + 3000;
    const safetyTimeout = setTimeout(() => {
      if (cancelled) return;
      setIsChecking(false);
      if (typeof window !== 'undefined' && isPublicPath(window.location.pathname)) {
        setIsAuthenticated(true);
      }
    }, safetyTimeoutMs);

    return () => {
      cancelled = true;
      clearTimeout(safetyTimeout);
    };
  }, [effectivePathname, requiresAuth]);

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

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

