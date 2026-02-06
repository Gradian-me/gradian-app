import type { GraphEdgeData, GraphNodeData } from '../types';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

/**
 * Edge validation result
 */
export interface EdgeValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Edge creation input
 */
export interface EdgeCreationInput {
  source: GraphNodeData;
  target: GraphNodeData;
  relationTypeId?: string;
}

/**
 * Creates a new edge with proper data consistency
 */
export function createEdgeData(
  input: EdgeCreationInput,
  edgeId: string,
): GraphEdgeData {
  return {
    id: edgeId,
    source: input.source.id,
    target: input.target.id,
    sourceSchema: input.source.schemaId,
    sourceId: input.source.id,
    targetSchema: input.target.schemaId,
    targetId: input.target.id,
    relationTypeId: input.relationTypeId ?? 'relation-default',
    optional: false, // New edges are required (solid); user can toggle to optional (dashed) via context menu
  };
}

/**
 * Validates if an edge can be created between two nodes
 */
export function validateEdgeCreation(
  source: GraphNodeData,
  target: GraphNodeData,
  existingEdges: GraphEdgeData[],
): EdgeValidationResult {
  loggingCustom(LogType.GRAPH_LOG, 'debug', `validateEdgeCreation: source=${source.id}, target=${target.id}, existingEdges=${existingEdges.length}`);
  
  // Check for self-loops
  if (source.id === target.id) {
    loggingCustom(LogType.GRAPH_LOG, 'warn', 'Validation failed: self-loop detected');
    return {
      valid: false,
      error: 'Cannot create an edge from a node to itself',
    };
  }

  // Check if source node exists and is valid
  if (!source.id || !source.schemaId) {
    loggingCustom(LogType.GRAPH_LOG, 'warn', `Validation failed: invalid source node - id=${source.id}, schemaId=${source.schemaId}`);
    return {
      valid: false,
      error: 'Source node is invalid or missing required data',
    };
  }

  // Check if target node exists and is valid
  if (!target.id || !target.schemaId) {
    loggingCustom(LogType.GRAPH_LOG, 'warn', `Validation failed: invalid target node - id=${target.id}, schemaId=${target.schemaId}`);
    return {
      valid: false,
      error: 'Target node is invalid or missing required data',
    };
  }

  // Check for duplicate edges (same source and target)
  const duplicateEdge = existingEdges.find(
    (edge) => edge.source === source.id && edge.target === target.id,
  );

  if (duplicateEdge) {
    loggingCustom(LogType.GRAPH_LOG, 'warn', `Validation failed: duplicate edge exists - edgeId=${duplicateEdge.id}`);
    return {
      valid: false,
      error: 'An edge already exists between these two nodes',
    };
  }

  loggingCustom(LogType.GRAPH_LOG, 'debug', 'Edge validation passed');
  return { valid: true };
}

/**
 * Checks if an edge exists between two nodes
 */
export function edgeExists(
  sourceId: string,
  targetId: string,
  edges: GraphEdgeData[],
): boolean {
  return edges.some((edge) => edge.source === sourceId && edge.target === targetId);
}

/**
 * Finds all edges connected to a node (both incoming and outgoing)
 */
export function getConnectedEdges(nodeId: string, edges: GraphEdgeData[]): GraphEdgeData[] {
  return edges.filter((edge) => edge.source === nodeId || edge.target === nodeId);
}

/**
 * Finds all outgoing edges from a node
 */
export function getOutgoingEdges(nodeId: string, edges: GraphEdgeData[]): GraphEdgeData[] {
  return edges.filter((edge) => edge.source === nodeId);
}

/**
 * Finds all incoming edges to a node
 */
export function getIncomingEdges(nodeId: string, edges: GraphEdgeData[]): GraphEdgeData[] {
  return edges.filter((edge) => edge.target === nodeId);
}

/**
 * Validates edge data consistency
 */
export function validateEdgeData(
  edge: GraphEdgeData,
  nodes: GraphNodeData[],
): EdgeValidationResult {
  // Check required fields
  if (!edge.id || typeof edge.id !== 'string' || edge.id.trim() === '') {
    return {
      valid: false,
      error: 'Edge must have a valid ID',
    };
  }

  if (!edge.source || typeof edge.source !== 'string' || edge.source.trim() === '') {
    return {
      valid: false,
      error: 'Edge must have a valid source node ID',
    };
  }

  if (!edge.target || typeof edge.target !== 'string' || edge.target.trim() === '') {
    return {
      valid: false,
      error: 'Edge must have a valid target node ID',
    };
  }

  // Check source and target are different
  if (edge.source === edge.target) {
    return {
      valid: false,
      error: 'Edge cannot connect a node to itself',
    };
  }

  // Check source node exists
  const sourceNode = nodes.find((n) => n.id === edge.source);
  if (!sourceNode) {
    return {
      valid: false,
      error: `Edge references non-existent source node: ${edge.source}`,
    };
  }

  // Check target node exists
  const targetNode = nodes.find((n) => n.id === edge.target);
  if (!targetNode) {
    return {
      valid: false,
      error: `Edge references non-existent target node: ${edge.target}`,
    };
  }

  // Check schema consistency
  if (!edge.sourceSchema || edge.sourceSchema !== sourceNode.schemaId) {
    return {
      valid: false,
      error: `Edge sourceSchema "${edge.sourceSchema}" does not match source node's schemaId "${sourceNode.schemaId}"`,
    };
  }

  if (!edge.targetSchema || edge.targetSchema !== targetNode.schemaId) {
    return {
      valid: false,
      error: `Edge targetSchema "${edge.targetSchema}" does not match target node's schemaId "${targetNode.schemaId}"`,
    };
  }

  // Check ID consistency
  if (edge.sourceId !== edge.source) {
    return {
      valid: false,
      error: `Edge sourceId "${edge.sourceId}" does not match source node ID "${edge.source}"`,
    };
  }

  if (edge.targetId !== edge.target) {
    return {
      valid: false,
      error: `Edge targetId "${edge.targetId}" does not match target node ID "${edge.target}"`,
    };
  }

  // Check relation type
  if (!edge.relationTypeId || typeof edge.relationTypeId !== 'string' || edge.relationTypeId.trim() === '') {
    return {
      valid: false,
      error: 'Edge must have a valid relationTypeId',
    };
  }

  return { valid: true };
}

/**
 * Finds duplicate edges in an array
 */
export function findDuplicateEdges(edges: GraphEdgeData[]): GraphEdgeData[][] {
  const edgeMap = new Map<string, GraphEdgeData[]>();
  
  for (const edge of edges) {
    const key = `${edge.source}:${edge.target}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, []);
    }
    edgeMap.get(key)!.push(edge);
  }

  // Return only groups with duplicates
  return Array.from(edgeMap.values()).filter((group) => group.length > 1);
}

/**
 * Normalizes edge data to ensure consistency
 */
export function normalizeEdgeData(edge: GraphEdgeData): GraphEdgeData {
  return {
    ...edge,
    // Ensure sourceId matches source
    sourceId: edge.source,
    // Ensure targetId matches target
    targetId: edge.target,
  };
}

