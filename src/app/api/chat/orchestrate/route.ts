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
    const body = await request.json();
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

