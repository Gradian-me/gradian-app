// Graph API Route
// Returns all data as nodes and relations as edges for graph visualization
// Query parameters: includedSchemaIds, excludedSchemaIds
// All nodes include schemaId property
// POST - Create a new graph
// PUT - Update an existing graph (via /api/graph/[graphId])

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { readAllData, writeAllData } from '@/gradian-ui/shared/domain/utils/data-storage.util';
import { readAllRelations, writeAllRelations } from '@/gradian-ui/shared/domain/utils/relations-storage.util';
import { handleDomainError } from '@/gradian-ui/shared/domain/errors/domain.errors';
import type { GraphNodeData, GraphEdgeData } from '@/domains/graph-designer/types';

// Route segment config to optimize performance
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GRAPHS_FILE = join(process.cwd(), 'data', 'graphs.json');
const DATA_DIR = join(process.cwd(), 'data');

/**
 * Ensure data directory and graphs file exist
 */
async function ensureGraphsFile(): Promise<void> {
  try {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
    if (!existsSync(GRAPHS_FILE)) {
      await writeFile(GRAPHS_FILE, JSON.stringify({}, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Error ensuring graphs file:', error);
  }
}

/**
 * Read all graphs from file
 */
async function readGraphs(): Promise<Record<string, any>> {
  try {
    await ensureGraphsFile();
    const fileContent = await readFile(GRAPHS_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await ensureGraphsFile();
      return {};
    }
    console.error('Error reading graphs:', error);
    return {};
  }
}

/**
 * Write graphs to file
 */
async function writeGraphs(graphs: Record<string, any>): Promise<void> {
  await ensureGraphsFile();
  await writeFile(GRAPHS_FILE, JSON.stringify(graphs, null, 2), 'utf-8');
}

/**
 * GET - Get all data as graph nodes and edges
 * Query parameters:
 * - includedSchemaIds: Comma-separated list of schema IDs to include (optional)
 *   - For nodes: only entities from these schemas are included
 *   - For edges: edges are included if EITHER sourceSchema OR targetSchema matches
 * - excludedSchemaIds: Comma-separated list of schema IDs to exclude (optional)
 * - graphType: Filter by graph type - 'nodes' to return only nodes, 'edges' to return only edges (optional)
 *   - If not provided, returns both nodes and edges
 * 
 * Returns: { success: true, data: { nodes: [], edges: [] }, message: string }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const includedSchemaIdsParam = searchParams.get('includedSchemaIds');
    const excludedSchemaIdsParam = searchParams.get('excludedSchemaIds');
    const graphTypeParam = searchParams.get('graphType');
    
    const includedSchemaIds = includedSchemaIdsParam 
      ? includedSchemaIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      : null;
    
    const excludedSchemaIds = excludedSchemaIdsParam
      ? excludedSchemaIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      : [];
    
    // Validate graphType parameter
    const graphType = graphTypeParam?.toLowerCase();
    const validGraphTypes = ['nodes', 'edges'];
    if (graphType && !validGraphTypes.includes(graphType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid graphType. Must be one of: ${validGraphTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Read all data
    const allData = readAllData();
    
    // Read all relations
    const allRelations = readAllRelations();

    // Build nodes array
    const nodes: any[] = [];
    
    // Iterate through all schemas in the data
    for (const [schemaId, entities] of Object.entries(allData)) {
      // Apply schema filtering
      if (includedSchemaIds && !includedSchemaIds.includes(schemaId)) {
        continue;
      }
      
      if (excludedSchemaIds.includes(schemaId)) {
        continue;
      }

      // Add each entity as a node with schemaId
      if (Array.isArray(entities)) {
        for (const entity of entities) {
          nodes.push({
            ...entity,
            schemaId: schemaId,
          });
        }
      }
    }

    // Build edges array
    const edges: any[] = [];
    
    for (const relation of allRelations) {
      // Check if source or target schema matches includedSchemaIds
      // If includedSchemaIds is provided, include edge if EITHER sourceSchema OR targetSchema is in the list
      const sourceMatches = !includedSchemaIds || includedSchemaIds.includes(relation.sourceSchema);
      const targetMatches = !includedSchemaIds || includedSchemaIds.includes(relation.targetSchema);
      const schemaMatches = sourceMatches || targetMatches;
      
      // Check if either schema is excluded
      const sourceExcluded = excludedSchemaIds.includes(relation.sourceSchema);
      const targetExcluded = excludedSchemaIds.includes(relation.targetSchema);
      const isExcluded = sourceExcluded || targetExcluded;
      
      // Include edge if schema matches (either source or target) and neither is excluded
      if (schemaMatches && !isExcluded) {
        edges.push({
          id: relation.id,
          sourceId: relation.sourceId,
          targetId: relation.targetId,
          sourceSchema: relation.sourceSchema,
          targetSchema: relation.targetSchema,
          relationTypeId: relation.relationTypeId,
          createdAt: relation.createdAt,
          updatedAt: relation.updatedAt,
        });
      }
    }

    // Filter response based on graphType
    const responseData: { nodes?: any[]; edges?: any[] } = {};
    let message = '';
    
    if (graphType === 'nodes') {
      responseData.nodes = nodes;
      message = `Retrieved ${nodes.length} nodes`;
    } else if (graphType === 'edges') {
      responseData.edges = edges;
      message = `Retrieved ${edges.length} edges`;
    } else {
      // Return both if graphType is not specified
      responseData.nodes = nodes;
      responseData.edges = edges;
      message = `Retrieved ${nodes.length} nodes and ${edges.length} edges`;
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message,
    });
  } catch (error) {
    const errorResponse = handleDomainError(error);
    return NextResponse.json(
      {
        success: false,
        error: errorResponse.error,
        code: errorResponse.code,
      },
      { status: errorResponse.statusCode }
    );
  }
}

/**
 * POST - Create a new graph
 * Body: { graphId: string, nodes: GraphNodeData[], edges: GraphEdgeData[] }
 * 
 * Saves:
 * - Full node data to all-data.json under "graph-nodes" schema
 * - Full edge data to all-data-relations.json
 * - Only IDs and titles to graphs.json
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { graphId, nodes, edges } = body;

    if (!graphId) {
      return NextResponse.json(
        {
          success: false,
          error: 'graphId is required',
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return NextResponse.json(
        {
          success: false,
          error: 'nodes and edges must be arrays',
        },
        { status: 400 }
      );
    }

    const graphs = await readGraphs();
    
    // Check if graph already exists
    if (graphs[graphId]) {
      return NextResponse.json(
        {
          success: false,
          error: `Graph with id "${graphId}" already exists. Use PUT to update.`,
        },
        { status: 409 }
      );
    }

    // Save full node data to all-data.json
    const allData = readAllData();
    const graphNodesSchema = 'graph-nodes';
    if (!allData[graphNodesSchema]) {
      allData[graphNodesSchema] = [];
    }
    // Add or update nodes
    nodes.forEach((node: GraphNodeData) => {
      const existingIndex = allData[graphNodesSchema].findIndex((n: any) => n.id === node.id);
      if (existingIndex >= 0) {
        allData[graphNodesSchema][existingIndex] = node;
      } else {
        allData[graphNodesSchema].push(node);
      }
    });
    writeAllData(allData);

    // Save full edge data to all-data-relations.json
    // Need to get entity IDs from node payloads
    const allRelations = readAllRelations();
    edges.forEach((edge: GraphEdgeData) => {
      // Find source and target nodes to get entity IDs from payload
      const sourceNode = nodes.find((n: GraphNodeData) => n.id === edge.source);
      const targetNode = nodes.find((n: GraphNodeData) => n.id === edge.target);
      
      // Get entity IDs from payload, fallback to node ID if not available
      const sourceEntityId = (sourceNode?.payload as any)?.id || sourceNode?.id || edge.sourceId;
      const targetEntityId = (targetNode?.payload as any)?.id || targetNode?.id || edge.targetId;
      
      const existingIndex = allRelations.findIndex((r: any) => r.id === edge.id);
      const relationData = {
        id: edge.id,
        sourceSchema: edge.sourceSchema,
        sourceId: sourceEntityId,
        targetSchema: edge.targetSchema,
        targetId: targetEntityId,
        relationTypeId: edge.relationTypeId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (existingIndex >= 0) {
        allRelations[existingIndex] = { ...allRelations[existingIndex], ...relationData, updatedAt: new Date().toISOString() };
      } else {
        allRelations.push(relationData);
      }
    });
    writeAllRelations(allRelations);

    // Save only IDs, titles, schemaId, nodeId (optional), and incomplete (if true) to graphs.json
    const newGraph = {
      graphId,
      nodes: nodes.map((node: GraphNodeData) => ({
        id: node.id,
        title: node.title || 'Untitled',
        schemaId: node.schemaId,
        ...(node.nodeId && { nodeId: node.nodeId }), // Only include nodeId if it exists
        ...(node.incomplete && { incomplete: true }), // Only include incomplete if it's true
      })),
      edges: edges.map((edge: GraphEdgeData) => ({
        id: edge.id,
        title: edge.id, // Edge title is just the ID
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    graphs[graphId] = newGraph;
    await writeGraphs(graphs);

    return NextResponse.json({
      success: true,
      data: newGraph,
      message: 'Graph created successfully',
    });
  } catch (error) {
    const errorResponse = handleDomainError(error);
    return NextResponse.json(
      {
        success: false,
        error: errorResponse.error,
        code: errorResponse.code,
      },
      { status: errorResponse.statusCode }
    );
  }
}

