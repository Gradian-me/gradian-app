/**
 * Server-side Access Token Cache
 * 
 * Stores access tokens in server memory, keyed by refresh token.
 * This provides better security than storing tokens in client-side memory.
 * 
 * Architecture:
 * - Access token stored in SERVER memory (not accessible to client JavaScript)
 * - Refresh token stored in HttpOnly cookie (sent with every request)
 * - Proxy functions use refresh token from cookie to look up access token from server memory
 * 
 * Security Benefits:
 * - Access token never exposed to client-side JavaScript (prevents XSS attacks)
 * - Only refresh token in HttpOnly cookie (XSS cannot access it)
 * - Server controls token lifecycle
 */

import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

type TokenEntry = {
  accessToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
  refreshToken: string; // Used as key
};

// In-memory token cache: refresh_token -> access_token mapping
const tokenCache = new Map<string, TokenEntry>();

// Cleanup interval: Remove expired tokens every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Clean up expired tokens from cache
 * Called periodically and on access
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  for (const [refreshToken, entry] of tokenCache.entries()) {
    if (now >= entry.expiresAt) {
      keysToDelete.push(refreshToken);
    }
  }
  
  keysToDelete.forEach(refreshToken => {
    tokenCache.delete(refreshToken);
    loggingCustom(
      LogType.INFRA_LOG,
      'debug',
      `[ServerTokenCache] 🗑️ Cleaned up expired token entry for refresh token: ${refreshToken.substring(0, 30)}...`
    );
  });
  
  if (keysToDelete.length > 0) {
    loggingCustom(
      LogType.INFRA_LOG,
      'log',
      `[ServerTokenCache] 🗑️ Cleaned up ${keysToDelete.length} expired token entry/entries`
    );
  }
}

// Start periodic cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredTokens, CLEANUP_INTERVAL_MS);
}

/**
 * Store access token in server memory, keyed by refresh token
 * 
 * @param refreshToken - Refresh token (used as key)
 * @param accessToken - Access token to store
 * @param expiresIn - Token expiration time in seconds
 */
export function storeAccessToken(
  refreshToken: string,
  accessToken: string,
  expiresIn: number
): void {
  if (!refreshToken || !accessToken) {
    loggingCustom(
      LogType.INFRA_LOG,
      'warn',
      `[ServerTokenCache] ⚠️ Cannot store token: missing refreshToken or accessToken`
    );
    return;
  }

  const expiresAt = Date.now() + (expiresIn * 1000);
  
  tokenCache.set(refreshToken, {
    accessToken,
    expiresAt,
    refreshToken,
  });

  loggingCustom(
    LogType.INFRA_LOG,
    'log',
    `[ServerTokenCache] ✅ Stored access token in server memory ${JSON.stringify({
      refreshTokenPreview: `${refreshToken.substring(0, 30)}...`,
      accessTokenLength: accessToken.length,
      expiresIn: `${expiresIn}s`,
      expiresAt: new Date(expiresAt).toISOString(),
      cacheSize: tokenCache.size,
    })}`
  );

  // Cleanup expired tokens when storing new ones
  cleanupExpiredTokens();
}

/**
 * Get access token from server memory using refresh token
 * 
 * @param refreshToken - Refresh token (used as key)
 * @returns Access token if found and not expired, null otherwise
 */
export function getAccessToken(refreshToken: string): string | null {
  if (!refreshToken) {
    return null;
  }

  // Cleanup expired tokens before lookup
  cleanupExpiredTokens();

  const entry = tokenCache.get(refreshToken);
  
  if (!entry) {
    loggingCustom(
      LogType.INFRA_LOG,
      'debug',
      `[ServerTokenCache] ❌ Access token not found in cache for refresh token: ${refreshToken.substring(0, 30)}...`
    );
    return null;
  }

  // Check if expired
  const now = Date.now();
  if (now >= entry.expiresAt) {
    tokenCache.delete(refreshToken);
    loggingCustom(
      LogType.INFRA_LOG,
      'log',
      `[ServerTokenCache] ⏰ Access token expired, removed from cache for refresh token: ${refreshToken.substring(0, 30)}...`
    );
    return null;
  }

  const timeUntilExpiry = entry.expiresAt - now;
  loggingCustom(
    LogType.INFRA_LOG,
    'debug',
    `[ServerTokenCache] ✅ Retrieved access token from server memory ${JSON.stringify({
      refreshTokenPreview: `${refreshToken.substring(0, 30)}...`,
      accessTokenLength: entry.accessToken.length,
      expiresIn: `${Math.floor(timeUntilExpiry / 1000)}s`,
      cacheSize: tokenCache.size,
    })}`
  );

  return entry.accessToken;
}

/**
 * Remove access token from server memory
 * Called on logout or when token is invalidated
 * 
 * @param refreshToken - Refresh token (used as key)
 */
export function removeAccessToken(refreshToken: string): void {
  if (!refreshToken) {
    return;
  }

  const deleted = tokenCache.delete(refreshToken);
  
  if (deleted) {
    loggingCustom(
      LogType.INFRA_LOG,
      'log',
      `[ServerTokenCache] 🗑️ Removed access token from server memory for refresh token: ${refreshToken.substring(0, 30)}...`
    );
  }
}

/**
 * Update access token when refresh token is rotated
 * 
 * @param oldRefreshToken - Old refresh token (to remove)
 * @param newRefreshToken - New refresh token (to use as new key)
 * @param accessToken - New access token
 * @param expiresIn - Token expiration time in seconds
 */
export function updateTokenOnRefresh(
  oldRefreshToken: string,
  newRefreshToken: string,
  accessToken: string,
  expiresIn: number
): void {
  // Remove old entry
  if (oldRefreshToken) {
    removeAccessToken(oldRefreshToken);
  }

  // Store with new refresh token
  storeAccessToken(newRefreshToken, accessToken, expiresIn);
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): {
  size: number;
  entries: Array<{ refreshTokenPreview: string; expiresAt: string; timeUntilExpiry: string }>;
} {
  cleanupExpiredTokens();
  
  const entries = Array.from(tokenCache.entries()).map(([refreshToken, entry]) => {
    const now = Date.now();
    const timeUntilExpiry = entry.expiresAt - now;
    return {
      refreshTokenPreview: `${refreshToken.substring(0, 30)}...`,
      expiresAt: new Date(entry.expiresAt).toISOString(),
      timeUntilExpiry: `${Math.floor(timeUntilExpiry / 1000)}s`,
    };
  });

  return {
    size: tokenCache.size,
    entries,
  };
}

