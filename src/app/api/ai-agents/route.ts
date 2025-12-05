// AI Agents API Route
// Serves all AI agents from the JSON file

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Load AI agents (always fresh, no caching)
 */
async function loadAiAgents(): Promise<any[]> {
  const dataPath = path.join(process.cwd(), 'data', 'ai-agents.json');
  
  if (!fs.existsSync(dataPath)) {
    console.warn(`[API] AI agents file not found at: ${dataPath}`);
    return [];
  }
  
  try {
    const fileContents = fs.readFileSync(dataPath, 'utf8');
    
    // Check if file is empty or just whitespace
    if (!fileContents || fileContents.trim().length === 0) {
      console.warn(`[API] AI agents file is empty at: ${dataPath}`);
      return [];
    }
    
    const parsed = JSON.parse(fileContents);
    
    // Ensure we return an array
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    // If it's an object, try to extract an array from it
    if (typeof parsed === 'object' && parsed !== null) {
      if (Array.isArray(parsed.data)) {
        return parsed.data;
      }
      // If it's an object with agent IDs as keys, convert to array
      if (Object.keys(parsed).length > 0) {
        return Object.values(parsed);
      }
    }
    
    console.warn(`[API] AI agents file contains invalid data format at: ${dataPath}`);
    return [];
  } catch (error) {
    console.error(`[API] Error parsing AI agents file at ${dataPath}:`, error);
    throw new Error(`Failed to parse AI agents file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * GET - Get all AI agents or a specific agent by ID
 * Example: 
 * - GET /api/ai-agents - returns all agents
 * - GET /api/ai-agents?id=app-builder - returns only app-builder agent
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('id');
    const agentIdsParam = searchParams.get('agentIds');

    // Load agents (always fresh, no caching)
    const agents = await loadAiAgents();
    
    if (!agents || agents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'AI agents file not found or empty' },
        { status: 404 }
      );
    }

    // If multiple agent IDs requested, return only those agents
    if (agentIdsParam) {
      const agentIds = agentIdsParam
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
      const uniqueAgentIds = Array.from(new Set(agentIds));

      const matchedAgents = uniqueAgentIds
        .map((id) => agents.find((a: any) => a.id === id))
        .filter((agent): agent is any => Boolean(agent));

      return NextResponse.json({
        success: true,
        data: matchedAgents,
        meta: {
          requestedIds: uniqueAgentIds,
          returnedCount: matchedAgents.length,
        },
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // If single agent ID requested, return only that agent
    if (agentId) {
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
    }

    // Return all agents
    return NextResponse.json({
      success: true,
      data: agents,
      meta: {
        totalCount: agents.length,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[API] Error in GET /api/ai-agents:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch AI agents',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new AI agent or multiple agents
 * Example: 
 * - POST /api/ai-agents - creates a new agent (single object)
 * - POST /api/ai-agents - creates multiple agents (array of objects)
 */
export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();

    // Normalize to array: if single object, wrap it in an array
    const agentsToCreate = Array.isArray(requestData) ? requestData : [requestData];

    // Validate that we received valid agent objects
    if (!agentsToCreate || agentsToCreate.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: must be an agent object or an array of agent objects' },
        { status: 400 }
      );
    }

    // Validate each agent
    for (let i = 0; i < agentsToCreate.length; i++) {
      const agent = agentsToCreate[i];
      
      if (!agent || typeof agent !== 'object' || Array.isArray(agent)) {
        return NextResponse.json(
          { success: false, error: `Invalid agent at index ${i}: must be an object` },
          { status: 400 }
        );
      }

      if (!agent.id || typeof agent.id !== 'string') {
        return NextResponse.json(
          { success: false, error: `Invalid agent at index ${i}: missing or invalid "id" field` },
          { status: 400 }
        );
      }

      if (!agent.label || typeof agent.label !== 'string') {
        return NextResponse.json(
          { success: false, error: `Invalid agent at index ${i}: missing or invalid "label" field` },
          { status: 400 }
        );
      }
    }

    // Load agents
    const agents = await loadAiAgents();
    
    if (!agents || agents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'AI agents file not found or empty' },
        { status: 404 }
      );
    }

    // Check for duplicate IDs in the request
    const requestIds = agentsToCreate.map(a => a.id);
    const duplicateIds = requestIds.filter((id, index) => requestIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      return NextResponse.json(
        { success: false, error: `Duplicate agent IDs in request: ${duplicateIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if any agent with same ID already exists
    const existingAgents: string[] = [];
    const newAgents: any[] = [];
    
    for (const newAgent of agentsToCreate) {
      const existingAgent = agents.find((a: any) => a.id === newAgent.id);
      
      if (existingAgent) {
        existingAgents.push(newAgent.id);
      } else {
        newAgents.push(newAgent);
      }
    }

    if (existingAgents.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Agent(s) with ID(s) "${existingAgents.join(', ')}" already exist(s)` 
        },
        { status: 409 }
      );
    }

    // Add all new agents
    agents.push(...newAgents);

    // Write back to file
    const agentsFilePath = path.join(process.cwd(), 'data', 'ai-agents.json');
    fs.writeFileSync(agentsFilePath, JSON.stringify(agents, null, 2), 'utf8');

    // Return created agents
    return NextResponse.json({
      success: true,
      data: newAgents.length === 1 ? newAgents[0] : newAgents,
      message: `Successfully created ${newAgents.length} agent(s)`,
    }, { status: 201 });
  } catch (error) {
    console.error('[API] Error in POST /api/ai-agents:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create AI agent(s)',
      },
      { status: 500 }
    );
  }
}
