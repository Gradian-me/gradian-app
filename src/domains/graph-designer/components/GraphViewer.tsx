'use client';

import React, { useRef, useState, useMemo } from 'react';
import { GraphCanvas, GraphCanvasHandle } from './GraphCanvas';
import { GraphToolbar } from './GraphToolbar';
import type { GraphLayout, GraphNodeData, GraphEdgeData, GraphRecord } from '../types';
import { exportGraphAsPng } from '../utils/graph-export';

export interface NodeType {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

export interface RelationType {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

export interface Schema {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

export interface GraphViewerProps {
  /**
   * Graph data - can be either {nodes, edges} or full GraphRecord
   */
  data: { 
    nodes: GraphNodeData[]; 
    edges: GraphEdgeData[];
    nodeTypes?: NodeType[];
    relationTypes?: RelationType[];
    schemas?: Schema[];
  } | GraphRecord;
  /**
   * Initial layout (optional, defaults to 'dagre-lr' or from data.layout if GraphRecord)
   */
  layout?: GraphLayout;
  /**
   * Height of the viewer (optional, defaults to '600px')
   */
  height?: string;
  /**
   * Allow node selection/hover (defaults to true)
   */
  allowSelection?: boolean;
  /**
   * Callback when a node is clicked (optional)
   */
  onNodeClick?: (node: GraphNodeData) => void;
}

/**
 * Standalone graph viewer component for displaying graphs in read-only mode
 * Supports both {nodes, edges} format and full GraphRecord format
 */
export function GraphViewer({
  data,
  layout: initialLayout,
  height = '600px',
  allowSelection = true,
  onNodeClick,
}: GraphViewerProps) {
  const canvasHandleRef = useRef<GraphCanvasHandle | null>(null);

  // Extract nodes, edges, layout, nodeTypes, relationTypes, and schemas from data
  const { nodes, edges, layout: dataLayout, nodeTypes, relationTypes, schemas } = useMemo(() => {
    // Check if it's a full GraphRecord (has id, createdAt, etc.)
    if ('id' in data && 'createdAt' in data) {
      const record = data as GraphRecord;
      return {
        nodes: record.nodes,
        edges: record.edges,
        layout: record.layout,
        nodeTypes: undefined,
        relationTypes: undefined,
        schemas: undefined,
      };
    }
    // Otherwise it's {nodes, edges, nodeTypes?, relationTypes?, schemas?}
    const graphData = data as { 
      nodes: GraphNodeData[]; 
      edges: GraphEdgeData[];
      nodeTypes?: NodeType[];
      relationTypes?: RelationType[];
      schemas?: Schema[];
    };
    return {
      nodes: graphData.nodes,
      edges: graphData.edges,
      layout: undefined,
      nodeTypes: graphData.nodeTypes,
      relationTypes: graphData.relationTypes,
      schemas: graphData.schemas,
    };
  }, [data]);

  // Determine layout: initialLayout prop > data.layout > 'dagre-lr' default
  const [layout, setLayout] = useState<GraphLayout>(
    initialLayout ?? dataLayout ?? 'dagre-lr'
  );

  // Track visibility of node types, relation types, and schemas
  const [hiddenNodeTypeIds, setHiddenNodeTypeIds] = useState<Set<string>>(new Set());
  const [hiddenRelationTypeIds, setHiddenRelationTypeIds] = useState<Set<string>>(new Set());
  const [hiddenSchemaIds, setHiddenSchemaIds] = useState<Set<string>>(new Set());

  const handleExportPng = () => {
    // Create a minimal graph record for export
    const graphRecord: GraphRecord = {
      id: 'viewer',
      name: 'Graph Viewer',
      layout,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes,
      edges,
    };
    exportGraphAsPng(canvasHandleRef.current, graphRecord);
  };

  const handleRefreshLayout = () => {
    if (canvasHandleRef.current) {
      canvasHandleRef.current.runLayout(layout);
    }
  };

  // Handle node click for selection (read-only, no editing)
  const handleNodeClick = allowSelection || onNodeClick
    ? (node: GraphNodeData, isMultiSelect: boolean) => {
        // Call the onNodeClick callback if provided
        if (onNodeClick) {
          onNodeClick(node);
        }
        // Selection is handled by GraphCanvas internally
      }
    : undefined;

  return (
    <div
      className="flex flex-col overflow-hidden rounded-lg border border-gray-400 bg-linear-to-b from-background via-muted/40 to-background dark:border-gray-700"
      style={{ height }}
    >
      <GraphToolbar
        layout={layout}
        onLayoutChange={setLayout}
        sidebarVisible={false}
        onToggleSidebar={() => {}}
        canUndo={false}
        canRedo={false}
        onUndo={() => {}}
        onRedo={() => {}}
        multiSelectEnabled={false}
        onToggleMultiSelect={() => {}}
        edgeModeEnabled={false}
        onToggleEdgeMode={() => {}}
        canGroupSelection={false}
        onGroupSelection={() => {}}
        onExportPng={handleExportPng}
        onSave={() => {}}
        onReset={() => {}}
        onRefreshLayout={handleRefreshLayout}
        viewMode={true}
        nodeTypes={nodeTypes}
        relationTypes={relationTypes}
        schemas={schemas}
        hiddenNodeTypeIds={hiddenNodeTypeIds}
        hiddenRelationTypeIds={hiddenRelationTypeIds}
        hiddenSchemaIds={hiddenSchemaIds}
        onToggleNodeTypeVisibility={(nodeTypeId) => {
          setHiddenNodeTypeIds((prev) => {
            const next = new Set(prev);
            if (next.has(nodeTypeId)) {
              next.delete(nodeTypeId);
            } else {
              next.add(nodeTypeId);
            }
            return next;
          });
        }}
        onToggleRelationTypeVisibility={(relationTypeId) => {
          setHiddenRelationTypeIds((prev) => {
            const next = new Set(prev);
            if (next.has(relationTypeId)) {
              next.delete(relationTypeId);
            } else {
              next.add(relationTypeId);
            }
            return next;
          });
        }}
        onToggleSchemaVisibility={(schemaId) => {
          setHiddenSchemaIds((prev) => {
            const next = new Set(prev);
            if (next.has(schemaId)) {
              next.delete(schemaId);
            } else {
              next.add(schemaId);
            }
            return next;
          });
        }}
        onResetVisibility={() => {
          // Reset all visibility - show all items
          setHiddenNodeTypeIds(new Set());
          setHiddenRelationTypeIds(new Set());
          setHiddenSchemaIds(new Set());
        }}
      />
      <div className="flex-1 relative">
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          layout={layout}
          onNodeClick={handleNodeClick}
          onBackgroundClick={() => {}}
          onReady={(handle) => {
            canvasHandleRef.current = handle;
          }}
          readOnly={true}
          schemas={schemas?.map(s => ({ id: s.id, singular_name: s.label, plural_name: s.label })) || []}
          nodeTypes={nodeTypes}
          relationTypes={relationTypes}
          schemasConfig={schemas}
          hiddenNodeTypeIds={hiddenNodeTypeIds}
          hiddenRelationTypeIds={hiddenRelationTypeIds}
          hiddenSchemaIds={hiddenSchemaIds}
        />
      </div>
    </div>
  );
}

