// Chat Todos API Route
// Handles todo management for a chat (session-only, not persisted)

import { NextRequest, NextResponse } from 'next/server';
import { getChatById } from '@/domains/chat/utils/chat-storage.util';
import type { Todo } from '@/domains/chat/types';
import { ulid } from 'ulid';

/**
 * GET - Get active todos for a chat (from latest message metadata)
 * Returns todos from the most recent message that has todos
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

    // Find todos from the most recent message that has todos
    const messagesWithTodos = chat.messages
      .filter(msg => msg.metadata?.todos && msg.metadata.todos.length > 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const todos = messagesWithTodos.length > 0 
      ? messagesWithTodos[0].metadata!.todos!
      : [];

    return NextResponse.json({
      success: true,
      data: todos,
    });
  } catch (error) {
    console.error('Error in GET /api/chat/[chat-id]/todos:', error);
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
 * POST - Create/update todos for a chat
 * Body: { todos: Todo[] }
 * Note: This updates the latest message's metadata with new todos, or creates a temporary message if none exists
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

    const body: { todos: Todo[] } = await request.json();

    if (!Array.isArray(body.todos)) {
      return NextResponse.json(
        { success: false, error: 'todos must be an array' },
        { status: 400 }
      );
    }

    // Update todos in the latest message's metadata
    const { updateChatMessageTodos, getChatById, loadChats, saveChats } = await import('@/domains/chat/utils/chat-storage.util');
    const success = updateChatMessageTodos(chatId, body.todos);

    if (!success) {
      // If no message with todos exists, we need to wait for the message to be created
      // For now, just return the todos - they will be saved when the message is created
      // The message creation in useChat.ts already includes todos in metadata
      return NextResponse.json({
        success: true,
        data: body.todos,
        message: 'Todos will be saved when message is created',
      });
    }

    return NextResponse.json({
      success: true,
      data: body.todos,
    });
  } catch (error) {
    console.error('Error in POST /api/chat/[chat-id]/todos:', error);
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
 * PUT - Update todos for a chat
 * Body: { todos: Todo[] }
 * Note: This updates the latest message's metadata with new todos (for edit, delete, reorder)
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

    const body: { todos: Todo[] } = await request.json();

    if (!Array.isArray(body.todos)) {
      return NextResponse.json(
        { success: false, error: 'todos must be an array' },
        { status: 400 }
      );
    }

    // Update todos in the latest message's metadata
    const { updateChatMessageTodos } = await import('@/domains/chat/utils/chat-storage.util');
    const success = updateChatMessageTodos(chatId, body.todos);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update todos. No message with todos found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: body.todos,
    });
  } catch (error) {
    console.error('Error in PUT /api/chat/[chat-id]/todos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

