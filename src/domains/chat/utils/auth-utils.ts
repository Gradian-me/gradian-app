/**
 * Chat Authentication Utilities
 * Provides authentication and authorization helpers for chat API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateToken, extractTokenFromHeader, extractTokenFromCookies } from '@/domains/auth';
import { AUTH_CONFIG } from '@/gradian-ui/shared/configs/auth-config';
import { REQUIRE_LOGIN, DEMO_MODE } from '@/gradian-ui/shared/configs/env-config';
import { getChatById } from './chat-storage.util';

// Hardcoded demo userId for when REQUIRE_LOGIN is false and DEMO_MODE is true
const DEMO_USER_ID = '01K9ABA6MQ9K64MY7M4AEBCAP2';

/**
 * Extract and validate user ID from request
 * Returns userId if valid, null otherwise
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  let token = extractTokenFromHeader(authHeader);

  // If not in header, try cookies
  if (!token) {
    const cookies = request.headers.get('cookie');
    token = extractTokenFromCookies(cookies, AUTH_CONFIG.ACCESS_TOKEN_COOKIE);
  }

  if (!token) {
    return null;
  }

  try {
    const result = validateToken(token);
    if (result.valid && result.payload?.userId) {
      return result.payload.userId;
    }
  } catch (error) {
    console.error('Error validating token:', error);
  }

  return null;
}

/**
 * Require authentication - returns error response if not authenticated
 * In demo mode without login requirement, uses hardcoded demo userId
 */
export function requireAuth(request: NextRequest): { userId: string } | NextResponse {
  // If REQUIRE_LOGIN is false and DEMO_MODE is true, use demo userId
  if (!REQUIRE_LOGIN && DEMO_MODE) {
    return { userId: DEMO_USER_ID };
  }

  const userId = getUserIdFromRequest(request);
  
  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: AUTH_CONFIG.ERROR_MESSAGES.UNAUTHORIZED,
      },
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return { userId };
}

/**
 * Require authorization - ensures user owns the chat
 */
export function requireChatOwnership(
  request: NextRequest,
  chatId: string
): { userId: string } | NextResponse {
  // First check authentication
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { userId } = authResult;

  // Check if chat exists and user owns it
  const chat = getChatById(chatId);
  if (!chat) {
    return NextResponse.json(
      {
        success: false,
        error: `Chat with ID "${chatId}" not found`,
      },
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (chat.userId !== userId) {
    return NextResponse.json(
      {
        success: false,
        error: AUTH_CONFIG.ERROR_MESSAGES.UNAUTHORIZED,
      },
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return { userId };
}

/**
 * Validate user ID matches authenticated user
 */
export function validateUserId(request: NextRequest, providedUserId: string): boolean {
  const userId = getUserIdFromRequest(request);
  return userId !== null && userId === providedUserId;
}

