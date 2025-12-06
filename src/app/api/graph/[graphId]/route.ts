// Graph API Route - Update Graph by ID
// PUT - Update an existing graph

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { handleDomainError } from '@/gradian-ui/shared/domain/errors/domain.errors';
import { readAllData, writeAllData } from '@/gradian-ui/shared/domain/utils/data-storage.util';
import { readAllRelations, writeAllRelations } from '@/gradian-ui/shared/domain/utils/relations-storage.util';
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
 * PUT - Update an existing graph
 * Body: { graphId: string, nodes: [], edges: [] }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ graphId: string }> }
) {
  try {
    const { graphId } = await params;
    const body = await request.json();
    const { graphId: bodyGraphId, nodes, edges } = body;

    // Validate graphId matches
    if (bodyGraphId && bodyGraphId !== graphId) {
      return NextResponse.json(
        {
          success: false,
          error: 'graphId in body must match graphId in URL',
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

    // Validate that all edges reference existing nodes
    const nodeIds = new Set(nodes.map((n: GraphNodeData) => n.id));
    const missingNodes: Array<{ edgeIndex: number; nodeId: string; schema: string; type: 'source' | 'target' }> = [];
    
    edges.forEach((edge: GraphEdgeData, index: number) => {
      if (!nodeIds.has(edge.source)) {
        missingNodes.push({
          edgeIndex: index,
          nodeId: edge.source,
          schema: edge.sourceSchema || 'unknown',
          type: 'source',
        });
      }
      if (!nodeIds.has(edge.target)) {
        missingNodes.push({
          edgeIndex: index,
          nodeId: edge.target,
          schema: edge.targetSchema || 'unknown',
          type: 'target',
        });
      }
    });

    if (missingNodes.length > 0) {
      const errorDetails = missingNodes.map(m => 
        `Edge at index ${m.edgeIndex}: ${m.type} node with id '${m.nodeId}' does not exist in schema '${m.schema}'`
      ).join('; ');
      
      return NextResponse.json(
        {
          success: false,
          error: `Cannot create edges: The following nodes do not exist and were not created in this request: ${missingNodes.map(m => `- Node ${m.nodeId} in schema '${m.schema}'`).join(' ')} Details: ${errorDetails}. Please ensure all referenced nodes exist in the database or are included in the 'nodes' array of this request.`,
        },
        { status: 400 }
      );
    }

    const graphs = await readGraphs();
    
    // Check if graph exists
    if (!graphs[graphId]) {
      return NextResponse.json(
        {
          success: false,
          error: `Graph with id "${graphId}" not found. Use POST to create a new graph.`,
        },
        { status: 404 }
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

    // Update graph - only save IDs, titles, schemaId, nodeId (optional), and incomplete (if true)
    const existingGraph = graphs[graphId];
    const updatedGraph = {
      ...existingGraph,
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
      updatedAt: new Date().toISOString(),
    };

    graphs[graphId] = updatedGraph;
    await writeGraphs(graphs);

    return NextResponse.json({
      success: true,
      data: updatedGraph,
      message: 'Graph updated successfully',
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

