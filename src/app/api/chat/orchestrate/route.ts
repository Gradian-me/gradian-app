// Chat Orchestrate API Route
// Handles orchestrator requests for agent chaining

import { NextRequest, NextResponse } from 'next/server';
import { processOrchestratorRequest } from '@/domains/ai-builder/utils/ai-orchestrator-utils';
import type { AgentRequestData } from '@/domains/ai-builder/utils/ai-agent-utils';

/**
 * POST - Orchestrator endpoint
 * Analyzes complexity, generates todos if needed, executes agent chain
 * Body: { userPrompt, chatId?, agentId?, formValues?, ... }
 */
export async function POST(request: NextRequest) {
  try {
    // Check if request has a body
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { success: false, error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    // Parse request body with error handling
    let body: any;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'Request body is required' },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON in request body',
          details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
        },
        { status: 400 }
      );
    }

    const { userPrompt, chatId, agentId, ...rest } = body;

    if (!userPrompt) {
      return NextResponse.json(
        { success: false, error: 'userPrompt is required' },
        { status: 400 }
      );
    }

    // Prepare request data for orchestrator
    const requestData: AgentRequestData = {
      userPrompt,
      formValues: rest.formValues,
      previousAiResponse: rest.previousAiResponse,
      previousUserPrompt: rest.previousUserPrompt,
      annotations: rest.annotations,
      file: rest.file,
      language: rest.language,
      prompt: rest.prompt,
      size: rest.size,
      responseFormat: rest.responseFormat,
      body: rest.body,
      extra_body: rest.extra_body,
    };

    // Get base URL for preload routes
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Process orchestrator request
    // Note: We'll need to pass the agent config if agentId is provided
    // For now, we'll handle this in the orchestrator utils
    const result = await processOrchestratorRequest(
      agentId || 'orchestrator', // Default to orchestrator agent
      requestData,
      baseUrl,
      chatId
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Orchestration failed',
          validationErrors: result.validationErrors,
        },
        { status: result.error?.includes('timeout') ? 504 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in POST /api/chat/orchestrate:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

