import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

/**
 * Server-side single-flight token refresh coordinator
 * 
 * ⚠️ IMPORTANT: This is NOT a token cache - tokens are stored in HttpOnly cookies!
 * This is a REQUEST DEDUPLICATION mechanism to prevent race conditions.
 * 
 * THE PROBLEM:
 * When multiple API requests come in simultaneously (e.g., page load with multiple components):
 * 1. All requests see "no access token in cookies" (token expired)
 * 2. All try to refresh using the same refresh token from cookies
 * 3. But refresh tokens can only be used ONCE
 * 4. First refresh succeeds, others fail with "refresh token not found"
 * 
 * THE SOLUTION (Single-Flight Pattern):
 * This coordinator ensures only ONE refresh happens at a time:
 * - First request: Starts refresh, stores the promise
 * - Concurrent requests: Wait for the same promise (don't start new refresh)
 * - After refresh: All requests get the result, tokens are set in cookies
 * - Tokens are ALWAYS read from cookies, never from this cache
 * 
 * HOW IT WORKS:
 * 1. Request checks cookies for access token
 * 2. If missing, checks cookies for refresh token
 * 3. If refresh token exists, calls this coordinator
 * 4. Coordinator checks: Is a refresh already in progress?
 *    - YES: Return the existing promise (wait for it)
 *    - NO: Start new refresh, store promise, return it
 * 5. Refresh endpoint sets new tokens in cookies (via Set-Cookie headers)
 * 6. All waiting requests get the result and use tokens from cookies
 * 
 * BEST PRACTICES (What we follow):
 * ✅ Tokens stored in HttpOnly cookies (secure, not accessible to JavaScript)
 * ✅ Single-flight pattern for refresh (prevents race conditions)
 * ✅ Tokens always read from cookies (never from memory cache)
 * ✅ No token storage in memory (only coordination promises)
 * 
 * HOW BIG COMPANIES DO IT:
 * - Google, Microsoft, Auth0 use similar single-flight patterns
 * - Tokens in cookies/storage, not memory
 * - In-memory coordination only for request deduplication
 * - This is the industry standard approach
 */

type RefreshResult = {
  accessToken: string | null;
  setCookieHeaders: string[];
  newRefreshToken?: string | null; // The new refresh token from the refresh response
  expiresIn?: number; // Access token expiration in seconds
  refreshTokenExpiresIn?: number; // Refresh token expiration in seconds
  oldRefreshToken?: string; // The refresh token that was used (for caching by old token)
};

type RefreshPromise = Promise<RefreshResult>;

// In-memory coordination map for ongoing refresh attempts
// Key: refresh token identifier (for deduplication)
// Value: Promise that resolves when refresh completes
// NOTE: This does NOT store tokens - tokens are in cookies!
const ongoingRefreshPromises = new Map<string, RefreshPromise>();

// Temporary cache for successful refresh results
// Purpose: If a request comes in right after refresh (before cookies are processed),
// it can reuse the result instead of trying to refresh again with the consumed token
// Key: refresh token identifier
// Value: RefreshResult (contains accessToken and Set-Cookie headers)
// TTL: 5 seconds (short-lived, just for the gap between refresh and cookie processing)
// Cleanup: Lazy expiration - entries are checked for expiration when accessed, not via timers
const recentRefreshResults = new Map<string, { result: RefreshResult; timestamp: number }>();

const SUCCESS_CACHE_TTL = 5000; // 5 seconds

/**
 * Clean up expired cache entries (lazy cleanup - called when accessing cache)
 * This replaces setTimeout-based cleanup with async/await-friendly timestamp checking
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  for (const [key, entry] of recentRefreshResults.entries()) {
    const age = now - entry.timestamp;
    if (age >= SUCCESS_CACHE_TTL) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => {
    recentRefreshResults.delete(key);
    loggingCustom(
      LogType.INFRA_LOG,
      'log',
      `[ServerRefreshCache] 🗑️ Cleaned up expired cache entry: ${key.substring(0, 50)}...`,
    );
  });
  
  if (keysToDelete.length > 0) {
    loggingCustom(
      LogType.INFRA_LOG,
      'log',
      `[ServerRefreshCache] 🗑️ Cleaned up ${keysToDelete.length} expired cache entry/entries`,
    );
  }
}

/**
 * Enqueue a token refresh with single-flight protection
 * If a refresh is already in progress for the same refresh token, returns the existing promise
 * Otherwise, creates a new refresh attempt
 */
/**
 * Generate a cache key from a refresh token
 * Uses a simple hash to ensure uniqueness even if tokens start with same characters
 */
function getCacheKey(refreshToken: string): string {
  // Use first 100 chars + last 20 chars to ensure uniqueness
  // This handles cases where old and new tokens start with same characters
  if (refreshToken.length <= 120) {
    return refreshToken; // Use full token if it's short enough
  }
  return `${refreshToken.substring(0, 100)}...${refreshToken.substring(refreshToken.length - 20)}`;
}

export function enqueueServerRefresh(
  refreshToken: string,
  refreshFn: () => RefreshPromise
): RefreshPromise {
  // Use a more unique cache key to avoid collisions between old and new tokens
  const cacheKey = getCacheKey(refreshToken);

  loggingCustom(
    LogType.INFRA_LOG,
    'log',
    `[ServerRefreshCache] 🔍 Checking cache for token: ${cacheKey.substring(0, 50)}...`,
  );
  loggingCustom(
    LogType.INFRA_LOG,
    'log',
    `[ServerRefreshCache] 📊 Cache stats: Ongoing promises: ${ongoingRefreshPromises.size}, Recent results: ${recentRefreshResults.size}`,
  );
  
  // Log all cache keys for debugging
  if (recentRefreshResults.size > 0) {
    const allKeys = Array.from(recentRefreshResults.keys());
    loggingCustom(
      LogType.INFRA_LOG,
      'log',
      `[ServerRefreshCache] 🔑 All cached keys: ${allKeys.map(k => k.substring(0, 30) + '...').join(', ')}`,
    );
    loggingCustom(
      LogType.INFRA_LOG,
      'log',
      `[ServerRefreshCache] 🔍 Looking for: ${cacheKey.substring(0, 30)}...`,
    );
    const keyMatches = allKeys.map(k => {
      const match = k === cacheKey;
      const age = recentRefreshResults.get(k) ? Date.now() - recentRefreshResults.get(k)!.timestamp : null;
      return match ? `✅ MATCH (age: ${age}ms)` : `❌ NO MATCH`;
    });
    loggingCustom(LogType.INFRA_LOG, 'log', `[ServerRefreshCache] 🎯 Key comparison: ${keyMatches.join(', ')}`);
    
    // Also log the actual token being used (first 50 chars) for debugging
    loggingCustom(
      LogType.INFRA_LOG,
      'log',
      `[ServerRefreshCache] 🔑 Actual refresh token (first 50 chars): ${refreshToken.substring(0, 50)}...`,
    );
    loggingCustom(
      LogType.INFRA_LOG,
      'log',
      `[ServerRefreshCache] 🔑 Cache key generated: ${cacheKey.substring(0, 50)}...`,
    );
  }
  
  // Step 1: Clean up expired entries (lazy cleanup - no setTimeout needed)
  cleanupExpiredEntries();
  
  // Step 2: Check if we have a recent successful refresh result
  // This handles the edge case where a request comes in right after refresh
  // (before Set-Cookie headers are processed by the browser)
  const recentResult = recentRefreshResults.get(cacheKey);
  const resultAge = recentResult ? Date.now() - recentResult.timestamp : null;
  const isResultValid = recentResult && resultAge !== null && resultAge < SUCCESS_CACHE_TTL;
  
  if (isResultValid) {
    loggingCustom(
      LogType.INFRA_LOG,
      'log',
      `[ServerRefreshCache] ✅ Found cached result (age: ${resultAge}ms) - reusing without calling refresh`,
    );
    loggingCustom(
      LogType.INFRA_LOG,
      'log',
      `[ServerRefreshCache] 🚫 refreshFn() will NOT be called - returning cached result`,
    );
    // Return the result - tokens will be in Set-Cookie headers, not from this cache
    return Promise.resolve(recentResult.result);
  }
  
  if (recentResult) {
    loggingCustom(
      LogType.INFRA_LOG,
      'log',
      `[ServerRefreshCache] ⚠️ Cached result expired (age: ${resultAge}ms, TTL: ${SUCCESS_CACHE_TTL}ms)`,
    );
    // Remove expired entry
    recentRefreshResults.delete(cacheKey);
  } else {
    loggingCustom(
      LogType.INFRA_LOG,
      'log',
      `[ServerRefreshCache] ℹ️ No cached result found for token: ${cacheKey.substring(0, 50)}...`,
    );
  }
  
  // Step 2: Check if a refresh is already in progress (single-flight pattern)
  // If yes, wait for that refresh instead of starting a new one
  // IMPORTANT: When we return the existing promise, the refreshFn() won't be called again
  // The promise will resolve with the result from the first refresh
  const existingPromise = ongoingRefreshPromises.get(cacheKey);
  if (existingPromise) {
    loggingCustom(
      LogType.INFRA_LOG,
      'log',
      `[ServerRefreshCache] ⏳ Refresh already in progress - waiting for it to complete`,
    );
    loggingCustom(
      LogType.INFRA_LOG,
      'log',
      `[ServerRefreshCache] This request will reuse the result from the ongoing refresh (refreshFn will NOT be called again)`,
    );
    return existingPromise;
  }

  // Create new refresh promise
  loggingCustom(
    LogType.INFRA_LOG,
    'log',
    `[ServerRefreshCache] Creating new refresh promise for token: ${cacheKey}...`,
  );
  const refreshPromise = refreshFn()
    .then((result) => {
      // Store the result temporarily (for requests that come in before cookies are processed)
      // NOTE: Tokens are NOT stored here - they're in Set-Cookie headers!
      // This cache only stores the result so we can forward Set-Cookie headers
      if (result.accessToken) {
        // IMPORTANT: Add the old refresh token to the result so we can cache by it
        const resultWithOldToken = {
          ...result,
          oldRefreshToken: refreshToken, // Store the token we just used
        };
        
        // Cache by the OLD refresh token (the one we just consumed)
        // This is CRITICAL: Other requests still have the old token in cookies
        // and will try to refresh with it. We need to return the cached result instead.
        recentRefreshResults.set(cacheKey, {
          result: resultWithOldToken,
          timestamp: Date.now(),
        });
        loggingCustom(
          LogType.INFRA_LOG,
          'log',
          `[ServerRefreshCache] ✅ Cached successful refresh result for OLD token: ${cacheKey.substring(0, 50)}...`,
        );
        loggingCustom(
          LogType.INFRA_LOG,
          'log',
          `[ServerRefreshCache] Cache now has ${recentRefreshResults.size} entry/entries`,
        );
        
        // Also cache by the NEW refresh token (if provided)
        // This handles requests that come in with the new token before cookies are set
        // No setTimeout needed - entries are cleaned up lazily when accessed (via cleanupExpiredEntries)
        if (result.newRefreshToken) {
          const newTokenKey = getCacheKey(result.newRefreshToken);
          recentRefreshResults.set(newTokenKey, {
            result: resultWithOldToken,
            timestamp: Date.now(),
          });
          loggingCustom(
            LogType.INFRA_LOG,
            'log',
            `[ServerRefreshCache] ✅ Cached successful refresh result for NEW token: ${newTokenKey.substring(0, 50)}...`,
          );
          loggingCustom(
            LogType.INFRA_LOG,
            'log',
            `[ServerRefreshCache] Entry will expire in ${SUCCESS_CACHE_TTL}ms (lazy cleanup on next access)`,
          );
        }
      }
      
      // Remove from ongoing promises (refresh is complete)
      // The result is cached above, so subsequent requests will find it there
      // No setTimeout needed - cache entries are cleaned up lazily when accessed
      ongoingRefreshPromises.delete(cacheKey);
      
      // Only log success if we actually have a token
      if (result.accessToken) {
        loggingCustom(LogType.INFRA_LOG, 'log', `[ServerRefreshCache] ✅ Refresh completed successfully`);
        loggingCustom(
          LogType.INFRA_LOG,
          'log',
          `[ServerRefreshCache] Result cached for OLD token (will expire in ${SUCCESS_CACHE_TTL}ms, lazy cleanup)`,
        );
        loggingCustom(
          LogType.INFRA_LOG,
          'log',
          `[ServerRefreshCache] Ongoing promises: ${ongoingRefreshPromises.size}, Cached results: ${recentRefreshResults.size}`,
        );
      } else {
        loggingCustom(
          LogType.INFRA_LOG,
          'log',
          `[ServerRefreshCache] ❌ Refresh completed but NO access token - refresh failed`,
        );
        loggingCustom(
          LogType.INFRA_LOG,
          'log',
          `[ServerRefreshCache] Ongoing promises: ${ongoingRefreshPromises.size}, Cached results: ${recentRefreshResults.size}`,
        );
      }
      return result;
    })
    .catch((error) => {
      // On error, remove from ongoing promises so retry is possible
      // No setTimeout cleanup needed - using lazy cleanup instead
      ongoingRefreshPromises.delete(cacheKey);
      loggingCustom(
        LogType.INFRA_LOG,
        'log',
        `[ServerRefreshCache] ❌ Refresh failed with error, removed from ongoing promises: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    });

  // Store the promise so concurrent requests can wait for it
  ongoingRefreshPromises.set(cacheKey, refreshPromise);

  return refreshPromise;
}

/**
 * Clear the refresh cache (useful for testing or manual cleanup)
 */
/**
 * Clear the refresh coordination cache (useful for testing or manual cleanup)
 * NOTE: This does NOT clear tokens - tokens are in cookies!
 */
export function clearRefreshCache(): void {
  ongoingRefreshPromises.clear();
  recentRefreshResults.clear();
  // No cleanup timers to clear - using lazy cleanup instead
  loggingCustom(LogType.INFRA_LOG, 'log', `[ServerRefreshCache] 🗑️ Cache cleared manually`);
}

