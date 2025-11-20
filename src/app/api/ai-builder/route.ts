// AI Builder API Route
// Handles AI agent requests via AvalAI API

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { extractJson } from '@/gradian-ui/shared/utils/json-extractor';
import { preloadRoutes } from '@/gradian-ui/shared/utils/preload-routes';

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
 * POST - Process user prompt with AI agent
 * Body: { userPrompt: string, agentId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Check if request body exists
    let requestBody: string;
    try {
      requestBody = await request.text();
    } catch (error) {
      // Handle aborted requests or network errors
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        return NextResponse.json(
          { success: false, error: 'Request was cancelled' },
          { status: 499 } // Client Closed Request
        );
      }
      throw error;
    }
    
    if (!requestBody || requestBody.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Request body is empty' },
        { status: 400 }
      );
    }

    let body;
    try {
      body = JSON.parse(requestBody);
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { userPrompt, agentId } = body;

    if (!userPrompt || typeof userPrompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'userPrompt is required and must be a string' },
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

    // Find the agent (by ID or use first one)
    const agent = agentId 
      ? agents.find((a: any) => a.id === agentId)
      : agents[0];

    if (!agent) {
      return NextResponse.json(
        { success: false, error: `Agent with ID "${agentId}" not found` },
        { status: 404 }
      );
    }

    // Get API key from environment
    const apiKey = process.env.AVALAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'AVALAI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Get base URL for preload routes
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Preload routes if configured
    let preloadedContext = '';
    if (agent.preloadRoutes && Array.isArray(agent.preloadRoutes) && agent.preloadRoutes.length > 0) {
      try {
        preloadedContext = await preloadRoutes(agent.preloadRoutes, baseUrl);
      } catch (error) {
        console.error('Error preloading routes:', error);
        // Continue even if preload fails
      }
    }

    // Prepare system prompt with preloaded context
    const systemPrompt = (agent.systemPrompt || '') + preloadedContext;

    // Prepare messages for AvalAI API
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      {
        role: 'user' as const,
        content: userPrompt
      }
    ];

    // Call AvalAI API
    const response = await fetch('https://api.avalai.ir/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AvalAI API error:', errorText);
      return NextResponse.json(
        { success: false, error: `AI API request failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const aiResponseContent = data.choices?.[0]?.message?.content || '';

    if (!aiResponseContent) {
      return NextResponse.json(
        { success: false, error: 'No response content from AI' },
        { status: 500 }
      );
    }

    // Extract JSON if required output format is JSON
    let processedResponse = aiResponseContent;
    if (agent.requiredOutputFormat === 'json') {
      const extractedJson = extractJson(aiResponseContent);
      if (extractedJson) {
        processedResponse = extractedJson;
      } else {
        // If JSON extraction failed but format is required, return error
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to extract valid JSON from AI response',
            rawResponse: aiResponseContent
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        response: processedResponse,
        format: agent.requiredOutputFormat || 'string',
        agent: {
          id: agent.id,
          label: agent.label,
          description: agent.description,
          requiredOutputFormat: agent.requiredOutputFormat,
          nextAction: agent.nextAction
        }
      }
    });
  } catch (error) {
    // Handle aborted requests or JSON parsing errors gracefully
    if (error instanceof SyntaxError) {
      console.error('JSON parsing error in AI builder API:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request body. The request may have been cancelled.' 
        },
        { status: 400 }
      );
    }
    
    console.error('Error in AI builder API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

