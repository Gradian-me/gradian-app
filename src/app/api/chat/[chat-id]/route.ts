// Chat API Route - Individual Chat Operations
// Handles GET, PUT, DELETE for specific chat

import { NextRequest, NextResponse } from 'next/server';
import { getChatById, updateChat, deleteChat } from '@/domains/chat/utils/chat-storage.util';
import type { UpdateChatRequest } from '@/domains/chat/types';

/**
 * GET - Get chat by ID
 * Supports pagination via query params:
 *   - page (1-based, default 1)
 *   - limit (default 20)
 * Returns messages slice plus pagination metadata.
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

    // Pagination: default to last 20 messages
    const searchParams = request.nextUrl.searchParams;
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const limit = Math.max(1, parseInt(limitParam || '20', 10) || 20);

    const totalMessages = chat.messages.length;
    const end = totalMessages - (page - 1) * limit;
    const start = Math.max(0, end - limit);
    const pagedMessages = chat.messages.slice(start, end);
    const hasMore = start > 0;

    return NextResponse.json({
      success: true,
      data: {
        ...chat,
        messages: pagedMessages,
        pagination: {
          page,
          limit,
          totalMessages,
          hasMore,
        },
      },
    });
  } catch (error) {
    console.error('Error in GET /api/chat/[chat-id]:', error);
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
 * PUT - Update chat (title, selectedAgentId)
 * Body: { title?: string, selectedAgentId?: string | null }
 */
export async function PUT(
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

    const body: UpdateChatRequest = await request.json();
    const updatedChat = updateChat(chatId, body);

    if (!updatedChat) {
      return NextResponse.json(
        { success: false, error: `Chat with ID "${chatId}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedChat,
    });
  } catch (error) {
    console.error('Error in PUT /api/chat/[chat-id]:', error);
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
 * DELETE - Delete chat
 */
export async function DELETE(
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

    const deleted = deleteChat(chatId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: `Chat with ID "${chatId}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Chat deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/chat/[chat-id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

