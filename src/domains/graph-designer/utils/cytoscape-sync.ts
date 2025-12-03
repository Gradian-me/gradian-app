import type { Core, ElementDefinition } from 'cytoscape';
import type { GraphEdgeData, GraphLayout, GraphNodeData } from '../types';
import { LAYOUTS } from './layouts';
import { getNodeType, nodeDataToCytoscapeData, getIncompleteValue } from './node-data-extractor';
import { updateNodeStyles, updateStylesAfterLayout, updateEdgeCurveStyle } from './cytoscape-styles';

/**
 * Schema information for node type resolution
 */
export interface SchemaInfo {
  id: string;
  singular_name?: string;
  plural_name?: string;
}

/**
 * Configuration for synchronizing React state with Cytoscape
 */
export interface CytoscapeSyncConfig {
  cy: Core;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  layout: GraphLayout;
  schemas: SchemaInfo[];
}

/**
 * Synchronizes React state (nodes, edges) with Cytoscape graph
 * Handles adding, removing, updating elements and running layout
 */
export function syncCytoscapeGraph(config: CytoscapeSyncConfig): void {
  const { cy, nodes, edges, layout, schemas } = config;

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
      .map((node) => {
        const nodeType = getNodeType(node, schemas);
        return {
          data: nodeDataToCytoscapeData(node, nodeType),
        };
      }),
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
        const nodeType = getNodeType(node, schemas);
        const incompleteValue = getIncompleteValue(node);
        
        existing.data({
          ...nodeDataToCytoscapeData(node, nodeType),
          incomplete: incompleteValue,
        });
        
        // Always update style for existing nodes to ensure they reflect current state
        existing.style();
      }
    }
  });
  
  // Trigger a style recalculation on the entire graph once after all updates
  updateNodeStyles(cy);

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

  // Update edge curve-style based on layout
  updateEdgeCurveStyle(cy, layout);

  // Run layout with smooth animation
  const layoutOptions = {
    ...LAYOUTS[layout],
    animate: true,
  };
  const layoutInstance = cy.layout(layoutOptions);
  updateStylesAfterLayout(cy, layoutInstance);
  layoutInstance.run();
}

