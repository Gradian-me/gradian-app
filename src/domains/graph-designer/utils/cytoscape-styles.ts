import type { Core } from 'cytoscape';
import type { GraphLayout } from '../types';

/**
 * Forces a style recalculation for all nodes in the graph
 * Useful after data updates to ensure visual changes are reflected
 */
export function updateNodeStyles(cy: Core): void {
  // Trigger a style recalculation on the entire graph
  cy.style().update();
  
  // Force style recalculation for all nodes
  cy.nodes().forEach((node) => {
    node.style();
  });
}

/**
 * Updates edge curve-style based on the selected layout
 * Sets 'round-taxi' for the bpmn layout, 'unbundled-bezier' for all others
 */
export function updateEdgeCurveStyle(cy: Core, layout: GraphLayout): void {
  const curveStyle = layout === 'bpmn' ? 'round-taxi' : 'unbundled-bezier';
  
  // Update curve-style for all edges
  cy.edges().style('curve-style', curveStyle);
}

/**
 * Updates styles after layout completes
 */
export function updateStylesAfterLayout(cy: Core, layoutInstance: any): void {
  layoutInstance.one('layoutstop', () => {
    updateNodeStyles(cy);
  });
}

