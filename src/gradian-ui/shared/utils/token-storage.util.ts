/**
 * Secure token storage utilities
 * Prefers cookies over localStorage for better security
 * Tokens should be stored in httpOnly cookies by the server
 */

'use client';

/**
 * Security Warning: Tokens in localStorage are accessible to JavaScript
 * and visible in browser DevTools. Use httpOnly cookies instead.
 * 
 * This utility provides safe methods for token handling.
 */

/**
 * Remove tokens from localStorage (use cookies instead)
 * Call this during logout or when switching to cookie-based auth
 */
export const clearTokensFromLocalStorage = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  } catch (error) {
    console.warn('[Security] Failed to clear tokens from localStorage:', error);
  }
};

/**
 * Check if tokens exist in localStorage (for migration purposes)
 */
export const hasTokensInLocalStorage = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const authToken = localStorage.getItem('auth_token');
    const refreshToken = localStorage.getItem('refresh_token');
    return !!(authToken || refreshToken);
  } catch {
    return false;
  }
};

/**
 * Migrate tokens from localStorage to server-side cookies
 * Call this after login to ensure tokens are only in httpOnly cookies
 */
export const migrateTokensToCookies = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  try {
    // Check if tokens exist in localStorage
    if (!hasTokensInLocalStorage()) {
      return;
    }

    // The server should set httpOnly cookies during login
    // This function just cleans up localStorage
    clearTokensFromLocalStorage();
    
    // Verify tokens are accessible via API (cookies)
    const response = await fetch('/api/auth/token/validate', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      console.warn('[Security] Token migration: Tokens may not be properly set in cookies');
    }
  } catch (error) {
    console.warn('[Security] Failed to migrate tokens to cookies:', error);
  }
};

/**
 * Secure token storage recommendation
 * 
 * BEST PRACTICE: Store tokens in httpOnly cookies set by the server
 * - Not accessible to JavaScript (prevents XSS)
 * - Automatically sent with requests
 * - Can be configured with secure, sameSite flags
 * 
 * The login API should set tokens as httpOnly cookies:
 * ```typescript
 * response.cookies.set('auth_token', token, {
 *   httpOnly: true,
 *   secure: process.env.NODE_ENV === 'production',
 *   sameSite: 'strict',
 *   maxAge: 60 * 60 * 24, // 1 day
 * });
 * ```
 */

