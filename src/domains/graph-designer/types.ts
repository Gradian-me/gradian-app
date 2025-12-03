import type { FormSchema } from '@/gradian-ui/schema-manager/types';

export type GraphLayout = 'dagre' | 'dagre-lr' | 'cose' | 'breadthfirst' | 'bpmn';

export interface GraphNodeData {
  id: string;
  schemaId: string;
  nodeId?: string; // The selected entity's ID from the popup picker (optional, only set when entity is selected)
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


