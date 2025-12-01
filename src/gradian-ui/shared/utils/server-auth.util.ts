/**
 * Server-side Authentication Utilities
 * Functions to get user information from cookies/headers in server components
 */

import { cookies, headers } from 'next/headers';
import { validateToken, extractTokenFromHeader, extractTokenFromCookies } from '@/domains/auth';
import { AUTH_CONFIG } from '@/gradian-ui/shared/constants/application-variables';
import { User } from '@/types';

/**
 * Get current user from cookies/headers in server components
 * Returns null if no valid token is found
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    let token: string | null = null;
    
    // Try to get token from cookies first
    const cookieStore = await cookies();
    const accessTokenCookie = cookieStore.get(AUTH_CONFIG.ACCESS_TOKEN_COOKIE);
    if (accessTokenCookie?.value) {
      token = accessTokenCookie.value;
    }

    // If not in cookies, try headers
    if (!token) {
      const headersList = await headers();
      const authHeader = headersList.get('authorization');
      token = extractTokenFromHeader(authHeader);
    }

    if (!token) {
      return null;
    }

    // Validate token and extract user info
    const result = validateToken(token);
    if (!result.valid || !result.payload) {
      return null;
    }

    const payload = result.payload;
    
    // Return user object from token payload
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

