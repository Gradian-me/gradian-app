'use client';

import { useEffect, useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { AUTH_CONFIG, PUBLIC_PAGES } from '@/gradian-ui/shared/configs/auth-config';
import { REQUIRE_LOGIN } from '@/gradian-ui/shared/configs/env-config';
import { encryptReturnUrl } from '@/gradian-ui/shared/utils/url-encryption.util';

/**
 * AuthGuard Component
 * 
 * Prevents layout flash by checking authentication BEFORE rendering children.
 * Shows loading spinner during auth check, then either:
 * - Renders children if authenticated
 * - Redirects to login if not authenticated (without showing layout)
 * 
 * This component checks auth status immediately on mount to prevent any content
 * from rendering before authentication is verified.
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

/**
 * Check authentication status via API
 * This provides a more reliable check than cookie inspection
 */
async function checkAuthViaAPI(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/token/validate', {
      method: 'GET',
      credentials: 'include', // Include cookies
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.valid === true;
    }
    
    return false;
  } catch (error) {
    console.error('[AuthGuard] Error checking auth via API:', error);
    return false;
  }
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

    // Perform auth check immediately
    const checkAuth = async () => {
      try {
        // First, do a quick cookie check (synchronous)
        const hasTokenInCookie = hasRefreshToken();
        
        // If no token in cookie, redirect immediately without API call
        if (!hasTokenInCookie) {
          const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '/');
          const encryptedReturnUrl = encryptReturnUrl(currentPath);
          const loginUrl = `/authentication/login?returnUrl=${encodeURIComponent(encryptedReturnUrl)}`;
          
          // Use window.location for immediate redirect (prevents any rendering)
          if (typeof window !== 'undefined') {
            window.location.href = loginUrl;
          }
          return;
        }

        // Token exists in cookie - verify via API for more reliable check
        const isValid = await checkAuthViaAPI();
        
        if (!isValid) {
          // Token invalid - redirect to login
          const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '/');
          const encryptedReturnUrl = encryptReturnUrl(currentPath);
          const loginUrl = `/authentication/login?returnUrl=${encodeURIComponent(encryptedReturnUrl)}`;
          
          // Use window.location for immediate redirect
          if (typeof window !== 'undefined') {
            window.location.href = loginUrl;
          }
          return;
        }

        // Authentication verified - allow rendering
        setIsAuthenticated(true);
      } catch (error) {
        // On error, redirect to login to be safe
        console.error('[AuthGuard] Error during auth check:', error);
        const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '/');
        const encryptedReturnUrl = encryptReturnUrl(currentPath);
        const loginUrl = `/authentication/login?returnUrl=${encodeURIComponent(encryptedReturnUrl)}`;
        
        if (typeof window !== 'undefined') {
          window.location.href = loginUrl;
        }
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

