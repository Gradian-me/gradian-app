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
 * Closes any open cytoscape-cxtmenu context menus.
 * Call when layout completes (nodes/edges have new positions) so the menu doesn't stay open in the wrong place.
 */
export function closeCxtMenus(cy: Core): void {
  const container = cy.container();
  if (!container) return;
  const menus = container.querySelectorAll('.cxtmenu');
  menus.forEach((menu) => {
    const parent = menu.firstElementChild as HTMLElement | null;
    if (parent?.style) parent.style.display = 'none';
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

