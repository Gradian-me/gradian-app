import { ulid } from 'ulid';
import type { GraphNodeData, GraphEdgeData } from '@/domains/graph-designer/types';
import type { DynamicQueryPatternDef } from '../types';

const DEFAULT_ALIAS = '';

/**
 * Find root nodes (no incoming edges), then order edges in BFS order from roots.
 * Returns patterns: one root entry (first root only), then one per edge in BFS order.
 * Edge name is taken from relationTypeId (API may use relation type id or code).
 */
export function graphToPatterns(
  nodes: GraphNodeData[],
  edges: GraphEdgeData[],
  options?: { edgeOptional?: boolean }
): DynamicQueryPatternDef[] {
  const edgeOptional = options?.edgeOptional ?? true;
  const nodeIds = new Set(nodes.map((n) => n.id));
  const targetIds = new Set(edges.map((e) => e.target));
  const roots = nodes.filter((n) => !targetIds.has(n.id));
  if (roots.length === 0 && nodes.length > 0) {
    // No root found (cycle or disconnected); pick first node as logical root
    roots.push(nodes[0]);
  }

  const patterns: DynamicQueryPatternDef[] = [];

  if (roots.length > 0) {
    const firstRoot = roots[0];
    patterns.push({
      from: { alias: DEFAULT_ALIAS, schemaId: firstRoot.schemaId },
    });
  }

  // BFS from roots to order edges
  const queue = roots.map((r) => r.id);
  const visited = new Set<string>(queue);
  const edgesBySource = new Map<string, GraphEdgeData[]>();
  for (const e of edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
    const list = edgesBySource.get(e.source) || [];
    list.push(e);
    edgesBySource.set(e.source, list);
  }

  const orderedEdges: GraphEdgeData[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const out = edgesBySource.get(nodeId) || [];
    for (const e of out) {
      orderedEdges.push(e);
      if (!visited.has(e.target)) {
        visited.add(e.target);
        queue.push(e.target);
      }
    }
  }

  // Add any edges not reached by BFS (disconnected components)
  for (const e of edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
    if (!orderedEdges.includes(e)) orderedEdges.push(e);
  }

  const sourceNodeMap = new Map(nodes.map((n) => [n.id, n]));
  const targetNodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (const edge of orderedEdges) {
    const sourceNode = sourceNodeMap.get(edge.source);
    const targetNode = targetNodeMap.get(edge.target);
    if (!sourceNode || !targetNode) continue;
    const optional = edge.optional ?? edgeOptional;
    patterns.push({
      from: { alias: DEFAULT_ALIAS, schemaId: sourceNode.schemaId },
      to: { alias: DEFAULT_ALIAS, schemaId: targetNode.schemaId },
      edge: edge.relationTypeId,
      optional,
    });
  }

  return patterns;
}

/** Minimal schema info for resolving node display names */
export interface SchemaDisplayInfo {
  id: string;
  singular_name?: string;
  plural_name?: string;
}

function getSchemaDisplayName(
  schemaId: string,
  schemas?: SchemaDisplayInfo[]
): string | undefined {
  if (!schemas?.length) return undefined;
  const s = schemas.find((x) => x.id === schemaId);
  return s ? (s.singular_name || s.plural_name || schemaId) : undefined;
}

/**
 * Convert API patterns back to graph nodes and edges for the designer.
 * One node per unique schemaId (node id = schemaId for stability). Edge ids are generated.
 * Pass schemas to set node titles from schema names (otherwise nodes show as "Untitled").
 */
export function patternsToGraph(
  patterns: DynamicQueryPatternDef[],
  schemas?: SchemaDisplayInfo[]
): {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
} {
  const schemaIds = new Set<string>();
  for (const p of patterns) {
    if (p.from?.schemaId) schemaIds.add(p.from.schemaId);
    if (p.to?.schemaId) schemaIds.add(p.to.schemaId);
  }

  const nodes: GraphNodeData[] = Array.from(schemaIds).map((schemaId) => ({
    id: schemaId,
    schemaId,
    title: getSchemaDisplayName(schemaId, schemas) ?? undefined,
    incomplete: true,
    parentId: null,
    payload: {},
  }));

  const nodeIdSet = new Set(nodes.map((n) => n.id));
  const edges: GraphEdgeData[] = [];

  for (const p of patterns) {
    if (!p.to || !p.edge) continue;
    const fromSchema = p.from?.schemaId;
    const toSchema = p.to.schemaId;
    if (!fromSchema || !toSchema || !nodeIdSet.has(fromSchema) || !nodeIdSet.has(toSchema)) continue;
    edges.push({
      id: ulid(),
      source: fromSchema,
      target: toSchema,
      sourceSchema: fromSchema,
      sourceId: fromSchema,
      targetSchema: toSchema,
      targetId: toSchema,
      relationTypeId: p.edge,
      optional: p.optional,
    });
  }

  return { nodes, edges };
}
