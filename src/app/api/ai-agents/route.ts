// AI Agents API Route
// Serves all AI agents from the JSON file

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// In-memory cache for agents
let cachedAgents: any[] | null = null;
let cachedSummaryAgents: any[] | null = null;
let cacheTimestamp: number = 0;
let summaryCacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load AI agents with caching
 */
async function loadAiAgents(useCache: boolean = true): Promise<any[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (useCache && cachedAgents !== null && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedAgents;
  }
  
  // Load fresh data
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
    let agents: any[] = [];
    
    // Ensure we return an array
    if (Array.isArray(parsed)) {
      agents = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
      // If it's an object, try to extract an array from it
      if (Array.isArray(parsed.data)) {
        agents = parsed.data;
      } else if (Object.keys(parsed).length > 0) {
        // If it's an object with agent IDs as keys, convert to array
        agents = Object.values(parsed);
      }
    }
    
    // Update cache with loaded data
    if (useCache) {
      cachedAgents = agents;
      cacheTimestamp = Date.now();
    }
    
    return agents;
  } catch (error) {
    console.error(`[API] Error parsing AI agents file at ${dataPath}:`, error);
    throw new Error(`Failed to parse AI agents file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get summary agents with caching
 */
function getSummaryAgents(agents: any[]): any[] {
  const now = Date.now();
  
  // Return cached summary if still valid
  if (cachedSummaryAgents !== null && (now - summaryCacheTimestamp) < CACHE_TTL) {
    return cachedSummaryAgents;
  }
  
  // Generate summary
  const summary = agents.map((agent: any) => ({
    id: agent.id,
    label: agent.label,
    icon: agent.icon,
    description: agent.description,
    agentType: agent.agentType || 'chat',
    renderComponents: Array.isArray(agent.renderComponents) ? agent.renderComponents : [],
  }));
  
  // Cache it
  cachedSummaryAgents = summary;
  summaryCacheTimestamp = now;
  
  return summary;
}

/**
 * Clear cache (useful after POST/PUT/DELETE operations)
 */
function clearCache() {
  cachedAgents = null;
  cachedSummaryAgents = null;
  cacheTimestamp = 0;
  summaryCacheTimestamp = 0;
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
    const summary = searchParams.get('summary') === 'true';

    // Load agents (with caching)
    const agents = await loadAiAgents(true);
    
    if (!agents || agents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'AI agents file not found or empty' },
        { status: 404 }
      );
    }

    // If multiple agent IDs requested, return only those agents in the order they appear in the original array
    if (agentIdsParam) {
      const agentIds = agentIdsParam
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
      const uniqueAgentIds = Array.from(new Set(agentIds));

      // Preserve the order from the original agents array, not the requested IDs order
      // Filter agents array to only include requested IDs, maintaining original array order
      let matchedAgents = agents.filter((agent: any) => uniqueAgentIds.includes(agent.id));

      // If summary mode, return only essential fields
      if (summary) {
        const allSummaryAgents = getSummaryAgents(agents);
        // Filter summary agents in the same order as original array
        matchedAgents = allSummaryAgents.filter((agent: any) => 
          uniqueAgentIds.includes(agent.id)
        );
      }

      return NextResponse.json({
        success: true,
        data: matchedAgents, // Now in original array order, not requested IDs order
        meta: {
          requestedIds: uniqueAgentIds,
          returnedCount: matchedAgents.length,
          summary,
        },
      }, {
        headers: {
          'Cache-Control': summary 
            ? 'public, s-maxage=300, stale-while-revalidate=600' 
            : 'public, s-maxage=60, stale-while-revalidate=120',
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

      // If summary mode, return only essential fields
      if (summary) {
        const allSummaryAgents = getSummaryAgents(agents);
        const summaryAgent = allSummaryAgents.find((a: any) => a.id === agentId);
        
        if (!summaryAgent) {
          return NextResponse.json(
            { success: false, error: `AI agent with ID "${agentId}" not found` },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          success: true,
          data: summaryAgent,
        }, {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: agent,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    }

      // If summary mode, return only essential fields for all agents (preserve order)
    if (summary) {
      const summaryAgents = getSummaryAgents(agents);
      // getSummaryAgents uses map() which preserves array order

      return NextResponse.json({
        success: true,
        data: summaryAgents, // Preserves original array order
        meta: {
          totalCount: summaryAgents.length,
          summary: true,
        },
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5 min cache, 10 min stale
        },
      });
    }

    // Return all agents in the exact order they appear in the JSON file (preserve array index order)
    // Agents are already in the correct order from the file, but we explicitly ensure no reordering
    return NextResponse.json({
      success: true,
      data: agents, // Already in correct order from JSON array
      meta: {
        totalCount: agents.length,
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
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

    // Clear cache after modification
    clearCache();

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

