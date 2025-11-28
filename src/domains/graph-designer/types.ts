import type { FormSchema } from '@/gradian-ui/schema-manager/types';

export type GraphLayout = 'dagre' | 'dagre-lr' | 'cose' | 'breadthfirst';

export interface GraphNodeData {
  id: string;
  schemaId: string;
  title?: string;
  incomplete: boolean;
  parentId?: string | null;
  payload?: Record<string, unknown>;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  sourceSchema: string;
  sourceId: string;
  targetSchema: string;
  targetId: string;
  relationTypeId: string;
}

export interface GraphRecord {
  id: string;
  name?: string;
  layout: GraphLayout;
  createdAt: string;
  updatedAt: string;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}

export interface SchemaSummary extends Pick<FormSchema, 'id' | 'name' | 'plural_name' | 'isSystemSchema'> {}


