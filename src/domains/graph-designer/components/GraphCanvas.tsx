'use client';

import React, { useEffect, useRef } from 'react';
import cytoscape, { Core } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import coseBilkent from 'cytoscape-cose-bilkent';
import cxtmenu from 'cytoscape-cxtmenu';
import edgehandles from 'cytoscape-edgehandles';
// Undo/redo and other plugins can be added later when integrating full behavior.

import type { GraphEdgeData, GraphLayout, GraphNodeData } from '../types';
import type { ExtraNodeContextAction } from '../utils/node-context-menu';
import { LAYOUTS } from '../utils/layouts';
import { syncCytoscapeGraph } from '../utils/cytoscape-sync';
import { updateStylesAfterLayout, updateEdgeCurveStyle, closeCxtMenus } from '../utils/cytoscape-styles';
import { initializeCytoscape } from '../utils/cytoscape-initialization';
import { manageEdgehandles, cleanupEdgehandles } from '../utils/edgehandles-manager';
import { manageNodeSelection } from '../utils/cytoscape-selection';

cytoscape.use(dagre);
cytoscape.use(coseBilkent);
(cytoscape as any).use(cxtmenu);
(cytoscape as any).use(edgehandles);

export interface GraphCanvasHandle {
  getInstance: () => Core | null;
  runLayout: (layout: GraphLayout) => void;
  exportPng: () => string | null;
}

interface GraphCanvasProps {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  layout: GraphLayout;
  onNodeClick?: (node: GraphNodeData, isMultiSelect: boolean) => void;
  onBackgroundClick?: () => void;
  onElementsChange?: (nodes: GraphNodeData[], edges: GraphEdgeData[]) => void;
  onReady?: (handle: GraphCanvasHandle) => void;
  onNodeContextAction?: (action: 'edit' | 'delete' | 'select', node: GraphNodeData) => void;
  extraNodeContextActions?: ExtraNodeContextAction[];
  /** When true, node context menu hides Edit and Select (e.g. dynamic query builder) */
  hideSelectAndEdit?: boolean;
  onEdgeContextAction?: (action: 'delete' | 'toggleOptional', edge: GraphEdgeData) => void;
  edgeModeEnabled?: boolean;
  onEdgeCreated?: (source: GraphNodeData, target: GraphNodeData) => void;
  onEdgeModeDisable?: () => void;
  selectedNodeId?: string | null;
  selectedNodeIds?: Set<string>;
  multiSelectEnabled?: boolean;
  schemas?: Array<{ id: string; singular_name?: string; plural_name?: string }>;
  readOnly?: boolean;
  nodeTypes?: Array<{ id: string; label: string; color: string; icon?: string }>;
  relationTypes?: Array<{ id: string; label: string; color: string; icon?: string }>;
  schemasConfig?: Array<{ id: string; label: string; color: string; icon?: string }>;
  hiddenNodeTypeIds?: Set<string>;
  hiddenRelationTypeIds?: Set<string>;
  hiddenSchemaIds?: Set<string>;
}

export function GraphCanvas(props: GraphCanvasProps) {
  const {
    nodes,
    edges,
    layout,
    onNodeClick,
    onBackgroundClick,
    onElementsChange,
    onReady,
    onNodeContextAction,
    extraNodeContextActions,
    hideSelectAndEdit,
    onEdgeContextAction,
    edgeModeEnabled,
    onEdgeCreated,
    onEdgeModeDisable,
    selectedNodeId,
    selectedNodeIds,
    multiSelectEnabled = false,
    schemas = [],
    readOnly = false,
    nodeTypes,
    relationTypes,
    schemasConfig,
    hiddenNodeTypeIds,
    hiddenRelationTypeIds,
    hiddenSchemaIds,
  } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const edgeHandlesRef = useRef<any | null>(null);
  const edgeModeEnabledRef = useRef(edgeModeEnabled ?? false);
  const multiSelectEnabledRef = useRef(multiSelectEnabled ?? false);
  const edgesRef = useRef(edges);
  const schemasRef = useRef(schemas);
  const tooltipManagerRef = useRef<any | null>(null);
  const edgehandlesCleanupRef = useRef<(() => void) | null>(null);
  const layoutRef = useRef<GraphLayout>(layout);
  const canvasHandleRef = useRef<GraphCanvasHandle | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const initResult = initializeCytoscape({
      container: containerRef.current,
      layout,
      schemas,
      edgeModeEnabledRef,
      multiSelectEnabledRef,
      edgesRef,
      // Allow onNodeClick even in readOnly mode (useful for viewer mode to show payload dialogs)
      onNodeClick: onNodeClick,
      onBackgroundClick: readOnly ? undefined : onBackgroundClick,
      onNodeContextAction: readOnly ? undefined : onNodeContextAction,
      extraNodeContextActions: readOnly ? undefined : extraNodeContextActions,
      hideSelectAndEdit,
      onEdgeContextAction: readOnly ? undefined : onEdgeContextAction,
      onEdgeCreated: readOnly ? undefined : onEdgeCreated,
      onEdgeModeDisable: readOnly ? undefined : onEdgeModeDisable,
      edges,
      readOnly,
      nodeTypes,
      relationTypes,
      schemasConfig,
    });

    cyRef.current = initResult.cy;
    edgeHandlesRef.current = initResult.edgehandles;
    tooltipManagerRef.current = initResult.tooltipManager;
    edgehandlesCleanupRef.current = initResult.cleanup;

    // Resize Cytoscape to match container dimensions after initialization
    // Use requestAnimationFrame to ensure container has rendered dimensions
    requestAnimationFrame(() => {
      if (initResult.cy && containerRef.current) {
        initResult.cy.resize();
      }
    });

    const handle: GraphCanvasHandle = {
      getInstance: () => cyRef.current,
      runLayout: (l: GraphLayout) => {
        layoutRef.current = l;
        // Update edge curve-style based on layout
        updateEdgeCurveStyle(initResult.cy, l);
        
        const layoutOptions = {
          ...LAYOUTS[l],
          animate: true,
        };
        const layoutInstance = initResult.cy.layout(layoutOptions);
        updateStylesAfterLayout(initResult.cy, layoutInstance);
        
        // Fit graph to viewport after layout completes
        layoutInstance.one('layoutstop', () => {
          closeCxtMenus(initResult.cy); // Close context menus when nodes/edges have new positions
          initResult.cy.fit(undefined, 10); // Fit with 10px padding
        });
        
        layoutInstance.run();
      },
      exportPng: () => {
        if (!cyRef.current) return null;
        return cyRef.current.png({ full: true, scale: 2 });
      },
    };
    
    canvasHandleRef.current = handle;
    
    if (onReady) {
      onReady(handle);
    }

    return initResult.cleanup;
  }, []);

  // Keep edges ref in sync
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    const eh = edgeHandlesRef.current;
    const cy = cyRef.current;
    if (!eh || !cy || readOnly) return;

    // Update ref to track current edge mode state
    const isEnabled = edgeModeEnabled ?? false;
    edgeModeEnabledRef.current = isEnabled;

    manageEdgehandles(eh, cy, isEnabled);

    // Cleanup function to ensure proper state on unmount or when edgeModeEnabled changes
    return () => {
      cleanupEdgehandles(eh, isEnabled);
    };
  }, [edgeModeEnabled, readOnly]);

  // Update refs when props change
  useEffect(() => {
    multiSelectEnabledRef.current = multiSelectEnabled;
  }, [multiSelectEnabled]);

  useEffect(() => {
    schemasRef.current = schemas;
    // Update tooltip manager with new schemas
    if (tooltipManagerRef.current) {
      tooltipManagerRef.current.updateSchemas(schemas, schemasConfig, nodeTypes, relationTypes);
    }
  }, [schemas, schemasConfig, nodeTypes, relationTypes]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    
    manageNodeSelection({
      cy,
      selectedNodeId,
      selectedNodeIds,
    });
  }, [selectedNodeId, selectedNodeIds]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // Ensure Cytoscape is resized to match container before syncing
    if (containerRef.current) {
      cy.resize();
    }

    syncCytoscapeGraph({
      cy,
      nodes,
      edges,
      layout,
      schemas: schemasRef.current,
      nodeTypes,
      relationTypes,
      schemasConfig,
      hiddenNodeTypeIds,
      hiddenRelationTypeIds,
      hiddenSchemaIds,
    });
  }, [nodes, edges, layout, hiddenNodeTypeIds, hiddenRelationTypeIds, hiddenSchemaIds, nodeTypes, relationTypes, schemasConfig]);

  // Update layout ref when layout prop changes
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  // Watch container size changes with ResizeObserver
  useEffect(() => {
    const cy = cyRef.current;
    const container = containerRef.current;
    if (!cy || !container) return;

    const resizeObserver = new ResizeObserver(() => {
      // Resize Cytoscape when container dimensions change
      cy.resize();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Handle window resize - refresh layout when page is resized
  useEffect(() => {
    const handleResize = () => {
      const cy = cyRef.current;
      if (!cy || !canvasHandleRef.current) return;
      
      // Resize the Cytoscape instance to match container
      cy.resize();
      
      // Fit graph to viewport immediately to prevent items from being pushed out
      cy.fit(undefined, 10);
      
      // Refresh the layout after a short delay to ensure resize is complete
      setTimeout(() => {
        if (canvasHandleRef.current) {
          canvasHandleRef.current.runLayout(layoutRef.current);
        }
      }, 100);
    };

    // Debounce resize events
    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 250);
    };

    window.addEventListener('resize', debouncedResize);
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}


