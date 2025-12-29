/**
 * Unified Client-Side Authentication Utilities
 * Provides consistent authentication checking across the application
 */

'use client';

import { authTokenManager } from './auth-token-manager';
import { REQUIRE_LOGIN } from '../configs/env-config';
import { loggingCustom } from './logging-custom';
import { LogType } from '../configs/log-config';

/**
 * Unified authentication check function
 * 
 * This function:
 * 1. First checks if access token exists in memory (via authTokenManager.getAccessToken())
 * 2. If access token exists and is valid, returns true
 * 3. If no access token, checks if refresh token exists
 * 4. If refresh token exists, validates it and attempts to get new access token (via authTokenManager.refreshAccessToken())
 * 5. If refresh succeeds, returns true
 * 6. Otherwise, returns false
 * 
 * @returns Promise<boolean> - true if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  // If REQUIRE_LOGIN is false, consider user as authenticated (backward compatibility)
  if (!REQUIRE_LOGIN) {
    loggingCustom(
      LogType.CLIENT_LOG,
      'debug',
      '[AUTH_UTILS] isAuthenticated() - REQUIRE_LOGIN is false, returning true'
    );
    return true;
  }

  try {
    // Step 1: Check if access token exists in memory
    const accessToken = authTokenManager.getAccessToken();
    
    if (accessToken) {
      // Step 2: Check if token is valid (not expired)
      // The authTokenManager has internal logic to check expiration
      // We'll use getValidAccessToken which handles expiration checking
      const validToken = await authTokenManager.getValidAccessToken();
      
      if (validToken) {
        loggingCustom(
          LogType.CLIENT_LOG,
          'debug',
          '[AUTH_UTILS] isAuthenticated() - valid access token found in memory'
        );
        return true;
      }
      
      // Token exists but is expired or invalid - will fall through to refresh logic
      loggingCustom(
        LogType.CLIENT_LOG,
        'debug',
        '[AUTH_UTILS] isAuthenticated() - access token expired or invalid, attempting refresh'
      );
    } else {
      loggingCustom(
        LogType.CLIENT_LOG,
        'debug',
        '[AUTH_UTILS] isAuthenticated() - no access token in memory, checking refresh token'
      );
    }

    // Step 3 & 4: No valid access token - check refresh token and attempt refresh
    // getValidAccessToken() will automatically check for refresh token and attempt refresh
    const refreshedToken = await authTokenManager.getValidAccessToken();
    
    if (refreshedToken) {
      loggingCustom(
        LogType.CLIENT_LOG,
        'debug',
        '[AUTH_UTILS] isAuthenticated() - successfully refreshed access token'
      );
      return true;
    }

    // Step 6: No valid token and refresh failed
    loggingCustom(
      LogType.CLIENT_LOG,
      'warn',
      '[AUTH_UTILS] isAuthenticated() - no valid token and refresh failed'
    );
    return false;
  } catch (error) {
    loggingCustom(
      LogType.CLIENT_LOG,
      'error',
      `[AUTH_UTILS] isAuthenticated() - error: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

