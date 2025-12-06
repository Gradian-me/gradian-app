// JWT Utility Functions
// Handles creation, verification, and refresh of JWT tokens

import jwt from 'jsonwebtoken';
import { AUTH_CONFIG } from '@/gradian-ui/shared/constants/application-variables';
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
    cookieMap.set(name, decodeURIComponent(value));
  });

  return cookieMap.get(cookieName) || null;
}

/**
 * Add audienceId claim to an existing JWT token
 * Decodes the token, adds the audienceId, and re-signs it
 */
export function addAudienceToToken(token: string, audienceId: string): string {
  try {
    // Decode without verification to get the payload
    const decoded = jwt.decode(token) as any;
    if (!decoded) {
      throw new Error('Failed to decode token');
    }

    // Create new token with audienceId added
    return jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        audience: audienceId,
      },
      AUTH_CONFIG.JWT_SECRET,
      {
        expiresIn: decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
      }
    );
  } catch (error) {
    throw new Error(`Failed to add audience to token: ${error instanceof Error ? error.message : String(error)}`);
  }
}

