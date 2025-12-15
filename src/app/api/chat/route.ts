// Chat API Route
// Handles chat list and creation

import { NextRequest, NextResponse } from 'next/server';
import { loadChats, createChat, getChatsByUserId } from '@/domains/chat/utils/chat-storage.util';
import type { CreateChatRequest } from '@/domains/chat/types';

/**
 * GET - Get all chats filtered by userId (deprecated - use POST instead)
 * Query params: ?userId=xxx&summary=true
 * - summary=true: Returns lightweight chat data without messages (for list view)
 * - summary=false or omitted: Returns full chat data with messages
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const summary = searchParams.get('summary') === 'true';

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

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
    const body: any = await request.json();

    if (!body.userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Check if this is a "get chats" request (only userId and optional summary)
    // vs a "create chat" request (has title or selectedAgentId)
    const isGetRequest = !body.title && body.selectedAgentId === undefined;
    
    if (isGetRequest) {
      // Get chats request
      const summary = body.summary === true;
      return await handleGetChats(body.userId, summary);
    } else {
      // Create chat request
      const createRequest: CreateChatRequest = {
        userId: body.userId,
        title: body.title,
        selectedAgentId: body.selectedAgentId,
      };

      const newChat = createChat(createRequest);

      return NextResponse.json({
        success: true,
        data: newChat,
      }, { status: 201 });
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

