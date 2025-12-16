/**
 * Client-side authentication token manager
 * 
 * Handles access token storage (memory only) and refresh token coordination.
 * Implements single-flight pattern to prevent race conditions during token refresh.
 * 
 * SECURITY:
 * - Access tokens stored in memory only (never in cookies/localStorage/sessionStorage)
 * - Refresh tokens remain in HttpOnly cookies (handled by server)
 * - Tokens cleared on refresh failure to prevent stale auth state
 * 
 * ARCHITECTURE:
 * - Single-flight refresh: Only one refresh request runs at a time
 * - Request queuing: Failed requests wait for refresh to complete
 * - Automatic retry: Queued requests retry after successful refresh
 */

import { loggingCustom } from './logging-custom';
import { LogType } from '../constants/application-variables';

type QueuedRequest = {
  resolve: (token: string | null) => void;
  reject: (error: Error) => void;
};

/**
 * Custom error class for rate limiting
 * Allows API client to distinguish rate limit errors from auth errors
 */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

class AuthTokenManager {
  // Access token stored in memory only (never persisted)
  private accessToken: string | null = null;
  
  // Single-flight refresh coordination
  private refreshPromise: Promise<string | null> | null = null;
  
  // Queue of requests waiting for token refresh
  private queuedRequests: QueuedRequest[] = [];
  
  // Flag to prevent infinite refresh loops
  private isRefreshing: boolean = false;
  
  // Rate limiting: track when we last received 429 and cooldown period
  private lastRateLimitError: number | null = null;
  private rateLimitCooldownMs: number = 60000; // 60 seconds default cooldown
  private rateLimitRetryCount: number = 0;

  /**
   * Get current access token from memory
   * Returns null if no token is stored
   */
  getAccessToken(): string | null {
    const hasToken = this.accessToken !== null;
    loggingCustom(LogType.CLIENT_LOG, 'log', `[AUTH_TOKEN] getAccessToken() ${JSON.stringify({
      hasToken,
      tokenLength: this.accessToken?.length || 0,
      tokenPreview: this.accessToken ? `${this.accessToken.substring(0, 20)}...` : null,
    })}`);
    return this.accessToken;
  }

  /**
   * Set access token in memory
   * Called after successful login or token refresh
   * 
   * IMPORTANT: Access token is stored in MEMORY ONLY (not in cookies/localStorage)
   * This is a security best practice - tokens in memory are cleared on page refresh
   */
  setAccessToken(token: string | null): void {
    const hadToken = this.accessToken !== null;
    this.accessToken = token;
    
    let expirationInfo: { expiresAt?: string; expiresInSeconds?: number } = {};
    if (token) {
      const exp = this.decodeTokenExpiration(token);
      if (exp) {
        const now = Math.floor(Date.now() / 1000);
        const expiresInSeconds = exp - now;
        expirationInfo = {
          expiresAt: new Date(exp * 1000).toISOString(),
          expiresInSeconds: expiresInSeconds > 0 ? expiresInSeconds : 0,
        };
      }
    }
    
    loggingCustom(LogType.CLIENT_LOG, 'log', `[AUTH_TOKEN] setAccessToken() ${JSON.stringify({
      hadToken,
      hasToken: token !== null,
      tokenLength: token?.length || 0,
      tokenPreview: token ? `${token.substring(0, 20)}...` : null,
      storage: 'MEMORY_ONLY (not in cookies/localStorage)',
      ...expirationInfo,
    })}`);
  }

  /**
   * Clear access token from memory
   * Called on logout or refresh failure
   */
  clearAccessToken(): void {
    const hadToken = this.accessToken !== null;
    this.accessToken = null;
    loggingCustom(LogType.CLIENT_LOG, 'log', `[AUTH_TOKEN] clearAccessToken() ${JSON.stringify({
      hadToken,
      reason: 'Token cleared from memory',
    })}`);
  }

  /**
   * Check if refresh token exists in HttpOnly cookie
   * Uses document.cookie check (refresh token is HttpOnly, so this is a best-effort check)
   * Actual validation happens server-side
   */
  private hasRefreshToken(): boolean {
    // HttpOnly cookies are not accessible via JavaScript
    // This is a best-effort check - actual validation happens server-side
    // We assume refresh token exists if we're attempting to refresh
    return true;
  }

  /**
   * Decode JWT token to check expiration (client-side, no signature verification)
   * Returns expiration timestamp in seconds, or null if token is invalid or has no exp claim
   */
  private decodeTokenExpiration(token: string): number | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // Decode the payload (second part)
      const payload = parts[1];
      // Add padding if needed
      let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }

      const decoded = atob(base64);
      const parsed = JSON.parse(decoded) as { exp?: number };
      
      return parsed.exp || null;
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'warn', `[AUTH_TOKEN] Failed to decode token expiration ${JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      })}`);
      return null;
    }
  }

  /**
   * Check if access token is expired
   * Returns true if expired, false if valid, null if cannot determine
   */
  private isTokenExpired(token: string): boolean | null {
    const exp = this.decodeTokenExpiration(token);
    if (exp === null) {
      return null; // Cannot determine
    }

    const now = Math.floor(Date.now() / 1000);
    const isExpired = exp < now;
    
    if (isExpired) {
      const expiredSecondsAgo = now - exp;
      loggingCustom(LogType.CLIENT_LOG, 'log', `[AUTH_TOKEN] Token is expired ${JSON.stringify({
        expirationTime: new Date(exp * 1000).toISOString(),
        currentTime: new Date(now * 1000).toISOString(),
        expiredSecondsAgo,
        exp,
        now,
      })}`);
    } else {
      const expiresInSeconds = exp - now;
      loggingCustom(LogType.CLIENT_LOG, 'log', `[AUTH_TOKEN] Token is valid ${JSON.stringify({
        expirationTime: new Date(exp * 1000).toISOString(),
        currentTime: new Date(now * 1000).toISOString(),
        expiresInSeconds,
        exp,
        now,
      })}`);
    }

    return isExpired;
  }

  /**
   * Refresh access token using refresh token from HttpOnly cookie
   * Implements single-flight pattern: only one refresh runs at a time
   * Queues concurrent requests while refresh is in progress
   */
  async refreshAccessToken(): Promise<string | null> {
    loggingCustom(LogType.CLIENT_LOG, 'log', `[AUTH_TOKEN] refreshAccessToken() called ${JSON.stringify({
      isOnLoginPage: this.isOnLoginPage(),
      hasRefreshPromise: this.refreshPromise !== null,
      isRefreshing: this.isRefreshing,
      queuedRequests: this.queuedRequests.length,
    })}`);

    // Don't refresh if we're on login page (prevents redirect loops)
    if (this.isOnLoginPage()) {
      loggingCustom(LogType.CLIENT_LOG, 'log', '[AUTH_TOKEN] refreshAccessToken() skipped - on login page');
      return null;
    }

    // If refresh is already in progress, wait for it
    if (this.refreshPromise) {
      loggingCustom(LogType.CLIENT_LOG, 'log', `[AUTH_TOKEN] refreshAccessToken() - waiting for existing refresh ${JSON.stringify({
        queuedRequests: this.queuedRequests.length,
      })}`);
      return this.refreshPromise;
    }

    // Prevent infinite refresh loops
    if (this.isRefreshing) {
      loggingCustom(LogType.CLIENT_LOG, 'log', '[AUTH_TOKEN] refreshAccessToken() skipped - already refreshing');
      return Promise.resolve(null);
    }

    this.isRefreshing = true;
    loggingCustom(LogType.CLIENT_LOG, 'log', '[AUTH_TOKEN] refreshAccessToken() - starting new refresh');

    // Create refresh promise that all concurrent requests will share
    this.refreshPromise = this.performRefresh();

    try {
      const token = await this.refreshPromise;
      
      loggingCustom(LogType.CLIENT_LOG, 'log', `[AUTH_TOKEN] refreshAccessToken() - refresh completed ${JSON.stringify({
        success: token !== null,
        tokenLength: token?.length || 0,
        queuedRequestsResolved: this.queuedRequests.length,
      })}`);
      
      // Resolve all queued requests with new token
      this.queuedRequests.forEach(({ resolve }) => {
        resolve(token);
      });
      this.queuedRequests = [];
      
      return token;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Token refresh failed');
      loggingCustom(LogType.CLIENT_LOG, 'error', `[AUTH_TOKEN] refreshAccessToken() - refresh failed ${JSON.stringify({
        error: err.message,
        queuedRequestsRejected: this.queuedRequests.length,
      })}`);
      
      // Reject all queued requests
      this.queuedRequests.forEach(({ reject }) => {
        reject(err);
      });
      this.queuedRequests = [];
      
      // Clear auth state on refresh failure
      this.clearAccessToken();
      
      throw err;
    } finally {
      this.refreshPromise = null;
      this.isRefreshing = false;
      loggingCustom(LogType.CLIENT_LOG, 'log', '[AUTH_TOKEN] refreshAccessToken() - cleanup complete');
    }
  }

  /**
   * Perform actual token refresh request
   * Backend reads refresh token from HttpOnly cookie automatically
   */
  private async performRefresh(): Promise<string | null> {
    const startTime = Date.now();
    loggingCustom(LogType.CLIENT_LOG, 'log', `[AUTH_TOKEN] performRefresh() - calling /api/auth/token/refresh ${JSON.stringify({
      timestamp: new Date().toISOString(),
      refreshTokenSource: 'HttpOnly cookie (sent automatically with credentials: include)',
    })}`);

    try {
      // Call refresh endpoint - refresh token is sent via HttpOnly cookie (withCredentials)
      const response = await fetch('/api/auth/token/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Required to send HttpOnly cookies
      });

      const duration = Date.now() - startTime;
      loggingCustom(LogType.CLIENT_LOG, 'log', `[AUTH_TOKEN] performRefresh() - response received ${JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        ok: response.ok,
      })}`);

      if (!response.ok) {
        // Refresh failed - clear auth state
        this.clearAccessToken();
        
        // Handle 429 Too Many Requests with exponential backoff
        if (response.status === 429) {
          const now = Date.now();
          const timeSinceLast429 = this.lastRateLimitError ? now - this.lastRateLimitError : Infinity;
          
          // If we're still in cooldown period, don't retry
          if (this.lastRateLimitError && timeSinceLast429 < this.rateLimitCooldownMs) {
            const remainingCooldown = Math.ceil((this.rateLimitCooldownMs - timeSinceLast429) / 1000);
            loggingCustom(LogType.CLIENT_LOG, 'warn', `[AUTH_TOKEN] performRefresh() - rate limited, still in cooldown ${JSON.stringify({
              status: response.status,
              remainingCooldownSeconds: remainingCooldown,
              retryCount: this.rateLimitRetryCount,
              action: 'Will wait before retrying',
            })}`);
            
            // Don't throw - return null to prevent further retries
            // The calling code should handle this gracefully
            return null;
          }
          
          // Update rate limit tracking
          this.lastRateLimitError = now;
          this.rateLimitRetryCount += 1;
          
          // Exponential backoff: increase cooldown with each retry (max 5 minutes)
          this.rateLimitCooldownMs = Math.min(
            300000, // 5 minutes max
            Math.pow(2, Math.min(this.rateLimitRetryCount, 6)) * 1000 // 2^retryCount seconds, capped at 2^6 = 64 seconds base
          );
          
          loggingCustom(LogType.CLIENT_LOG, 'warn', `[AUTH_TOKEN] performRefresh() - rate limited (429) ${JSON.stringify({
            status: response.status,
            retryCount: this.rateLimitRetryCount,
            cooldownSeconds: Math.ceil(this.rateLimitCooldownMs / 1000),
            action: 'Will wait before retrying',
          })}`);
          
          // Don't throw - return null to prevent cascading failures
          // The error will be logged but won't cause infinite retry loops
          return null;
        }
        
        if (response.status === 401 || response.status === 400) {
          loggingCustom(LogType.CLIENT_LOG, 'warn', `[AUTH_TOKEN] performRefresh() - refresh failed (401/400) ${JSON.stringify({
            status: response.status,
            reason: 'Invalid or missing refresh token',
            action: 'Will redirect to login (if not already on login page)',
          })}`);
          // Invalid or missing refresh token - redirect to login
          this.redirectToLogin();
          return null;
        }
        
        const errorMsg = `Token refresh failed: ${response.status} ${response.statusText}`;
        loggingCustom(LogType.CLIENT_LOG, 'error', `[AUTH_TOKEN] performRefresh() - refresh failed ${JSON.stringify({
          status: response.status,
          error: errorMsg,
        })}`);
        throw new Error(errorMsg);
      }

      const data = await response.json();
      loggingCustom(LogType.CLIENT_LOG, 'log', `[AUTH_TOKEN] performRefresh() - response parsed ${JSON.stringify({
        success: data.success,
        hasAccessToken: !!data.accessToken,
        expiresIn: data.expiresIn,
        message: data.message,
      })}`);
      
      if (!data.success || !data.accessToken) {
        loggingCustom(LogType.CLIENT_LOG, 'error', `[AUTH_TOKEN] performRefresh() - invalid response ${JSON.stringify({
          success: data.success,
          hasAccessToken: !!data.accessToken,
          error: data.error,
        })}`);
        this.clearAccessToken();
        this.redirectToLogin();
        return null;
      }

      // Store new access token in memory
      this.setAccessToken(data.accessToken);
      
      // Reset rate limit tracking on successful refresh
      this.lastRateLimitError = null;
      this.rateLimitRetryCount = 0;
      this.rateLimitCooldownMs = 60000; // Reset to default
      
      loggingCustom(LogType.CLIENT_LOG, 'log', `[AUTH_TOKEN] performRefresh() - SUCCESS ${JSON.stringify({
        tokenStored: true,
        storageLocation: 'MEMORY (not in cookies)',
        tokenLength: data.accessToken.length,
        expiresIn: data.expiresIn,
      })}`);
      return data.accessToken;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.clearAccessToken();
      
      // Network errors or other failures
      if (error instanceof TypeError && error.message.includes('fetch')) {
        loggingCustom(LogType.CLIENT_LOG, 'error', `[AUTH_TOKEN] performRefresh() - network error ${JSON.stringify({
          error: error.message,
          duration: `${duration}ms`,
          action: 'Not redirecting - letting caller handle',
        })}`);
        // Network error - don't redirect, let caller handle
        throw new Error('Network error during token refresh');
      }
      
      loggingCustom(LogType.CLIENT_LOG, 'error', `[AUTH_TOKEN] performRefresh() - error ${JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
      })}`);
      throw error;
    }
  }

  /**
   * Get access token, refreshing if necessary
   * Queues request if refresh is in progress
   * Returns null if on login page (no token needed)
   * Automatically refreshes if token is expired
   */
  async getValidAccessToken(): Promise<string | null> {
    const isOnLogin = this.isOnLoginPage();
    const hasToken = this.accessToken !== null;
    
    loggingCustom(LogType.CLIENT_LOG, 'log', `[AUTH_TOKEN] getValidAccessToken() called ${JSON.stringify({
      isOnLoginPage: isOnLogin,
      hasTokenInMemory: hasToken,
      hasRefreshPromise: this.refreshPromise !== null,
      queuedRequests: this.queuedRequests.length,
    })}`);

    // Don't try to get token if we're on login page
    if (isOnLogin) {
      loggingCustom(LogType.CLIENT_LOG, 'log', '[AUTH_TOKEN] getValidAccessToken() - skipped (on login page)');
      return null;
    }

    // If we have a token, check if it's expired
    if (hasToken && this.accessToken) {
      const expired = this.isTokenExpired(this.accessToken);
      
      if (expired === true) {
        // Token is expired - clear it and refresh
        loggingCustom(LogType.CLIENT_LOG, 'log', `[AUTH_TOKEN] getValidAccessToken() - token expired, clearing and refreshing ${JSON.stringify({
          tokenLength: this.accessToken.length,
        })}`);
        this.clearAccessToken();
        // Fall through to refresh logic below
      } else if (expired === false) {
        // Token is valid - return it
        loggingCustom(LogType.CLIENT_LOG, 'log', `[AUTH_TOKEN] getValidAccessToken() - returning valid token from memory ${JSON.stringify({
          tokenLength: this.accessToken.length,
          tokenPreview: `${this.accessToken.substring(0, 20)}...`,
        })}`);
        return this.accessToken;
      } else {
        // Cannot determine expiration (invalid token format) - still return it
        // Server will reject if truly invalid and trigger 401 handling
        loggingCustom(LogType.CLIENT_LOG, 'warn', `[AUTH_TOKEN] getValidAccessToken() - cannot determine expiration, returning token anyway ${JSON.stringify({
          tokenLength: this.accessToken.length,
        })}`);
        return this.accessToken;
      }
    }

    // No token or token expired - check if refresh token exists
    if (!this.hasRefreshToken()) {
      loggingCustom(LogType.CLIENT_LOG, 'warn', '[AUTH_TOKEN] getValidAccessToken() - no refresh token, redirecting to login');
      this.redirectToLogin();
      return null;
    }

    // If refresh is in progress, queue this request
    if (this.refreshPromise) {
      loggingCustom(LogType.CLIENT_LOG, 'log', `[AUTH_TOKEN] getValidAccessToken() - refresh in progress, queuing request ${JSON.stringify({
        queuePosition: this.queuedRequests.length + 1,
      })}`);
      return new Promise<string | null>((resolve, reject) => {
        this.queuedRequests.push({ resolve, reject });
      });
    }

    // Start refresh
    loggingCustom(LogType.CLIENT_LOG, 'log', '[AUTH_TOKEN] getValidAccessToken() - no valid token, starting refresh');
    return this.refreshAccessToken();
  }

  /**
   * Handle 401 response by refreshing token and retrying request
   * Returns new token if refresh succeeds, null otherwise
   * Throws RateLimitError if refresh fails due to rate limiting (429)
   */
  async handleUnauthorized(): Promise<string | null> {
    loggingCustom(LogType.CLIENT_LOG, 'log', '[AUTH_TOKEN] handleUnauthorized() - 401 received, refreshing token');
    
    // Clear stale token
    this.clearAccessToken();
    
    // Check if we're in rate limit cooldown before attempting refresh
    if (this.lastRateLimitError) {
      const now = Date.now();
      const timeSinceLast429 = now - this.lastRateLimitError;
      if (timeSinceLast429 < this.rateLimitCooldownMs) {
        const remainingCooldown = Math.ceil((this.rateLimitCooldownMs - timeSinceLast429) / 1000);
        loggingCustom(LogType.CLIENT_LOG, 'warn', `[AUTH_TOKEN] handleUnauthorized() - rate limit cooldown active ${JSON.stringify({
          remainingCooldownSeconds: remainingCooldown,
        })}`);
        throw new RateLimitError(`Too many requests. Please wait ${remainingCooldown} seconds before retrying.`);
      }
    }
    
    // Attempt refresh
    const newToken = await this.refreshAccessToken();
    
    // If refresh returned null and we have a recent rate limit error, throw RateLimitError
    if (newToken === null && this.lastRateLimitError) {
      const now = Date.now();
      const timeSinceLast429 = now - this.lastRateLimitError;
      if (timeSinceLast429 < this.rateLimitCooldownMs) {
        const remainingCooldown = Math.ceil((this.rateLimitCooldownMs - timeSinceLast429) / 1000);
        throw new RateLimitError(`Too many requests. Please wait ${remainingCooldown} seconds before retrying.`);
      }
    }
    
    loggingCustom(LogType.CLIENT_LOG, 'log', `[AUTH_TOKEN] handleUnauthorized() - refresh result ${JSON.stringify({
      success: newToken !== null,
      tokenLength: newToken?.length || 0,
    })}`);
    return newToken;
  }

  /**
   * Check if we're currently on the login page
   */
  private isOnLoginPage(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.location.pathname.startsWith('/authentication/login');
  }

  /**
   * Redirect to login page
   * Preserves current URL as returnUrl for post-login redirect
   * Does nothing if already on login page to prevent redirect loops
   */
  private redirectToLogin(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Don't redirect if already on login page (prevents infinite loops)
    if (this.isOnLoginPage()) {
      return;
    }

    const currentPath = window.location.pathname + window.location.search;
    const loginUrl = `/authentication/login?returnUrl=${encodeURIComponent(currentPath)}`;
    
    // Use window.location for full page navigation (handles hard refresh, initial load)
    window.location.href = loginUrl;
  }
}

// Singleton instance - shared across entire application
export const authTokenManager = new AuthTokenManager();

