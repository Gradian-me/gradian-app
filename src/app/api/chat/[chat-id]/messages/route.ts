// Chat Messages API Route
// Handles adding and retrieving messages for a chat

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getChatById, addMessageToChat, updateChat } from '@/domains/chat/utils/chat-storage.util';
import { requireChatOwnership } from '@/domains/chat/utils/auth-utils';
import { validateChatId, validateMessageContent, validateMessageRole, validateAgentType, validateRequestBodySize, truncateMessageContent, MAX_MESSAGE_LENGTH } from '@/domains/chat/utils/validation-utils';
import { processAiAgent } from '@/domains/ai-builder/utils/ai-agent-utils';
import type { AddMessageRequest } from '@/domains/chat/types';

const TITLE_GENERATOR_AGENT_ID = 'title-generator';
const MAX_GENERATED_TITLE_LENGTH = 80;
type AddMessagePayload = AddMessageRequest & { stream?: boolean };

function truncateStructuredAssistantContent(content: string, responseFormat?: string): string {
  if (typeof content !== 'string' || content.length <= MAX_MESSAGE_LENGTH) {
    return content;
  }

  const isGraphLike = responseFormat === 'graph';

  // Preserve valid graph JSON instead of appending a truncation suffix that breaks parsing.
  if (isGraphLike) {
    try {
      const parsed = JSON.parse(content);
      const hasGraphWrapper = parsed && typeof parsed === 'object' && parsed.graph && typeof parsed.graph === 'object';
      const graphRoot = hasGraphWrapper ? parsed.graph : parsed;
      const nodes = Array.isArray(graphRoot?.nodes) ? graphRoot.nodes : null;
      const edges = Array.isArray(graphRoot?.edges) ? graphRoot.edges : null;

      if (nodes && edges) {
        // First attempt: minify without dropping data.
        const minified = JSON.stringify(parsed);
        if (minified.length <= MAX_MESSAGE_LENGTH) {
          return minified;
        }

        // Second attempt: keep a valid, reduced graph payload under size limit.
        const reducedNodes: any[] = [];
        const reducedEdges: any[] = [];
        const nodeIds = new Set<string>();

        for (const node of nodes) {
          const nodeId = node?.id;
          if (typeof nodeId !== 'string' || !nodeId) continue;
          reducedNodes.push(node);
          nodeIds.add(nodeId);
          const linkedEdges = edges.filter((edge: any) => nodeIds.has(edge?.source) && nodeIds.has(edge?.target));
          reducedEdges.splice(0, reducedEdges.length, ...linkedEdges);

          const reducedGraph = {
            ...graphRoot,
            nodes: reducedNodes,
            edges: reducedEdges,
            truncated: true,
          };
          const reducedPayload = hasGraphWrapper ? { ...parsed, graph: reducedGraph } : reducedGraph;
          const serialized = JSON.stringify(reducedPayload);
          if (serialized.length > MAX_MESSAGE_LENGTH) {
            // Revert last node if we exceeded limit.
            reducedNodes.pop();
            nodeIds.delete(nodeId);
            const revertedEdges = edges.filter((edge: any) => nodeIds.has(edge?.source) && nodeIds.has(edge?.target));
            reducedEdges.splice(0, reducedEdges.length, ...revertedEdges);
            break;
          }
        }

        const finalGraph = {
          ...graphRoot,
          nodes: reducedNodes,
          edges: reducedEdges,
          truncated: true,
        };
        const finalPayload = hasGraphWrapper ? { ...parsed, graph: finalGraph } : finalGraph;
        const finalSerialized = JSON.stringify(finalPayload);
        if (finalSerialized.length <= MAX_MESSAGE_LENGTH) {
          return finalSerialized;
        }
      }
    } catch {
      // Fallback below
    }
  }

  // For other oversized assistant payloads keep existing behavior.
  return truncateMessageContent(content);
}

function normalizeGeneratedTitle(rawTitle: string): string {
  const singleLine = rawTitle.split('\n')[0] || '';
  const cleaned = singleLine
    .replace(/[`*_#]/g, '')
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= MAX_GENERATED_TITLE_LENGTH) {
    return cleaned;
  }

  const clipped = cleaned.slice(0, MAX_GENERATED_TITLE_LENGTH);
  const lastSpace = clipped.lastIndexOf(' ');
  return (lastSpace > 12 ? clipped.slice(0, lastSpace) : clipped).trim();
}

function loadAgentById(agentId: string): any | null {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'ai-agents.json');
    const resolvedPath = path.resolve(dataPath);
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!resolvedPath.startsWith(dataDir) || !fs.existsSync(resolvedPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(resolvedPath, 'utf8');
    const agents = JSON.parse(fileContents);
    if (!Array.isArray(agents)) return null;

    return agents.find((agent: any) => agent?.id === agentId) || null;
  } catch {
    return null;
  }
}

async function generateAiChatTitle(content: string, requestUrl: string): Promise<string | null> {
  const agent = loadAgentById(TITLE_GENERATOR_AGENT_ID);
  if (!agent) return null;

  const baseUrl = new URL(requestUrl).origin;
  const result = await processAiAgent(agent, { userPrompt: content }, baseUrl);
  if (!result.success) return null;

  const responseText =
    typeof result.data?.response === 'string'
      ? result.data.response
      : typeof result.data === 'string'
        ? result.data
        : '';
  if (!responseText) return null;

  const normalized = normalizeGeneratedTitle(responseText);
  return normalized.length >= 3 ? normalized : null;
}

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
    let body: AddMessagePayload;
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

    // Auto-truncate oversized assistant messages to avoid hard failures for large tool outputs.
    // User messages remain strictly validated without mutation.
    if (body.role === 'assistant' && typeof body.content === 'string') {
      body.content = truncateStructuredAssistantContent(
        body.content,
        body.metadata?.responseFormat
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
    const shouldGenerateAiTitle =
      chat?.title === 'New Chat' &&
      body.role === 'user' &&
      !chat.messages.some((message) => message.role === 'user');

    const message = addMessageToChat(chatId, body);

    // Enhance first user message title using title-generator.
    // Fallback remains the existing substring logic inside addMessageToChat.
    if (shouldGenerateAiTitle) {
      try {
        const aiTitle = await generateAiChatTitle(body.content, request.url);
        if (aiTitle) {
          updateChat(chatId, { title: aiTitle });
        }
      } catch (titleError) {
        console.warn('AI title generation failed, keeping fallback title:', titleError);
      }
    }
    const updatedChat = getChatById(chatId);

    const streamRequested = body.stream === true;
    const shouldStreamChatAssistantMessage =
      streamRequested &&
      body.role === 'assistant' &&
      body.agentType === 'chat' &&
      typeof message.content === 'string' &&
      message.content.length > 0;

    if (shouldStreamChatAssistantMessage) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(message.content));
          controller.close();
        },
      });

      return new Response(stream, {
        status: 201,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Response-Mode': 'stream',
          'X-Message-Id': message.id,
          'X-Chat-Title': updatedChat?.title || chat?.title || 'New Chat',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: message,
      meta: {
        chatTitle: updatedChat?.title || chat?.title || 'New Chat',
      },
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

