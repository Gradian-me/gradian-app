/**
 * AI Prompt by ID API Route
 * Handles GET request for a single AI prompt by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { readAllPrompts } from '@/domains/ai-prompts/utils/prompts-storage.util';

/**
 * GET - Retrieve a single AI prompt by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Prompt ID is required' },
        { status: 400 }
      );
    }
    
    const prompts = readAllPrompts();
    const prompt = prompts.find(p => p.id === id);
    
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: prompt
    });
  } catch (error) {
    console.error('Error fetching AI prompt:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch AI prompt' 
      },
      { status: 500 }
    );
  }
}

