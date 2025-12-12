// AI Builder API Route - Unified Route for All Agent Types
// Handles AI agent requests via route-based agent-id
// Supports: chat, voice-transcription, image-generation

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { processAiAgent, AgentRequestData } from '@/domains/ai-builder/utils/ai-agent-utils';

/**
 * Load AI agents from JSON file
 */
function loadAiAgents(): any[] {
  const dataPath = path.join(process.cwd(), 'data', 'ai-agents.json');

  if (!fs.existsSync(dataPath)) {
    return [];
  }

  const fileContents = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(fileContents);
}

/**
 * POST - Process AI agent request
 * Route: POST /api/ai-builder/[agent-id]
 * Body: { userPrompt?, formValues?, previousAiResponse?, previousUserPrompt?, annotations?, file?, language?, prompt?, size?, responseFormat? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ 'agent-id': string }> }
) {
  try {
    const { 'agent-id': agentId } = await params;

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Load AI agents
    const agents = loadAiAgents();

    if (agents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No AI agents configured' },
        { status: 500 }
      );
    }

    // Find the agent by ID
    const agent = agents.find((a: any) => a.id === agentId);

    if (!agent) {
      return NextResponse.json(
        { success: false, error: `Agent with ID "${agentId}" not found` },
        { status: 404 }
      );
    }

    // Parse request body - handle errors gracefully
    let body: any = {};
    try {
      // Check content type - could be JSON or FormData
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('multipart/form-data')) {
        // Handle FormData (for voice transcription)
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const language = formData.get('language') as string | null;
        
        // Convert FormData to our request format
        body = {
          file: file || undefined,
          language: language || undefined,
        };
        
        // Also try to get JSON data if present
        const jsonData = formData.get('jsonData');
        if (jsonData && typeof jsonData === 'string') {
          try {
            const parsed = JSON.parse(jsonData);
            body = { ...body, ...parsed };
          } catch {
            // Ignore JSON parsing errors for form data
          }
        }
      } else {
        // Handle JSON body
        body = await request.json();
      }
    } catch (error) {
      // Handle aborted requests, empty body, or JSON parsing errors
      if (error instanceof SyntaxError || (error instanceof Error && error.message.includes('JSON'))) {
        return NextResponse.json(
          { success: false, error: 'Invalid JSON in request body or request was cancelled' },
          { status: 400 }
        );
      }
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        return NextResponse.json(
          { success: false, error: 'Request was cancelled' },
          { status: 499 } // Client Closed Request
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to read request body' },
        { status: 400 }
      );
    }

    // Prepare request data
    const requestData: AgentRequestData = {
      userPrompt: body.userPrompt,
      formValues: body.formValues,
      previousAiResponse: body.previousAiResponse,
      previousUserPrompt: body.previousUserPrompt,
      annotations: body.annotations,
      file: body.file,
      language: body.language,
      prompt: body.prompt,
      size: body.size,
      responseFormat: body.responseFormat,
      body: body.body, // Parameters with sectionId: "body"
      extra_body: body.extra_body, // Parameters with sectionId: "extra"
    };

    // Get base URL for preload routes (only needed for chat agents)
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Process the request via the generic router
    const result = await processAiAgent(agent, requestData, baseUrl);

    // Return appropriate HTTP status based on result
    if (!result.success) {
      // Handle validation errors
      if (result.validationErrors && result.validationErrors.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Validation failed',
            validationErrors: result.validationErrors,
          },
          { status: 400 }
        );
      }

      // Handle timeout errors
      if (result.error && result.error.includes('timeout')) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
          },
          { status: 504 }
        );
      }

      // Handle other errors
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Internal server error',
        },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    // Handle aborted requests or JSON parsing errors gracefully
    if (error instanceof SyntaxError) {
      console.error('JSON parsing error in AI builder API:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. The request may have been cancelled.',
        },
        { status: 400 }
      );
    }

    console.error('Error in AI builder API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

