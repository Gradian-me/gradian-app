import Dexie, { Table } from 'dexie';

import type { GraphRecord, GraphNodeData, GraphEdgeData } from '../types';

const DB_NAME = 'gradian-graph-designer';
const DB_VERSION = 2; // Increment version for schema change

// Stored graph format - only IDs, titles, schemaId, nodeId (optional), and incomplete (if true)
interface StoredGraphRecord {
  id: string;
  name?: string;
  layout: GraphRecord['layout'];
  createdAt: string;
  updatedAt: string;
  nodes: Array<{ id: string; title?: string; schemaId: string; nodeId?: string; incomplete?: boolean }>;
  edges: Array<{ id: string; title?: string }>;
}

class GraphDesignerDb extends Dexie {
  public graphs!: Table<StoredGraphRecord, string>;
  public graphNodes!: Table<GraphNodeData, string>;
  public graphEdges!: Table<GraphEdgeData, string>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      graphs: '&id, updatedAt',
      graphNodes: '&id',
      graphEdges: '&id',
    });
  }
}

let dbInstance: GraphDesignerDb | null = null;

function getDb(): GraphDesignerDb | null {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return null;
  }

  if (!dbInstance) {
    dbInstance = new GraphDesignerDb();
  }

  return dbInstance;
}

export async function saveGraphRecord(record: GraphRecord): Promise<void> {
  const db = getDb();
  if (!db) return;

  // Save full node data to graphNodes table
  // nodeId is the selected entity's ID, not the graph node's ID
  for (const node of record.nodes) {
    await db.graphNodes.put(node);
  }

  // Save full edge data to graphEdges table
  for (const edge of record.edges) {
    await db.graphEdges.put(edge);
  }

    // Save only IDs, titles, schemaId, and nodeId to graphs table
    const storedGraph: StoredGraphRecord = {
      id: record.id,
      name: record.name,
      layout: record.layout,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      nodes: record.nodes.map((node) => ({
        id: node.id,
        title: node.title || 'Untitled',
        schemaId: node.schemaId,
        ...(node.nodeId && { nodeId: node.nodeId }), // Only include nodeId if it exists
        ...(node.incomplete && { incomplete: true }), // Only include incomplete if it's true
      })),
      edges: record.edges.map((edge) => ({
        id: edge.id,
        title: edge.id, // Edge title is just the ID
      })),
    };

  await db.graphs.put(storedGraph);
}

export async function getGraphRecord(graphId: string): Promise<GraphRecord | null> {
  const db = getDb();
  if (!db) return null;

  const storedGraph = await db.graphs.get(graphId);
  if (!storedGraph) return null;

  // Retrieve full node data
  const nodes: GraphNodeData[] = [];
  for (const nodeRef of storedGraph.nodes) {
    const node = await db.graphNodes.get(nodeRef.id);
    if (node) {
      nodes.push(node);
    }
  }

  // Retrieve full edge data
  const edges: GraphEdgeData[] = [];
  for (const edgeRef of storedGraph.edges) {
    const edge = await db.graphEdges.get(edgeRef.id);
    if (edge) {
      edges.push(edge);
    }
  }

  return {
    id: storedGraph.id,
    name: storedGraph.name,
    layout: storedGraph.layout,
    createdAt: storedGraph.createdAt,
    updatedAt: storedGraph.updatedAt,
    nodes,
    edges,
  };
}


