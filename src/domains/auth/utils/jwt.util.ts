// JWT Utility Functions
// Handles creation, verification, and refresh of JWT tokens

import jwt from 'jsonwebtoken';
import { AUTH_CONFIG } from '@/gradian-ui/shared/configs/auth-config';
import { JWTPayload, AuthTokens } from '../types';

/**
 * Create access token for a user
 */
export function createAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    },
    AUTH_CONFIG.JWT_SECRET,
    {
      expiresIn: AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
    }
  );
}

/**
 * Create refresh token for a user
 */
export function createRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      type: 'refresh',
    },
    AUTH_CONFIG.JWT_SECRET,
    {
      expiresIn: AUTH_CONFIG.REFRESH_TOKEN_EXPIRY,
    }
  );
}

/**
 * Create both access and refresh tokens
 */
export function createTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): AuthTokens {
  return {
    accessToken: createAccessToken(payload),
    refreshToken: createRefreshToken(payload),
    expiresIn: AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
  };
}

/**
 * Decode JWT token without signature verification (for external tokens)
 * This is used when tokens come from external auth services
 */
export function decodeTokenWithoutVerification(token: string): any {
  try {
    // Decode without verification
    const decoded = jwt.decode(token, { complete: false });
    return decoded;
  } catch (error) {
    throw new Error('Failed to decode token');
  }
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, AUTH_CONFIG.JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer token" and just "token"
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }
  
  return authHeader;
}

/**
 * Extract token from request cookies
 */
export function extractTokenFromCookies(cookies: string | null, cookieName: string): string | null {
  if (!cookies) {
    return null;
  }

  const cookieMap = new Map<string, string>();
  cookies.split(';').forEach((cookie) => {
    const [name, ...valueParts] = cookie.trim().split('=');
    const value = valueParts.join('=');
    // Store with original case for exact match, but also enable case-insensitive lookup
    cookieMap.set(name, decodeURIComponent(value));
  });

  // Try exact match first
  let token = cookieMap.get(cookieName);
  
  // If not found, try case-insensitive match
  if (!token) {
    for (const [name, value] of cookieMap.entries()) {
      if (name.toLowerCase() === cookieName.toLowerCase()) {
        token = value;
        break;
      }
    }
  }

  return token || null;
}

/**
 * Add audienceId claim to an existing JWT token
 * Decodes the token, adds the audienceId, and re-signs it
 */
export function addAudienceToToken(token: string, audienceId: string): string {
  try {
    const verified = jwt.verify(token, AUTH_CONFIG.JWT_SECRET) as JWTPayload;
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (verified.exp && verified.exp <= nowSeconds) {
      throw new Error('Token has expired');
    }

    const remainingTtl = verified.exp ? Math.max(verified.exp - nowSeconds, 1) : AUTH_CONFIG.ACCESS_TOKEN_EXPIRY;

    return jwt.sign(
      {
        userId: verified.userId,
        email: verified.email,
        name: verified.name,
        role: verified.role,
        audience: audienceId,
      },
      AUTH_CONFIG.JWT_SECRET,
      {
        expiresIn: remainingTtl,
      }
    );
  } catch (error) {
    throw new Error(`Failed to add audience to token: ${error instanceof Error ? error.message : String(error)}`);
  }
}

