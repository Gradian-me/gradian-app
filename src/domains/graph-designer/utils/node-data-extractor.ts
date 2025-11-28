import type { GraphNodeData } from '../types';

/**
 * Schema information for node type resolution
 */
export interface SchemaInfo {
  id: string;
  singular_name?: string;
  plural_name?: string;
}

/**
 * Extracts GraphNodeData from a Cytoscape element
 */
export function extractNodeDataFromElement(element: any): GraphNodeData {
  const data = element.data();
  return {
    id: data.id,
    schemaId: data.schemaId,
    nodeId: data.nodeId || data.id, // Use nodeId from data, fallback to id
    title: data.title,
    incomplete: !!data.incomplete,
    // Cytoscape uses 'parent' for compound nodes
    parentId: data.parent ?? null,
    payload: data.payload ?? {},
  };
}

/**
 * Gets the display type name for a node based on its schema
 */
export function getNodeType(
  nodeData: { schemaId?: string },
  schemas: SchemaInfo[],
): string {
  if (nodeData.schemaId === 'parent') {
    return 'Parent';
  }
  const schema = schemas.find((s) => s.id === nodeData.schemaId);
  return schema?.singular_name || schema?.plural_name || nodeData.schemaId || 'Unknown';
}

/**
 * Converts GraphNodeData to Cytoscape element data format
 */
export function nodeDataToCytoscapeData(
  node: GraphNodeData,
  nodeType: string,
): any {
  return {
    id: node.id,
    title: node.title ?? 'Untitled',
    schemaId: node.schemaId,
    nodeId: node.nodeId || node.id, // Store nodeId in Cytoscape data
    type: nodeType,
    incomplete: node.incomplete ? 1 : 0,
    // Cytoscape uses 'parent' for compound nodes
    parent: node.parentId ?? undefined,
    payload: node.payload ?? {},
  };
}

/**
 * Calculates the incomplete status value for a node
 * A node is complete if: it has nodeId (linked) OR incomplete is explicitly false
 */
export function getIncompleteValue(node: GraphNodeData): number {
  const isComplete = node.nodeId ? true : node.incomplete === false;
  return isComplete ? 0 : 1;
}

