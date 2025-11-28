/// <reference path="../../../types/cytoscape-plugins.d.ts" />
'use client';

import React, { useEffect, useRef } from 'react';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import coseBilkent from 'cytoscape-cose-bilkent';
import cxtmenu from 'cytoscape-cxtmenu';
import edgehandles from 'cytoscape-edgehandles';
// Undo/redo and other plugins can be added later when integrating full behavior.

import type { GraphEdgeData, GraphLayout, GraphNodeData } from '../types';
import { LAYOUTS } from '../utils/layouts';
import { validateEdgeCreation } from '../utils/edge-handling';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

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
  onNodeClick?: (node: GraphNodeData) => void;
  onElementsChange?: (nodes: GraphNodeData[], edges: GraphEdgeData[]) => void;
  onReady?: (handle: GraphCanvasHandle) => void;
  onNodeContextAction?: (action: 'edit' | 'delete' | 'select', node: GraphNodeData) => void;
  onEdgeContextAction?: (action: 'delete', edge: GraphEdgeData) => void;
  edgeModeEnabled?: boolean;
  onEdgeCreated?: (source: GraphNodeData, target: GraphNodeData) => void;
  onEdgeModeDisable?: () => void;
  selectedNodeId?: string | null;
}

export function GraphCanvas(props: GraphCanvasProps) {
  const {
    nodes,
    edges,
    layout,
    onNodeClick,
    onElementsChange,
    onReady,
    onNodeContextAction,
    onEdgeContextAction,
    edgeModeEnabled,
    onEdgeCreated,
    onEdgeModeDisable,
    selectedNodeId,
  } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const edgeHandlesRef = useRef<any | null>(null);
  const edgeModeEnabledRef = useRef(edgeModeEnabled);
  const edgesRef = useRef(edges);

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      style: [
        {
          selector: 'node',
          style: {
            shape: 'round-rectangle',
            'background-color': '#f9f5ff', // violet-50
            'background-opacity': 0.95,
            label: 'data(title)',
            color: '#1e293b', // slate-800
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': 9.5,
            'text-wrap': 'wrap',
            'text-max-width': 80 as any,
            width: 76 as any,
            height: 46 as any,
            'border-width': 2,
            'border-color': '#8b5cf6', // violet-500
            'border-opacity': 0.9,
            padding: 5 as any,
            'shadow-blur': 8,
            'shadow-opacity': 0.12,
            'shadow-color': '#4c1d95',
            'shadow-offset-x': 0,
            'shadow-offset-y': 2,
          } as any,
        },
        {
          // Parent/group nodes (compound)
          selector: 'node:parent',
          style: {
            shape: 'round-rectangle',
            'background-color': '#e9d5ff', // violet-200
            'background-opacity': 0.7,
            'border-color': '#7c3aed', // violet-600
            'border-width': 2,
            padding: 26 as any,
            'text-valign': 'top',
            'text-halign': 'center',
            'text-margin-y': -6,
            'font-size': 12,
            'font-weight': 600,
            color: '#111827',
            'shadow-blur': 12,
            'shadow-opacity': 0.18,
            'shadow-color': '#4c1d95',
            'shadow-offset-x': 0,
            'shadow-offset-y': 3,
          } as any,
        },
        {
          selector: 'node[incomplete = 1]',
          style: {
            'border-style': 'dashed',
            'border-color': '#06b6d4', // cyan-500
            'border-width': 3,
            'background-color': '#ecfeff', // cyan-50
            'border-opacity': 1,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#6366f1', // indigo-500
            'target-arrow-color': '#06b6d4', // cyan-500
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-style': 'dashed',
            'border-color': '#f97316', // orange-500
            'border-width': 3,
          },
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#f97316',
            'target-arrow-color': '#f97316',
          },
        },
        // Edgehandles extension styles
        {
          selector: 'node.eh-source',
          style: {
            'border-color': '#6366f1', // indigo-500
            'border-width': 3,
          },
        },
        {
          selector: 'node.eh-target',
          style: {
            'border-color': '#06b6d4', // cyan-500
            'border-width': 3,
          },
        },
        {
          selector: 'node.eh-hover',
          style: {
            'border-color': '#06b6d4', // cyan-500
            'border-width': 3,
            'border-opacity': 0.8,
          },
        },
        {
          selector: 'node.eh-presumptive-target',
          style: {
            'border-color': '#06b6d4', // cyan-500
            'border-width': 2,
            'border-opacity': 0.6,
          },
        },
        {
          selector: 'edge.eh-preview',
          style: {
            'line-color': '#06b6d4', // cyan-500
            'target-arrow-color': '#06b6d4',
            'line-style': 'dashed',
            'line-dash-pattern': [6, 3],
            opacity: 0.7,
          },
        },
        {
          selector: 'edge.eh-ghost-edge',
          style: {
            'line-color': '#6366f1', // indigo-500
            'target-arrow-color': '#6366f1',
            'line-style': 'dashed',
            'line-dash-pattern': [4, 4],
            opacity: 0.5,
          },
        },
      ],
      layout: LAYOUTS[layout],
    });

    cyRef.current = cy;

    // Node click handler - only active when edge mode is disabled
    cy.on('tap', 'node', (event) => {
      // Don't handle clicks when edge mode is enabled (edgehandles will handle it)
      if (edgeModeEnabledRef.current) return;
      if (!onNodeClick) return;
      const data = event.target.data() as any;
      const node: GraphNodeData = {
        id: data.id,
        schemaId: data.schemaId,
        title: data.title,
        incomplete: !!data.incomplete,
        parentId: data.parentId ?? null,
        payload: data.payload ?? {},
      };
      onNodeClick(node);
    });

    if (onNodeContextAction) {
      (cy as any).cxtmenu({
        selector: 'node',
        commands: [
          {
            content: 'Edit',
            select: (element: any) => {
              const data = element.data();
              const node: GraphNodeData = {
                id: data.id,
                schemaId: data.schemaId,
                title: data.title,
                incomplete: !!data.incomplete,
                parentId: data.parentId ?? null,
                payload: data.payload ?? {},
              };
              onNodeContextAction('edit', node);
            },
          },
          {
            content: 'Select',
            select: (element: any) => {
              const data = element.data();
              const node: GraphNodeData = {
                id: data.id,
                schemaId: data.schemaId,
                title: data.title,
                incomplete: !!data.incomplete,
                parentId: data.parentId ?? null,
                payload: data.payload ?? {},
              };
              onNodeContextAction('select', node);
            },
          },
          {
            content: 'Delete',
            select: (element: any) => {
              const data = element.data();
              const node: GraphNodeData = {
                id: data.id,
                schemaId: data.schemaId,
                title: data.title,
                incomplete: !!data.incomplete,
                parentId: data.parentId ?? null,
                payload: data.payload ?? {},
              };
              onNodeContextAction('delete', node);
            },
          },
        ],
        menuRadius: 80,
        indicatorSize: 24,
        activePadding: 10,
      });
    }

    if (onEdgeContextAction) {
      (cy as any).cxtmenu({
        selector: 'edge',
        commands: [
          {
            content: 'Delete',
            select: (element: any) => {
              const data = element.data();
              const edge: GraphEdgeData = {
                id: data.id,
                source: data.source,
                target: data.target,
                sourceSchema: data.sourceSchema,
                sourceId: data.sourceId,
                targetSchema: data.targetSchema,
                targetId: data.targetId,
                relationTypeId: data.relationTypeId,
              };
              onEdgeContextAction('delete', edge);
            },
          },
        ],
        menuRadius: 80,
        indicatorSize: 24,
        activePadding: 10,
      });
    }

    // Initialize edgehandles plugin (always, not conditional)
    loggingCustom(LogType.GRAPH_LOG, 'debug', 'Initializing edgehandles plugin');
    const eh = (cy as any).edgehandles({
      // Prevent self-loops (edge from node to itself)
      // Full validation happens in ehcomplete handler where we have access to React state
      canConnect: (sourceNode: any, targetNode: any) => {
        const canConnect = !sourceNode.same(targetNode);
        loggingCustom(LogType.GRAPH_LOG, 'debug', `canConnect check: source=${sourceNode.id()}, target=${targetNode.id()}, result=${canConnect}`);
        return canConnect;
      },
      // Return edge params - we'll remove this edge and create our own via React state
      // But we need to provide valid data for edgehandles to create the visual edge
      edgeParams: (sourceNode: any, targetNode: any) => {
        const params = {
          source: sourceNode.id(),
          target: targetNode.id(),
        };
        loggingCustom(LogType.GRAPH_LOG, 'debug', `edgeParams: ${JSON.stringify(params)}`);
        return params;
      },
      // Configuration options
      hoverDelay: 150, // Time spent hovering over target before selection (ms)
      snap: true, // Enable snap-to-target (edge can be drawn by moving close to target)
      snapThreshold: 50, // Target must be within this many pixels
      snapFrequency: 15, // Snap checks per second (Hz)
      noEdgeEventsInDraw: true, // Set events:no to edges during draws
      disableBrowserGestures: true, // Disable browser gestures during edge drawing
    });
    edgeHandlesRef.current = eh;
    // Start disabled - will be enabled via edgeModeEnabled prop
    eh.disable();
    eh.disableDrawMode();
    loggingCustom(LogType.GRAPH_LOG, 'debug', 'Edgehandles plugin initialized and disabled');

    // Handle edge creation completion
    cy.on('ehcomplete', (_event: any, source: any, target: any, added: any) => {
      loggingCustom(LogType.GRAPH_LOG, 'info', `ehcomplete event fired: source=${source?.id()}, target=${target?.id()}, added=${!!added}`);
      
      if (!onEdgeCreated) {
        loggingCustom(LogType.GRAPH_LOG, 'warn', 'onEdgeCreated callback not provided');
        // Remove the auto-created visual edge if callback is missing
        if (added && typeof added.remove === 'function') {
          added.remove();
        }
        return;
      }
      
      const sourceData = source.data();
      const targetData = target.data();
      loggingCustom(LogType.GRAPH_LOG, 'debug', `Source node data: ${JSON.stringify(sourceData)}`);
      loggingCustom(LogType.GRAPH_LOG, 'debug', `Target node data: ${JSON.stringify(targetData)}`);
      
      const sourceNode: GraphNodeData = {
        id: sourceData.id,
        schemaId: sourceData.schemaId,
        title: sourceData.title,
        incomplete: !!sourceData.incomplete,
        parentId: sourceData.parentId ?? null,
        payload: sourceData.payload ?? {},
      };
      const targetNode: GraphNodeData = {
        id: targetData.id,
        schemaId: targetData.schemaId,
        title: targetData.title,
        incomplete: !!targetData.incomplete,
        parentId: targetData.parentId ?? null,
        payload: targetData.payload ?? {},
      };

      // Use React state edges for validation (more reliable than cytoscape edges)
      // Final validation before creating edge
      loggingCustom(LogType.GRAPH_LOG, 'debug', `Validating edge creation: source=${sourceNode.id}, target=${targetNode.id}, existing edges count=${edgesRef.current.length}`);
      const validation = validateEdgeCreation(sourceNode, targetNode, edgesRef.current);
      loggingCustom(LogType.GRAPH_LOG, validation.valid ? 'info' : 'warn', `Edge validation result: valid=${validation.valid}, error=${validation.error || 'none'}`);
      
      if (!validation.valid) {
        loggingCustom(LogType.GRAPH_LOG, 'warn', `Edge creation failed: ${validation.error}`);
        // Remove the auto-created visual edge
        if (added && typeof added.remove === 'function') {
          added.remove();
          loggingCustom(LogType.GRAPH_LOG, 'debug', 'Removed auto-created visual edge due to validation failure');
        }
        return;
      }

      // We manage edges in React state, so remove the auto-created visual edge
      if (added && typeof added.remove === 'function') {
        added.remove();
        loggingCustom(LogType.GRAPH_LOG, 'debug', 'Removed auto-created visual edge (will be replaced by React state)');
      }

      // Add edge via React state management
      loggingCustom(LogType.GRAPH_LOG, 'info', `Calling onEdgeCreated callback: source=${sourceNode.id}, target=${targetNode.id}`);
      onEdgeCreated(sourceNode, targetNode);
      
      // Disable edge mode after creating an edge
      if (onEdgeModeDisable) {
        loggingCustom(LogType.GRAPH_LOG, 'debug', 'Disabling edge mode after edge creation');
        onEdgeModeDisable();
      }
    });

    // Track if edgehandles is currently drawing an edge
    let edgehandlesDragStarted = false;
    
    // Handle edge creation start for visual feedback
    cy.on('ehstart', (_event: any, sourceNode: any) => {
      // Source node is automatically styled with .eh-source class
      edgehandlesDragStarted = true;
      loggingCustom(LogType.GRAPH_LOG, 'info', `Edge creation started from node: ${sourceNode.id()}`);
    });

    // Handle hover events for better UX
    cy.on('ehhoverover', (_event: any, sourceNode: any, targetNode: any) => {
      // Target node gets .eh-hover class automatically
      loggingCustom(LogType.GRAPH_LOG, 'debug', `Hovering over target node: ${targetNode.id()}`);
    });

    // Handle preview events
    cy.on('ehpreviewon', (_event: any, sourceNode: any, targetNode: any, previewEdge: any) => {
      // Preview edge is shown with .eh-preview class
      loggingCustom(LogType.GRAPH_LOG, 'debug', `Preview edge shown: source=${sourceNode.id()}, target=${targetNode.id()}`);
    });
    
    cy.on('ehpreviewoff', () => {
      loggingCustom(LogType.GRAPH_LOG, 'debug', 'Preview edge hidden');
    });
    
    // Clear drag state when edge creation completes or is cancelled
    cy.on('ehcomplete', () => {
      edgehandlesDragStarted = false;
      loggingCustom(LogType.GRAPH_LOG, 'debug', 'Edge creation completed, cleared drag state');
    });
    
    cy.on('ehcancel', () => {
      edgehandlesDragStarted = false;
      loggingCustom(LogType.GRAPH_LOG, 'info', 'Edge creation cancelled');
    });
    
    cy.on('ehstop', () => {
      loggingCustom(LogType.GRAPH_LOG, 'debug', 'Edge creation stopped');
    });

    // Handle draw mode events
    cy.on('ehdrawon', () => {
      loggingCustom(LogType.GRAPH_LOG, 'info', 'Draw mode enabled');
    });
    
    cy.on('ehdrawoff', () => {
      loggingCustom(LogType.GRAPH_LOG, 'info', 'Draw mode disabled');
    });

    // Track when edgehandles starts drawing (to distinguish from normal node drag)
    cy.on('grab', 'node', (event: any) => {
      if (edgeModeEnabledRef.current) {
        const target = event.target;
        if (target && target.isNode()) {
          loggingCustom(LogType.GRAPH_LOG, 'debug', `Node grab detected in edge mode: ${target.id()}`);
        }
      }
    });

    if (onReady) {
      onReady({
        getInstance: () => cyRef.current,
        runLayout: (l: GraphLayout) => {
          const layoutOptions = {
            ...LAYOUTS[l],
            animate: true,
          };
          cy.layout(layoutOptions).run();
        },
        exportPng: () => {
          if (!cyRef.current) return null;
          return cyRef.current.png({ full: true, scale: 2 });
        },
      });
    }

    return () => {
      if (edgeHandlesRef.current) {
        edgeHandlesRef.current.destroy();
        edgeHandlesRef.current = null;
      }
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

  // Keep edges ref in sync
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    const eh = edgeHandlesRef.current;
    const cy = cyRef.current;
    if (!eh || !cy) return;

    // Update ref to track current edge mode state
    edgeModeEnabledRef.current = edgeModeEnabled;

    if (edgeModeEnabled) {
      // Enable edgehandles in draw mode - entire node body acts as handle
      // According to docs: enableDrawMode() turns on draw mode (the entire node body acts like the handle)
      loggingCustom(LogType.GRAPH_LOG, 'info', 'Enabling edgehandles in draw mode');
      eh.enableDrawMode();
      loggingCustom(LogType.GRAPH_LOG, 'debug', `Edgehandles draw mode enabled, node count=${cy.nodes().length}`);
      // Prevent node selection when edge mode is active to avoid conflicts
      cy.nodes().unselect();
      // Nodes must be grabbable for edgehandles to detect drag events in draw mode
      cy.nodes().grabify();
      loggingCustom(LogType.GRAPH_LOG, 'debug', 'Nodes grabified (grabbable) for edgehandles to detect drag');
    } else {
      // Disable draw mode
      loggingCustom(LogType.GRAPH_LOG, 'info', 'Disabling edgehandles draw mode');
      eh.disableDrawMode();
      // Nodes remain grabbable for normal interaction
      cy.nodes().grabify();
      loggingCustom(LogType.GRAPH_LOG, 'debug', 'Draw mode disabled, nodes remain grabbable for normal interaction');
    }
  }, [edgeModeEnabled]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    if (!selectedNodeId) {
      cy.elements().unselect();
      return;
    }

    cy.elements().unselect();
    const node = cy.$id(selectedNodeId);
    if (node && node.length > 0) {
      node.select();
      // Smooth center animation
      cy.animate({
        center: {
          eles: node,
        },
        duration: 500,
        easing: 'ease-out',
      });
    }
  }, [selectedNodeId]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const currentElementIds = new Set(cy.elements().map((el) => el.id()));
    const newElementIds = new Set([
      ...nodes.map((n) => n.id),
      ...edges.map((e) => e.id),
    ]);

    // Find elements to remove (exist in current but not in new)
    const toRemove = cy.elements().filter((el) => !newElementIds.has(el.id()));
    
    // Find elements to add (exist in new but not in current)
    const toAdd: ElementDefinition[] = [
      ...nodes
        .filter((node) => !currentElementIds.has(node.id))
        .map((node) => ({
          data: {
            id: node.id,
            title: node.title ?? 'Untitled',
            schemaId: node.schemaId,
            incomplete: node.incomplete ? 1 : 0,
            parentId: node.parentId ?? undefined,
            payload: node.payload ?? {},
          },
        })),
      ...edges
        .filter((edge) => !currentElementIds.has(edge.id))
        .map((edge) => ({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceSchema: edge.sourceSchema,
            sourceId: edge.sourceId,
            targetSchema: edge.targetSchema,
            targetId: edge.targetId,
            relationTypeId: edge.relationTypeId,
          },
        })),
    ];

    // Update existing node data
    nodes.forEach((node) => {
      if (currentElementIds.has(node.id)) {
        const existing = cy.$id(node.id);
        if (existing.length > 0) {
          existing.data({
            title: node.title ?? 'Untitled',
            schemaId: node.schemaId,
            incomplete: node.incomplete ? 1 : 0,
            parentId: node.parentId ?? undefined,
            payload: node.payload ?? {},
          });
        }
      }
    });

    // Update existing edge data
    edges.forEach((edge) => {
      if (currentElementIds.has(edge.id)) {
        const existing = cy.$id(edge.id);
        if (existing.length > 0) {
          existing.data({
            source: edge.source,
            target: edge.target,
            sourceSchema: edge.sourceSchema,
            sourceId: edge.sourceId,
            targetSchema: edge.targetSchema,
            targetId: edge.targetId,
            relationTypeId: edge.relationTypeId,
          });
        }
      }
    });

    // Animate removals with fade-out
    if (toRemove.length > 0) {
      toRemove.animate({
        style: { opacity: 0 },
        duration: 300,
        easing: 'ease-out',
      });
      setTimeout(() => {
        toRemove.remove();
      }, 300);
    }

    // Add new elements with fade-in animation
    if (toAdd.length > 0) {
      const added = cy.add(toAdd);
      added.style({ opacity: 0 });
      added.animate({
        style: { opacity: 1 },
        duration: 400,
        easing: 'ease-out',
      });
    }

    // Run layout with smooth animation
    const layoutOptions = {
      ...LAYOUTS[layout],
      animate: true,
    };
    cy.layout(layoutOptions).run();
  }, [nodes, edges, layout]);

  return <div ref={containerRef} className="h-full w-full" />;
}


