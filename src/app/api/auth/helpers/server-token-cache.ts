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
// Use globalThis to persist across module reloads in serverless/edge environments
const GLOBAL_CACHE_KEY = '__GRADIAN_TOKEN_CACHE__';
const GLOBAL_CLEANUP_KEY = '__GRADIAN_TOKEN_CLEANUP_INTERVAL__';

function getTokenCache(): Map<string, TokenEntry> {
  // @ts-expect-error - globalThis may not have our cache key in types
  if (!globalThis[GLOBAL_CACHE_KEY]) {
    // @ts-expect-error - globalThis accessed with dynamic key for server-side token cache
    globalThis[GLOBAL_CACHE_KEY] = new Map<string, TokenEntry>();
    loggingCustom(
      LogType.INFRA_LOG,
      'debug',
      `[ServerTokenCache] Initialized global token cache`
    );
  }
  // @ts-expect-error - globalThis accessed with dynamic key for server-side token cache
  return globalThis[GLOBAL_CACHE_KEY];
}

// Cleanup interval: Remove expired tokens every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Clean up expired tokens from cache
 * Called periodically and on access
 */
function cleanupExpiredTokens(): void {
  const tokenCache = getTokenCache();
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

// Start periodic cleanup (only once, using global flag)
if (typeof setInterval !== 'undefined') {
  // @ts-expect-error - globalThis accessed with dynamic key for cleanup interval tracking
  if (!globalThis[GLOBAL_CLEANUP_KEY]) {
    // @ts-expect-error - globalThis accessed with dynamic key to store cleanup interval
    globalThis[GLOBAL_CLEANUP_KEY] = setInterval(cleanupExpiredTokens, CLEANUP_INTERVAL_MS);
    loggingCustom(
      LogType.INFRA_LOG,
      'debug',
      `[ServerTokenCache] Started periodic cleanup interval`
    );
  }
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

  const tokenCache = getTokenCache();
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
      usingGlobalCache: true,
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

  // Get cache instance once at the start of the function (no duplicates)
  const cache = getTokenCache();

  // Cleanup expired tokens before lookup
  cleanupExpiredTokens();

  // Log cache state for debugging
  loggingCustom(
    LogType.INFRA_LOG,
    'debug',
    `[ServerTokenCache] Looking up access token ${JSON.stringify({
      refreshTokenPreview: `${refreshToken.substring(0, 30)}...`,
      refreshTokenLength: refreshToken.length,
      cacheSize: cache.size,
      cacheKeys: Array.from(cache.keys()).map(k => `${k.substring(0, 30)}...`),
      usingGlobalCache: true,
    })}`
  );

  const entry = cache.get(refreshToken);
  
  if (!entry) {
    // Try to find a matching entry (in case of encoding/whitespace issues)
    let foundEntry: TokenEntry | null = null;
    let foundKey: string | null = null;
    
    for (const [key, value] of cache.entries()) {
      // Check if keys match after trimming
      if (key.trim() === refreshToken.trim()) {
        foundEntry = value;
        foundKey = key;
        break;
      }
      // Check if they're the same after URL encoding/decoding
      try {
        const decodedKey = decodeURIComponent(key);
        const decodedRefresh = decodeURIComponent(refreshToken);
        if (decodedKey === decodedRefresh || decodedKey === refreshToken || key === decodedRefresh) {
          foundEntry = value;
          foundKey = key;
          break;
        }
      } catch {
        // Ignore encoding errors
      }
    }
    
    if (foundEntry && foundKey) {
      loggingCustom(
        LogType.INFRA_LOG,
        'warn',
        `[ServerTokenCache] ⚠️ Found token with different key (encoding/whitespace mismatch). Using found entry. ${JSON.stringify({
          requestedKeyPreview: `${refreshToken.substring(0, 30)}...`,
          foundKeyPreview: `${foundKey.substring(0, 30)}...`,
          keysMatch: foundKey === refreshToken,
        })}`
      );
      // Update cache with correct key for future lookups
      cache.delete(foundKey);
      cache.set(refreshToken, foundEntry);
      // Continue with found entry
      const now = Date.now();
      if (now >= foundEntry.expiresAt) {
        loggingCustom(
          LogType.INFRA_LOG,
          'log',
          `[ServerTokenCache] ⏰ Access token expired, removed from cache for refresh token: ${refreshToken.substring(0, 30)}...`
        );
        return null;
      }
      return foundEntry.accessToken;
    }
    
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
    cache.delete(refreshToken);
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
      cacheSize: cache.size,
      usingGlobalCache: true,
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

  const tokenCache = getTokenCache();
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
  
  const tokenCache = getTokenCache();
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

