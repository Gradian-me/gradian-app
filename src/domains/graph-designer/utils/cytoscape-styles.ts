import type { Core } from 'cytoscape';

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
 * Updates styles after layout completes
 */
export function updateStylesAfterLayout(cy: Core, layoutInstance: any): void {
  layoutInstance.one('layoutstop', () => {
    updateNodeStyles(cy);
  });
}

