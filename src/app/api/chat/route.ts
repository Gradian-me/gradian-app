// Chat API Route
// Handles chat list and creation

import { NextRequest, NextResponse } from 'next/server';
import { loadChats, createChat, getChatsByUserId } from '@/domains/chat/utils/chat-storage.util';
import { requireAuth } from '@/domains/chat/utils/auth-utils';
import { validateChatTitle, validateRequestBodySize } from '@/domains/chat/utils/validation-utils';
import type { CreateChatRequest } from '@/domains/chat/types';

/**
 * GET - Get all chats filtered by userId (deprecated - use POST instead)
 * Query params: ?userId=xxx&summary=true
 * - summary=true: Returns lightweight chat data without messages (for list view)
 * - summary=false or omitted: Returns full chat data with messages
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { userId } = authResult;

    const searchParams = request.nextUrl.searchParams;
    const summary = searchParams.get('summary') === 'true';

    // Use authenticated user ID instead of query parameter
    // Delegate to the same logic as POST
    return await handleGetChats(userId, summary);
  } catch (error) {
    console.error('Error in GET /api/chat:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to handle getting chats
 */
async function handleGetChats(userId: string, summary: boolean) {

  // Get chats filtered by userId, sorted by lastMessageAt (most recent first)
  const chats = getChatsByUserId(userId);
  
  // Sort by lastMessageAt descending (most recent first)
  const sortedChats = chats.sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime;
  });

  // If summary mode, return only essential fields (no messages)
  if (summary) {
    const summaryChats = sortedChats.map((chat) => ({
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      userId: chat.userId,
      lastMessage: chat.lastMessage,
      lastMessageAt: chat.lastMessageAt,
      selectedAgentId: chat.selectedAgentId,
      messageCount: chat.messages?.length || 0, // Include count for reference
    }));

    return NextResponse.json({
      success: true,
      data: summaryChats,
      meta: {
        totalCount: summaryChats.length,
        summary: true,
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60', // 30s cache for summary
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: sortedChats,
    meta: {
      totalCount: sortedChats.length,
    },
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate', // No cache for full data
    },
  });
}

/**
 * POST - Get chats or Create new chat
 * Body for getting chats: { userId: string, summary?: boolean }
 * Body for creating chat: { userId: string, title?: string, selectedAgentId?: string | null }
 * 
 * If body contains only userId (and optionally summary), it fetches chats
 * If body contains userId and other fields, it creates a new chat
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { userId } = authResult;

    // Validate request body size
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const sizeValidation = validateRequestBodySize(parseInt(contentLength, 10));
      if (!sizeValidation.valid) {
        return NextResponse.json(
          { success: false, error: sizeValidation.error },
          { status: 413, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Parse request body with error handling
    let body: any;
    try {
      const contentType = request.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return NextResponse.json(
          { success: false, error: 'Content-Type must be application/json' },
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is a "get chats" request (only summary) vs a "create chat" request
    const isGetRequest = !body.title && body.selectedAgentId === undefined;
    
    if (isGetRequest) {
      // Get chats request - use authenticated user ID
      const summary = body.summary === true;
      return await handleGetChats(userId, summary);
    } else {
      // Create chat request - validate title
      const titleValidation = validateChatTitle(body.title);
      if (!titleValidation.valid) {
        return NextResponse.json(
          { success: false, error: titleValidation.error },
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Use authenticated user ID, not from body
      const createRequest: CreateChatRequest = {
        userId: userId, // Use authenticated user ID
        title: body.title,
        selectedAgentId: body.selectedAgentId,
      };

      const newChat = createChat(createRequest);

      return NextResponse.json({
        success: true,
        data: newChat,
      }, { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    console.error('Error in POST /api/chat:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

