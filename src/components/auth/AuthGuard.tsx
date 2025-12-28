'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AUTH_CONFIG } from '@/gradian-ui/shared/configs/auth-config';
import { REQUIRE_LOGIN } from '@/gradian-ui/shared/configs/env-config';
import { encryptReturnUrl } from '@/gradian-ui/shared/utils/url-encryption.util';

/**
 * AuthGuard Component
 * 
 * Prevents layout flash by checking authentication before rendering children.
 * Shows loading spinner during auth check, then either:
 * - Renders children if authenticated
 * - Redirects to login if not authenticated (without showing layout)
 * 
 * This component should wrap the main layout to prevent the flash of
 * authenticated content before redirecting to login.
 */
interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Check if refresh token exists in cookies
 * Note: HttpOnly cookies are not accessible via JavaScript, so this is
 * a best-effort check. The actual validation happens server-side.
 */
function hasRefreshToken(): boolean {
  if (typeof document === 'undefined') return false;
  
  // HttpOnly cookies are not accessible via document.cookie
  // We can only check if the cookie name exists in the cookie string
  // This is a best-effort check - actual validation happens server-side
  const cookies = document.cookie;
  const refreshTokenCookieName = AUTH_CONFIG.REFRESH_TOKEN_COOKIE;
  
  // Check if cookie name appears in cookie string
  // Note: This won't work for HttpOnly cookies, but it's better than nothing
  return cookies.includes(`${refreshTokenCookieName}=`);
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Skip auth check if REQUIRE_LOGIN is false
    if (!REQUIRE_LOGIN) {
      setIsChecking(false);
      setIsAuthenticated(true);
      return;
    }

    // Skip auth check for authentication pages
    if (pathname?.startsWith('/authentication/')) {
      setIsChecking(false);
      setIsAuthenticated(true);
      return;
    }

    // Perform auth check
    const checkAuth = async () => {
      try {
        // Check if refresh token exists
        // Note: This is a best-effort check since HttpOnly cookies
        // are not accessible via JavaScript
        const hasToken = hasRefreshToken();

        if (!hasToken) {
          // No token found - redirect to login without showing layout
          const currentPath = pathname || window.location.pathname;
          const encryptedReturnUrl = encryptReturnUrl(currentPath);
          const loginUrl = `/authentication/login?returnUrl=${encodeURIComponent(encryptedReturnUrl)}`;
          
          // Use replace to avoid adding to history
          router.replace(loginUrl);
          return;
        }

        // Token exists - allow rendering
        setIsAuthenticated(true);
      } catch (error) {
        // On error, redirect to login to be safe
        console.error('[AuthGuard] Error during auth check:', error);
        const currentPath = pathname || window.location.pathname;
        const encryptedReturnUrl = encryptReturnUrl(currentPath);
        const loginUrl = `/authentication/login?returnUrl=${encodeURIComponent(encryptedReturnUrl)}`;
        router.replace(loginUrl);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  // Show loading spinner during auth check
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

