// Chat API Route - Individual Chat Operations
// Handles GET, PUT, DELETE for specific chat

import { NextRequest, NextResponse } from 'next/server';
import { getChatById, updateChat, deleteChat } from '@/domains/chat/utils/chat-storage.util';
import { requireChatOwnership } from '@/domains/chat/utils/auth-utils';
import { validateChatId, validateChatTitle, validateRequestBodySize } from '@/domains/chat/utils/validation-utils';
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

    // Validate chat ID format
    const chatIdValidation = validateChatId(chatId);
    if (!chatIdValidation.valid) {
      return NextResponse.json(
        { success: false, error: chatIdValidation.error },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Require authentication and ownership
    const authResult = requireChatOwnership(request, chatId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const chat = getChatById(chatId);

    if (!chat) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chat not found',
        },
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
    }, { headers: { 'Content-Type': 'application/json' } });
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

    // Validate chat ID format
    const chatIdValidation = validateChatId(chatId);
    if (!chatIdValidation.valid) {
      return NextResponse.json(
        { success: false, error: chatIdValidation.error },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Require authentication and ownership
    const authResult = requireChatOwnership(request, chatId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

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

    // Parse and validate body
    let body: UpdateChatRequest;
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

    // Validate title if provided
    if (body.title !== undefined) {
      const titleValidation = validateChatTitle(body.title);
      if (!titleValidation.valid) {
        return NextResponse.json(
          { success: false, error: titleValidation.error },
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const updatedChat = updateChat(chatId, body);

    if (!updatedChat) {
      return NextResponse.json(
        { success: false, error: `Chat with ID "${chatId}" not found` },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedChat,
    }, { headers: { 'Content-Type': 'application/json' } });
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

    // Validate chat ID format
    const chatIdValidation = validateChatId(chatId);
    if (!chatIdValidation.valid) {
      return NextResponse.json(
        { success: false, error: chatIdValidation.error },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Require authentication and ownership
    const authResult = requireChatOwnership(request, chatId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const deleted = deleteChat(chatId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: `Chat with ID "${chatId}" not found` },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Chat deleted successfully',
    }, { headers: { 'Content-Type': 'application/json' } });
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

