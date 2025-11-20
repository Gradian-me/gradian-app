// AI Builder API Route
// Handles AI agent requests via AvalAI API

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { extractJson } from '@/gradian-ui/shared/utils/json-extractor';

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
    const body = await request.json();
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

    // Prepare messages for AvalAI API
    const messages = [
      {
        role: 'system' as const,
        content: agent.systemPrompt || ''
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

