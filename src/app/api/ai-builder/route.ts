// AI Builder API Route
// Handles AI agent requests via LLM API (OpenAI, OpenRouter, AvalAI, etc.)

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { extractJson } from '@/gradian-ui/shared/utils/json-extractor';
import { preloadRoutes } from '@/gradian-ui/shared/utils/preload-routes';
import { loadApplicationVariables } from '@/gradian-ui/shared/utils/application-variables-loader';

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
 * Load AI models from JSON file
 */
function loadAiModels(): any[] {
  const dataPath = path.join(process.cwd(), 'data', 'ai-models.json');
  
  if (!fs.existsSync(dataPath)) {
    return [];
  }
  
  const fileContents = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(fileContents);
}

/**
 * Calculate pricing for token usage
 */
function calculatePricing(modelId: string, promptTokens: number, completionTokens: number): { 
  inputPricePer1M: number; 
  outputPricePer1M: number; 
  inputPrice: number; 
  outputPrice: number; 
  totalPrice: number 
} | null {
  const models = loadAiModels();
  const model = models.find((m: any) => m.id === modelId);
  
  if (!model || !model.pricing) {
    return null;
  }
  
  const inputPricePerMillion = model.pricing.input || 0;
  const outputPricePerMillion = model.pricing.output || 0;
  
  // Calculate prices (pricing is per 1 million tokens)
  const inputPrice = (promptTokens / 1_000_000) * inputPricePerMillion;
  const outputPrice = (completionTokens / 1_000_000) * outputPricePerMillion;
  const totalPrice = inputPrice + outputPrice;
  
  return {
    inputPricePer1M: inputPricePerMillion,
    outputPricePer1M: outputPricePerMillion,
    inputPrice,
    outputPrice,
    totalPrice
  };
}

/**
 * POST - Process user prompt with AI agent
 * Body: { userPrompt: string, agentId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body - handle errors gracefully
    let body: { userPrompt?: string; agentId?: string };
    try {
      body = await request.json();
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

    // Get API key from environment (supports LLM_API_KEY or AVALAI_API_KEY for backward compatibility)
    const apiKey = process.env.LLM_API_KEY || process.env.AVALAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'LLM_API_KEY is not configured' },
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

    // Prepare messages for LLM API
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

    // Get model from agent config or use default
    const model = agent.model || 'gpt-4o-mini';

    // Get LLM API URL from application variables
    const appVars = loadApplicationVariables();
    const llmApiUrl = appVars.AI_CONFIG?.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';

    // Call LLM API
    const response = await fetch(llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLM API error:', errorText);
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

    // Extract token usage information
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const totalTokens = data.usage?.total_tokens || 0;
    
    // Calculate pricing
    const pricing = calculatePricing(model, promptTokens, completionTokens);
    
    const tokenUsage = data.usage ? {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      pricing: pricing ? {
        input_price_per_1m: pricing.inputPricePer1M || 0,
        output_price_per_1m: pricing.outputPricePer1M || 0,
        input_cost: pricing.inputPrice,
        output_cost: pricing.outputPrice,
        total_cost: pricing.totalPrice,
        model_id: model
      } : null
    } : null;

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
        tokenUsage,
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

