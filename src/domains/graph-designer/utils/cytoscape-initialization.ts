import type { Core } from 'cytoscape';
import cytoscape from 'cytoscape';
import type { GraphLayout } from '../types';
import { LAYOUTS } from './layouts';
import { GRAPH_STYLES } from './cytoscape-styles-config';
import type { NodeType, RelationType } from './cytoscape-sync';
import { NodeTooltipManager } from './node-tooltip';
import { createEdgehandles } from './edgehandles-config';
import { setupEdgehandlesEvents } from './edgehandles-events';
import { setupCytoscapeEventHandlers } from './cytoscape-event-handlers';
import type { GraphEdgeData, GraphNodeData } from '../types';

/**
 * Configuration for initializing Cytoscape instance
 */
export interface CytoscapeInitConfig {
  container: HTMLDivElement;
  layout: GraphLayout;
  schemas: Array<{ id: string; singular_name?: string; plural_name?: string }>;
  edgeModeEnabledRef: React.MutableRefObject<boolean>;
  multiSelectEnabledRef: React.MutableRefObject<boolean>;
  edgesRef: React.MutableRefObject<GraphEdgeData[]>;
  onNodeClick?: (node: GraphNodeData, isMultiSelect: boolean) => void;
  onBackgroundClick?: () => void;
  onNodeContextAction?: (action: 'edit' | 'delete' | 'select', node: GraphNodeData) => void;
  onEdgeContextAction?: (action: 'delete', edge: GraphEdgeData) => void;
  onEdgeCreated?: (source: GraphNodeData, target: GraphNodeData) => void;
  onEdgeModeDisable?: () => void;
  edges: GraphEdgeData[];
  readOnly?: boolean;
  nodeTypes?: NodeType[];
  relationTypes?: RelationType[];
  schemasConfig?: Array<{ id: string; label: string; color: string; icon?: string }>;
}

/**
 * Initialization result containing Cytoscape instance and cleanup functions
 */
export interface CytoscapeInitResult {
  cy: Core;
  tooltipManager: NodeTooltipManager;
  edgehandles: any;
  cleanup: () => void;
}

/**
 * Initializes a new Cytoscape instance with all plugins and handlers
 */
export function initializeCytoscape(config: CytoscapeInitConfig): CytoscapeInitResult {
  const {
    container,
    layout,
    schemas,
    edgeModeEnabledRef,
    multiSelectEnabledRef,
    edgesRef,
    onNodeClick,
    onBackgroundClick,
    onNodeContextAction,
    onEdgeContextAction,
    onEdgeCreated,
    onEdgeModeDisable,
    edges,
    readOnly = false,
    nodeTypes,
    relationTypes,
    schemasConfig,
  } = config;

  // Create Cytoscape instance
  const cy = cytoscape({
    container,
    style: GRAPH_STYLES,
    layout: LAYOUTS[layout],
  });

  // Initialize tooltip manager
  const tooltipManager = new NodeTooltipManager(cy, schemas, schemasConfig, nodeTypes, relationTypes);
  tooltipManager.setupEventHandlers();

  // Setup event handlers (skip in read-only mode)
  let eventHandlersCleanup: () => void = () => {};
  if (!readOnly) {
    eventHandlersCleanup = setupCytoscapeEventHandlers({
      cy,
      edgeModeEnabledRef,
      multiSelectEnabledRef,
      onNodeClick,
      onBackgroundClick,
      onNodeContextAction,
      onEdgeContextAction,
    });
  }

  // Initialize edgehandles plugin (skip in read-only mode)
  let edgehandles: any = null;
  let edgehandlesCleanup: (() => void) | null = null;
  if (!readOnly) {
    edgehandles = createEdgehandles(cy);

    // Setup edgehandles event handlers
    if (onEdgeCreated || onEdgeModeDisable) {
      edgehandlesCleanup = setupEdgehandlesEvents(cy, {
        onEdgeCreated,
        onEdgeModeDisable,
        existingEdges: edges,
        edgesRef,
      });
    }
  }

  // Return cleanup function
  const cleanup = () => {
    tooltipManager.destroy();
    eventHandlersCleanup();
    if (edgehandlesCleanup) {
      edgehandlesCleanup();
    }
    if (edgehandles && typeof edgehandles.destroy === 'function') {
      edgehandles.destroy();
    }
    cy.destroy();
  };

  return {
    cy,
    tooltipManager,
    edgehandles,
    cleanup,
  };
}

