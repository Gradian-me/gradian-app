// AI Agents API Route - Dynamic Route for individual agents
// Serves a specific AI agent by ID from the JSON file

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Load AI agents (always fresh, no caching)
 */
async function loadAiAgents(): Promise<any[]> {
  const dataPath = path.join(process.cwd(), 'data', 'ai-agents.json');
  
  if (!fs.existsSync(dataPath)) {
    return [];
  }
  
  try {
    const fileContents = fs.readFileSync(dataPath, 'utf8');
    
    if (!fileContents || fileContents.trim().length === 0) {
      return [];
    }
    
    const parsed = JSON.parse(fileContents);
    
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    if (typeof parsed === 'object' && parsed !== null) {
      if (Array.isArray(parsed.data)) {
        return parsed.data;
      }
      if (Object.keys(parsed).length > 0) {
        return Object.values(parsed);
      }
    }
    
    return [];
  } catch (error) {
    console.error(`[API] Error parsing AI agents file at ${dataPath}:`, error);
    throw new Error(`Failed to parse AI agents file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * GET - Get a specific AI agent by ID
 * Example: GET /api/ai-agents/app-builder
 */
export async function GET(
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

    const agents = await loadAiAgents();
    const agent = agents.find((a: any) => a.id === agentId);

    if (!agent) {
      return NextResponse.json(
        { success: false, error: `AI agent with ID "${agentId}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: agent,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[API] Error in GET /api/ai-agents/[agent-id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch AI agent',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update an existing AI agent
 * Example: PUT /api/ai-agents/app-builder
 */
export async function PUT(
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

    const requestData = await request.json();

    // Validate request data
    if (!requestData || typeof requestData !== 'object' || Array.isArray(requestData)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: must be an agent object' },
        { status: 400 }
      );
    }

    // Ensure the ID in the body matches the URL parameter
    if (requestData.id && requestData.id !== agentId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID in body does not match URL parameter' },
        { status: 400 }
      );
    }

    // Load agents
    const agents = await loadAiAgents();
    
    if (!agents || agents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'AI agents file not found or empty' },
        { status: 404 }
      );
    }

    // Find the agent to update
    const agentIndex = agents.findIndex((a: any) => a.id === agentId);

    if (agentIndex === -1) {
      return NextResponse.json(
        { success: false, error: `AI agent with ID "${agentId}" not found` },
        { status: 404 }
      );
    }

    // Update the agent (preserve the ID)
    const updatedAgent = {
      ...requestData,
      id: agentId,
    };

    agents[agentIndex] = updatedAgent;

    // Write back to file
    const agentsFilePath = path.join(process.cwd(), 'data', 'ai-agents.json');
    fs.writeFileSync(agentsFilePath, JSON.stringify(agents, null, 2), 'utf8');

    return NextResponse.json({
      success: true,
      data: updatedAgent,
      message: `Successfully updated agent "${agentId}"`,
    });
  } catch (error) {
    console.error('[API] Error in PUT /api/ai-agents/[agent-id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update AI agent',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete an AI agent
 * Example: DELETE /api/ai-agents/app-builder
 */
export async function DELETE(
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

    // Load agents
    const agents = await loadAiAgents();
    
    if (!agents || agents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'AI agents file not found or empty' },
        { status: 404 }
      );
    }

    // Find the agent to delete
    const agentIndex = agents.findIndex((a: any) => a.id === agentId);

    if (agentIndex === -1) {
      return NextResponse.json(
        { success: false, error: `AI agent with ID "${agentId}" not found` },
        { status: 404 }
      );
    }

    // Remove the agent
    const deletedAgent = agents[agentIndex];
    agents.splice(agentIndex, 1);

    // Write back to file
    const agentsFilePath = path.join(process.cwd(), 'data', 'ai-agents.json');
    fs.writeFileSync(agentsFilePath, JSON.stringify(agents, null, 2), 'utf8');

    return NextResponse.json({
      success: true,
      data: deletedAgent,
      message: `Successfully deleted agent "${agentId}"`,
    });
  } catch (error) {
    console.error('[API] Error in DELETE /api/ai-agents/[agent-id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete AI agent',
      },
      { status: 500 }
    );
  }
}

