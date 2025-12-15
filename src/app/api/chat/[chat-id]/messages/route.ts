// Chat Messages API Route
// Handles adding and retrieving messages for a chat

import { NextRequest, NextResponse } from 'next/server';
import { getChatById, addMessageToChat } from '@/domains/chat/utils/chat-storage.util';
import type { AddMessageRequest } from '@/domains/chat/types';

/**
 * GET - Get messages for a chat (with pagination)
 * Query params: ?limit=50&offset=0
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ 'chat-id': string }> }
) {
  try {
    const { 'chat-id': chatId } = await params;

    if (!chatId) {
      return NextResponse.json(
        { success: false, error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    const chat = getChatById(chatId);

    if (!chat) {
      return NextResponse.json(
        { success: false, error: `Chat with ID "${chatId}" not found` },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get messages in reverse order (newest first) for pagination
    const sortedMessages = [...chat.messages].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const paginatedMessages = sortedMessages.slice(offset, offset + limit);
    
    // Reverse to show oldest first in response
    const messages = paginatedMessages.reverse();

    return NextResponse.json({
      success: true,
      data: {
        messages,
        total: chat.messages.length,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/chat/[chat-id]/messages:', error);
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
 * POST - Add message to chat
 * Body: { role, content, agentId?, agentType?, metadata? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ 'chat-id': string }> }
) {
  try {
    const { 'chat-id': chatId } = await params;

    if (!chatId) {
      return NextResponse.json(
        { success: false, error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    const body: AddMessageRequest = await request.json();

    if (!body.role || !body.content) {
      return NextResponse.json(
        { success: false, error: 'role and content are required' },
        { status: 400 }
      );
    }

    const message = addMessageToChat(chatId, body);

    return NextResponse.json({
      success: true,
      data: message,
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/chat/[chat-id]/messages:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

