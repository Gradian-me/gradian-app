// AI Agents API Route
// Serves AI agent configurations

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
 * GET - Get all AI agents
 */
export async function GET(request: NextRequest) {
  try {
    const agents = loadAiAgents();
    
    return NextResponse.json({
      success: true,
      data: agents
    });
  } catch (error) {
    console.error('Error loading AI agents:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to load AI agents' 
      },
      { status: 500 }
    );
  }
}

