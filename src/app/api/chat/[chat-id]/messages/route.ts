// Chat Messages API Route
// Handles adding and retrieving messages for a chat

import { NextRequest, NextResponse } from 'next/server';
import { getChatById, addMessageToChat } from '@/domains/chat/utils/chat-storage.util';
import { requireChatOwnership } from '@/domains/chat/utils/auth-utils';
import { validateChatId, validateMessageContent, validateMessageRole, validateAgentType, validateRequestBodySize } from '@/domains/chat/utils/validation-utils';
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

    // Parse request body with error handling
    let body: AddMessageRequest;
    try {
      const contentType = request.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return NextResponse.json(
          { success: false, error: 'Content-Type must be application/json' },
          { status: 400 }
        );
      }
      body = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate chat ID format
    const chatIdValidation = validateChatId(chatId);
    if (!chatIdValidation.valid) {
      return NextResponse.json(
        { success: false, error: chatIdValidation.error },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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

    // Require authentication and ownership
    const authResult = requireChatOwnership(request, chatId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Validate required fields
    if (!body.role || !body.content) {
      return NextResponse.json(
        { success: false, error: 'role and content are required' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate message content
    const contentValidation = validateMessageContent(body.content);
    if (!contentValidation.valid) {
      return NextResponse.json(
        { success: false, error: contentValidation.error },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate message role
    const roleValidation = validateMessageRole(body.role);
    if (!roleValidation.valid) {
      return NextResponse.json(
        { success: false, error: roleValidation.error },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate agent type if provided
    if (body.agentType) {
      const agentTypeValidation = validateAgentType(body.agentType);
      if (!agentTypeValidation.valid) {
        return NextResponse.json(
          { success: false, error: agentTypeValidation.error },
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if chat exists (should already be validated by requireChatOwnership)
    const chat = getChatById(chatId);

    const message = addMessageToChat(chatId, body);

    return NextResponse.json({
      success: true,
      data: message,
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/chat/[chat-id]/messages:', error);
    
    // Ensure we always return JSON, never HTML
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

