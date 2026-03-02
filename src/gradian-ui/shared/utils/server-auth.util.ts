/**
 * Server-side Authentication Utilities
 * Functions to get user information from cookies/headers in server components.
 *
 * IMPORTANT:
 * - Access tokens are stored in server memory (ServerTokenCache) keyed by refresh token.
 * - Browsers only hold the refresh token in an httpOnly cookie.
 * - To keep SSR auth consistent with API routes, we must:
 *   1) Prefer the access_token cookie when present (legacy / local mode)
 *   2) Otherwise, derive the access token from ServerTokenCache using the refresh token
 *   3) As a final fallback, validate/decode the refresh token itself (for external JWTs)
 */

import { cookies, headers } from 'next/headers';
import { validateToken, extractTokenFromHeader } from '@/domains/auth';
import { AUTH_CONFIG } from '@/gradian-ui/shared/configs/auth-config';
import { User } from '@/types';
import { getAccessToken } from '@/app/api/auth/helpers/server-token-cache';

/**
 * Get current user from cookies/headers in server components.
 * Returns null if no valid token is found.
 *
 * Token resolution order:
 * 1) access_token cookie (when present in local/demo mode)
 * 2) ServerTokenCache entry keyed by refresh_token cookie
 * 3) refresh_token cookie itself (validated/decoded via validateToken for external JWTs)
 * 4) Authorization header (for server-to-server requests)
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    let token: string | null = null;

    // 1) Try to get access token directly from cookies (legacy / local JWT mode)
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get(AUTH_CONFIG.ACCESS_TOKEN_COOKIE);
    if (accessTokenCookie?.value) {
      token = accessTokenCookie.value;
    }

    // 2) If no access token cookie, try refresh token + ServerTokenCache
    if (!token) {
      const refreshTokenCookie = cookieStore.get(AUTH_CONFIG.REFRESH_TOKEN_COOKIE);
      const refreshToken = refreshTokenCookie?.value?.trim();

      if (refreshToken) {
        // Prefer access token from server memory (consistent with API auth + proxy flows)
        const cachedAccessToken = getAccessToken(refreshToken);
        if (cachedAccessToken) {
          token = cachedAccessToken;
        } else {
          // 3) Fallback: validate/decode refresh token itself (external JWTs)
          const refreshResult = validateToken(refreshToken);
          if (refreshResult.valid && refreshResult.payload) {
            const payload = refreshResult.payload;
            return {
              id: payload.userId,
              email: payload.email,
              name: payload.name,
              role: payload.role,
            } as User;
          }
        }
      }
    }

    // 4) As a last resort, try Authorization header (e.g. server-to-server / RSC with header)
    if (!token) {
      const headersList = await headers();
      const authHeader = headersList.get('authorization');
      token = extractTokenFromHeader(authHeader);
    }

    if (!token) {
      return null;
    }

    // Validate token (access token from cookie/cache or decoded external JWT)
    const result = validateToken(token);
    if (!result.valid || !result.payload) {
      return null;
    }

    const payload = result.payload;

    return {
      id: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    } as User;
  } catch (error) {
    console.error('Error getting current user from server:', error);
    return null;
  }
}

