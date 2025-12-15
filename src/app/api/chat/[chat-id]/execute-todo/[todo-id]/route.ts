// Chat Execute Single Todo API Route
// Executes a single todo by ID

import { NextRequest, NextResponse } from 'next/server';
import { loadChats, updateChatMessageTodos } from '@/domains/chat/utils/chat-storage.util';
import { processAiAgent } from '@/domains/ai-builder/utils/ai-agent-utils';
import type { Todo } from '@/domains/chat/types';
import { isDependencyOutputValue } from '@/domains/chat/utils/todo-parameter-utils';

/**
 * POST - Execute a single todo
 * Body: { initialInput: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ 'chat-id': string; 'todo-id': string }> }
) {
  try {
    const { 'chat-id': chatId, 'todo-id': todoId } = await params;
    const body = await request.json();
    const { initialInput } = body;

    if (!initialInput || typeof initialInput !== 'string') {
      return NextResponse.json(
        { success: false, error: 'initialInput is required' },
        { status: 400 }
      );
    }

    // Load chat to get the todo
    const chats = loadChats();
    const chat = chats.find(c => c.id === chatId);
    
    if (!chat) {
      return NextResponse.json(
        { success: false, error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Find the todo in the latest message that has todos
    const messagesWithTodos = chat.messages
      .filter(msg => msg.metadata?.todos && msg.metadata.todos.length > 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (messagesWithTodos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No todos found in chat' },
        { status: 404 }
      );
    }

    const todos = messagesWithTodos[0].metadata!.todos!;
    const todo = todos.find(t => t.id === todoId);

    if (!todo) {
      return NextResponse.json(
        { success: false, error: 'Todo not found' },
        { status: 404 }
      );
    }

    // Get base URL for agent API calls
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Load available agents
    const agentsResponse = await fetch(`${baseUrl}/api/ai-agents`);
    const agentsResult = await agentsResponse.json();
    const availableAgents = agentsResult.success ? agentsResult.data : [];

    const agent = availableAgents.find((a: any) => a.id === todo.agentId);
    if (!agent) {
      return NextResponse.json(
        { success: false, error: `Agent ${todo.agentId} not found` },
        { status: 404 }
      );
    }

    // Prepare request data with body/extra_body from todo input
    const requestData: any = {
      userPrompt: initialInput,
    };

    // Helper: replace dependency markers with the latest input (previous todo output)
    const hydrateDependencyValues = (data: any) => {
      if (!data || typeof data !== 'object') return data;
      const cloned = Array.isArray(data) ? [...data] : { ...data };
      Object.entries(cloned).forEach(([k, v]) => {
        if (isDependencyOutputValue(v)) {
          cloned[k] = initialInput;
        }
      });
      return cloned;
    };

    // If todo has input with body/extra_body, include them in the request and hydrate any dependency markers
    if (todo.input) {
      if (todo.input.body) {
        requestData.body = hydrateDependencyValues(todo.input.body);
      }
      if (todo.input.extra_body) {
        requestData.extra_body = hydrateDependencyValues(todo.input.extra_body);
      }
    }

    // Execute the todo
    const startTime = Date.now();
    const result = await processAiAgent(agent, requestData, baseUrl);
    const calculatedDuration = Date.now() - startTime;

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to execute todo',
        },
        { status: 500 }
      );
    }

    // Extract token usage, cost, duration, and response format from result
    const tokenUsage = result.data?.tokenUsage || null;
    const cost = tokenUsage?.pricing?.total_cost || null;
    const responseFormat = result.data?.format || agent.requiredOutputFormat || 'string';
    // Use timing.duration if available, otherwise use calculated duration
    const duration = result.data?.timing?.duration || calculatedDuration;
    const executedAt = new Date().toISOString();
    const output = result.data?.response || result.data;

    // Update todo with execution metadata
    const updatedTodo: Todo = {
      ...todo,
      status: 'completed' as const,
      completedAt: executedAt,
      output,
      tokenUsage,
      duration,
      cost,
      responseFormat,
      chainMetadata: {
        input: initialInput,
        executedAt,
        output,
      },
    };

    // Update todos in the chat message metadata
    const updatedTodos = todos.map(t => t.id === todoId ? updatedTodo : t);
    updateChatMessageTodos(chatId, updatedTodos);

    return NextResponse.json({
      success: true,
      data: {
        todo: updatedTodo,
        output,
        tokenUsage,
        duration,
        cost,
        responseFormat,
        agentId: agent.id,
        agentType: agent.agentType,
        requiredOutputFormat: agent.requiredOutputFormat || responseFormat,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/chat/[chat-id]/execute-todo/[todo-id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

