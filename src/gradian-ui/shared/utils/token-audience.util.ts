/**
 * Token Audience Utility
 * 
 * Provides a reusable function to extract access tokens from requests
 * (or accept a token directly) and add an audienceId claim to the token.
 */

import { NextRequest } from 'next/server';
import { extractTokenFromHeader, extractTokenFromCookies } from '@/domains/auth';
import { AUTH_CONFIG } from '@/gradian-ui/shared/configs/auth-config';
import { getAccessToken } from '@/app/api/auth/helpers/server-token-cache';
import { addAudienceToToken } from '@/domains/auth/utils/jwt.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

export interface GetTokenWithAudienceOptions {
  /**
   * Optional NextRequest to extract token from.
   * Token extraction priority:
   * 1. Authorization header
   * 2. Access token cookie
   * 3. Server memory (via refresh token from cookies)
   */
  request?: NextRequest;
  /**
   * Optional token string. If provided, uses this token directly
   * instead of extracting from request.
   */
  token?: string | null;
  /**
   * Audience ID to add to the token.
   * If not provided, defaults to process.env.APP_ID.
   * Set to null to skip adding audienceId (return token as-is).
   */
  audienceId?: string | null;
  /**
   * Log context prefix for logging messages (e.g., '[Dynamic Query]', '[INTEGRATION_SYNC]')
   */
  logContext?: string;
}

/**
 * Get access token with audienceId added
 * 
 * Extracts token from request (or uses provided token) and adds audienceId claim.
 * Returns Bearer token string ready for Authorization header.
 * 
 * @param options - Configuration options
 * @returns Bearer token string with audienceId, or null if no token found
 */
export async function getTokenWithAudience(
  options: GetTokenWithAudienceOptions
): Promise<string | null> {
  const {
    request,
    token: providedToken,
    audienceId,
    logContext = '',
  } = options;
  
  // Default audienceId if not explicitly set (including null)
  const shouldAddAudience = audienceId !== null;
  const defaultAudienceId = process.env.APP_ID;
  const finalAudienceId = audienceId !== undefined && audienceId !== null 
    ? audienceId 
    : defaultAudienceId;

  const logPrefix = logContext ? `${logContext} ` : '';

  // Validate audienceId if we need to add it
  if (shouldAddAudience && !finalAudienceId) {
    loggingCustom(
      LogType.CALL_BACKEND,
      'error',
      `${logPrefix}APP_ID environment variable is not set and no audienceId provided`
    );
    return null;
  }

  // If token is provided directly, use it
  if (providedToken) {
    if (shouldAddAudience) {
      try {
        const tokenWithAudience = addAudienceToToken(providedToken, finalAudienceId!);
        loggingCustom(
          LogType.CALL_BACKEND,
          'info',
          `${logPrefix}Using provided token with audienceId: ${finalAudienceId}`
        );
        return `Bearer ${tokenWithAudience}`;
      } catch (error) {
        loggingCustom(
          LogType.CALL_BACKEND,
          'warn',
          `${logPrefix}Failed to add audienceId to provided token: ${error instanceof Error ? error.message : String(error)}`
        );
        return null;
      }
    } else {
      // No audienceId to add, return token as-is
      loggingCustom(
        LogType.CALL_BACKEND,
        'info',
        `${logPrefix}Using provided token without audienceId`
      );
      return `Bearer ${providedToken}`;
    }
  }

  // If no request provided, cannot extract token
  if (!request) {
    loggingCustom(
      LogType.CALL_BACKEND,
      'warn',
      `${logPrefix}No token provided and no request available to extract token from`
    );
    return null;
  }

  // Extract token from request using priority order
  let authHeader: string | null = null;
  let authToken: string | null = null;

  // Priority 1: Authorization header
  const incomingAuthHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (incomingAuthHeader) {
    authToken = extractTokenFromHeader(incomingAuthHeader);
    if (authToken) {
      authHeader = incomingAuthHeader.toLowerCase().startsWith('bearer ')
        ? incomingAuthHeader
        : `Bearer ${authToken}`;
      loggingCustom(
        LogType.CALL_BACKEND,
        'debug',
        `${logPrefix}Token extracted from Authorization header (length: ${authToken.length})`
      );
    }
  }

  // Priority 2: Access token cookie
  if (!authToken) {
    const cookies = request.headers.get('cookie');
    authToken = extractTokenFromCookies(cookies, AUTH_CONFIG.ACCESS_TOKEN_COOKIE);
    if (authToken) {
      authHeader = `Bearer ${authToken}`;
      loggingCustom(
        LogType.CALL_BACKEND,
        'debug',
        `${logPrefix}Token extracted from access token cookie (length: ${authToken.length})`
      );
    }
  }

  // Priority 3: Server memory (via refresh token from cookies)
  if (!authToken) {
    const cookies = request.headers.get('cookie');
    const refreshToken = extractTokenFromCookies(cookies, AUTH_CONFIG.REFRESH_TOKEN_COOKIE);

    if (refreshToken) {
      // Look up access token from server memory using refresh token as key
      authToken = getAccessToken(refreshToken);

      if (authToken) {
        authHeader = `Bearer ${authToken}`;
        loggingCustom(
          LogType.CALL_BACKEND,
          'info',
          `${logPrefix}Retrieved access token from server memory using refresh token (refresh token: ${refreshToken.substring(0, 30)}...)`
        );
      } else {
        loggingCustom(
          LogType.CALL_BACKEND,
          'warn',
          `${logPrefix}Access token not found in server memory for refresh token: ${refreshToken.substring(0, 30)}... (may need refresh)`
        );
      }
    } else {
      loggingCustom(
        LogType.CALL_BACKEND,
        'debug',
        `${logPrefix}No refresh token found in cookies`
      );
    }
  }

  // If no token found, return null
  if (!authToken) {
    loggingCustom(
      LogType.CALL_BACKEND,
      'warn',
      `${logPrefix}No authorization token found in header, cookies, or server memory`
    );
    return null;
  }

  // Add audienceId to token if needed
  if (shouldAddAudience) {
    try {
      const tokenWithAudience = addAudienceToToken(authToken, finalAudienceId!);
      loggingCustom(
        LogType.CALL_BACKEND,
        'info',
        `${logPrefix}Added audienceId to token: ${finalAudienceId!}`
      );
      return `Bearer ${tokenWithAudience}`;
    } catch (error) {
      loggingCustom(
        LogType.CALL_BACKEND,
        'warn',
        `${logPrefix}Failed to add audienceId to token: ${error instanceof Error ? error.message : String(error)}. Returning token without audience.`
      );
      // Return original token if adding audience fails
      return authHeader;
    }
  } else {
    // No audienceId to add, return token as-is
    loggingCustom(
      LogType.CALL_BACKEND,
      'info',
      `${logPrefix}Using token without audienceId`
    );
    return authHeader;
  }
}

