/**
 * AI Prompts API Route
 * Handles GET and POST requests for AI prompt history
 */

import { NextRequest, NextResponse } from 'next/server';
import { readAllPrompts, createPrompt, filterPrompts } from '@/domains/ai-prompts/utils/prompts-storage.util';
import type { CreateAiPromptRequest, AiPromptFilters } from '@/domains/ai-prompts/types';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';

/**
 * GET - Retrieve AI prompts with optional filters
 * Query params: username, aiAgent, startDate, endDate, search
 */
export async function GET(request: NextRequest) {
  // Check authentication if REQUIRE_LOGIN is true
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return 401 if not authenticated
  }
  
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const filters: AiPromptFilters = {
      username: searchParams.get('username') || undefined,
      aiAgent: searchParams.get('aiAgent') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      search: searchParams.get('search') || undefined,
    };
    
    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof AiPromptFilters] === undefined) {
        delete filters[key as keyof AiPromptFilters];
      }
    });
    
    const prompts = Object.keys(filters).length > 0
      ? filterPrompts(filters)
      : readAllPrompts();
    
    return NextResponse.json({
      success: true,
      data: prompts,
      count: prompts.length
    });
  } catch (error) {
    console.error('Error fetching AI prompts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch AI prompts' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new AI prompt record
 * Body: CreateAiPromptRequest
 */
export async function POST(request: NextRequest) {
  // Check authentication if REQUIRE_LOGIN is true
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Return 401 if not authenticated
  }
  
  try {
    const body: CreateAiPromptRequest = await request.json();
    
    // Validate required fields
    if (!body.username || !body.aiAgent || !body.userPrompt || body.agentResponse === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: username, aiAgent, userPrompt, agentResponse' },
        { status: 400 }
      );
    }
    
    // Validate numeric fields
    if (
      typeof body.inputTokens !== 'number' ||
      typeof body.inputPrice !== 'number' ||
      typeof body.outputTokens !== 'number' ||
      typeof body.outputPrice !== 'number' ||
      typeof body.totalTokens !== 'number' ||
      typeof body.totalPrice !== 'number'
    ) {
      return NextResponse.json(
        { success: false, error: 'Token and price fields must be numbers' },
        { status: 400 }
      );
    }

    // Validate optional timing fields if provided
    if (body.responseTime !== undefined && typeof body.responseTime !== 'number') {
      return NextResponse.json(
        { success: false, error: 'responseTime must be a number' },
        { status: 400 }
      );
    }

    if (body.duration !== undefined && typeof body.duration !== 'number') {
      return NextResponse.json(
        { success: false, error: 'duration must be a number' },
        { status: 400 }
      );
    }
    
    const prompt = createPrompt(body);
    
    return NextResponse.json({
      success: true,
      data: prompt
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating AI prompt:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create AI prompt' 
      },
      { status: 500 }
    );
  }
}

