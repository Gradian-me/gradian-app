import type { GraphRecord, GraphNodeData, GraphEdgeData } from '../types';
import { validateEdgeData, findDuplicateEdges } from './edge-handling';

export interface GraphValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface GraphValidationResult {
  valid: boolean;
  errors: GraphValidationError[];
  warnings: GraphValidationError[];
}

/**
 * Validates a graph record before saving
 */
export function validateGraph(graph: GraphRecord | null): GraphValidationResult {
  const errors: GraphValidationError[] = [];
  const warnings: GraphValidationError[] = [];

  if (!graph) {
    errors.push({
      field: 'graph',
      message: 'Graph is null or undefined',
      severity: 'error',
    });
    return { valid: false, errors, warnings };
  }

  // Validate graph structure
  if (!graph.id || typeof graph.id !== 'string' || graph.id.trim() === '') {
    errors.push({
      field: 'graph.id',
      message: 'Graph must have a valid ID',
      severity: 'error',
    });
  }

  if (!graph.layout || typeof graph.layout !== 'string') {
    errors.push({
      field: 'graph.layout',
      message: 'Graph must have a valid layout',
      severity: 'error',
    });
  }

  // Validate nodes
  if (!Array.isArray(graph.nodes)) {
    errors.push({
      field: 'graph.nodes',
      message: 'Graph nodes must be an array',
      severity: 'error',
    });
    return { valid: false, errors, warnings };
  }

  const nodeIds = new Set<string>();
  const nodeMap = new Map<string, GraphNodeData>();

  for (let i = 0; i < graph.nodes.length; i++) {
    const node = graph.nodes[i];
    const prefix = `nodes[${i}]`;

    // Check required fields
    if (!node.id || typeof node.id !== 'string' || node.id.trim() === '') {
      errors.push({
        field: `${prefix}.id`,
        message: 'Node must have a valid ID',
        severity: 'error',
      });
    } else {
      // Check for duplicate IDs
      if (nodeIds.has(node.id)) {
        errors.push({
          field: `${prefix}.id`,
          message: `Duplicate node ID: ${node.id}`,
          severity: 'error',
        });
      } else {
        nodeIds.add(node.id);
        nodeMap.set(node.id, node);
      }
    }

    if (!node.schemaId || typeof node.schemaId !== 'string' || node.schemaId.trim() === '') {
      errors.push({
        field: `${prefix}.schemaId`,
        message: 'Node must have a valid schemaId',
        severity: 'error',
      });
    }

    // Error on incomplete nodes - they must be completed before saving
    if (node.incomplete === true) {
      errors.push({
        field: `${prefix}.incomplete`,
        message: `Node "${node.title || node.id}" is incomplete and must be completed before saving`,
        severity: 'error',
      });
    }

    // Validate parentId references
    if (node.parentId && node.parentId !== null) {
      if (!nodeMap.has(node.parentId) && !nodeIds.has(node.parentId)) {
        errors.push({
          field: `${prefix}.parentId`,
          message: `Node references non-existent parent: ${node.parentId}`,
          severity: 'error',
        });
      }
    }
  }

  // Validate edges
  if (!Array.isArray(graph.edges)) {
    errors.push({
      field: 'graph.edges',
      message: 'Graph edges must be an array',
      severity: 'error',
    });
    return { valid: false, errors, warnings };
  }

  const edgeIds = new Set<string>();

  // Check for duplicate edges (same source-target pairs)
  const duplicateEdgeGroups = findDuplicateEdges(graph.edges);
  if (duplicateEdgeGroups.length > 0) {
    for (const duplicateGroup of duplicateEdgeGroups) {
      const firstEdge = duplicateGroup[0];
      const edgeIndices = duplicateGroup.map((edge) => graph.edges.indexOf(edge));
      errors.push({
        field: `edges[${edgeIndices.join(',')}]`,
        message: `Duplicate edges found between nodes "${firstEdge.source}" and "${firstEdge.target}" (${duplicateGroup.length} edges)`,
        severity: 'error',
      });
    }
  }

  // Validate each edge individually
  for (let i = 0; i < graph.edges.length; i++) {
    const edge = graph.edges[i];
    const prefix = `edges[${i}]`;

    // Check required fields
    if (!edge.id || typeof edge.id !== 'string' || edge.id.trim() === '') {
      errors.push({
        field: `${prefix}.id`,
        message: 'Edge must have a valid ID',
        severity: 'error',
      });
    } else {
      // Check for duplicate IDs
      if (edgeIds.has(edge.id)) {
        errors.push({
          field: `${prefix}.id`,
          message: `Duplicate edge ID: ${edge.id}`,
          severity: 'error',
        });
      } else {
        edgeIds.add(edge.id);
      }
    }

    // Use centralized edge validation
    const validationResult = validateEdgeData(edge, graph.nodes);
    if (!validationResult.valid && validationResult.error) {
      errors.push({
        field: prefix,
        message: validationResult.error,
        severity: 'error',
      });
    }
  }

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings,
  };
}

/**
 * Formats validation errors and warnings into a user-friendly message
 */
export function formatValidationMessage(result: GraphValidationResult): string {
  if (result.valid && result.warnings.length === 0) {
    return 'Graph is valid';
  }

  const parts: string[] = [];

  if (result.errors.length > 0) {
    parts.push(`Errors (${result.errors.length}):`);
    result.errors.forEach((error, index) => {
      parts.push(`${index + 1}. ${error.field}: ${error.message}`);
    });
  }

  if (result.warnings.length > 0) {
    parts.push(`\nWarnings (${result.warnings.length}):`);
    result.warnings.forEach((warning, index) => {
      parts.push(`${index + 1}. ${warning.field}: ${warning.message}`);
    });
  }

  return parts.join('\n');
}

