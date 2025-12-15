// Chat Execute Todos API Route
// Executes approved todos via orchestrator

import { NextRequest, NextResponse } from 'next/server';
import { executeApprovedTodos } from '@/domains/ai-builder/utils/ai-orchestrator-utils';
import type { Todo } from '@/domains/chat/types';

/**
 * POST - Execute approved todos
 * Body: { todos: Todo[], initialInput: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ 'chat-id': string }> }
) {
  try {
    const { 'chat-id': chatId } = await params;
    const body = await request.json();
    const { todos, initialInput } = body;

    if (!todos || !Array.isArray(todos) || todos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'todos array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!initialInput || typeof initialInput !== 'string') {
      return NextResponse.json(
        { success: false, error: 'initialInput is required' },
        { status: 400 }
      );
    }

    // Get base URL for preload routes
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Load available agents from the API route
    const agentsResponse = await fetch(`${baseUrl}/api/ai-agents`);
    const agentsResult = await agentsResponse.json();
    const availableAgents = agentsResult.success ? agentsResult.data : [];

    // Execute approved todos
    const result = await executeApprovedTodos(
      todos as Todo[],
      availableAgents,
      initialInput,
      baseUrl
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to execute todos',
        },
        { status: 500 }
      );
    }

    // Update todos in the chat message metadata
    const { updateChatMessageTodos } = await import('@/domains/chat/utils/chat-storage.util');
    const updatedTodos = result.data?.todos || todos;
    updateChatMessageTodos(chatId, updatedTodos);

    return NextResponse.json({
      success: true,
      data: {
        ...result.data,
        todos: updatedTodos, // Return updated todos with chainMetadata
      },
    });
  } catch (error) {
    console.error('Error in POST /api/chat/[chat-id]/execute-todos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

