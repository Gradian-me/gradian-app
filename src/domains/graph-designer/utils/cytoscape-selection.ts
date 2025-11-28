import type { Core } from 'cytoscape';

/**
 * Configuration for managing node selection
 */
export interface SelectionConfig {
  cy: Core;
  selectedNodeId?: string | null;
  selectedNodeIds?: Set<string>;
}

/**
 * Manages node selection in Cytoscape graph
 * Handles both single and multi-selection
 */
export function manageNodeSelection(config: SelectionConfig): void {
  const { cy, selectedNodeId, selectedNodeIds } = config;
  
  // Use selectedNodeIds if available, otherwise fall back to selectedNodeId
  const nodeIdsToSelect = selectedNodeIds && selectedNodeIds.size > 0 
    ? Array.from(selectedNodeIds)
    : selectedNodeId 
      ? [selectedNodeId]
      : [];
  
  if (nodeIdsToSelect.length === 0) {
    cy.elements().unselect();
    return;
  }

  cy.elements().unselect();
  
  // Select all nodes in the selection set
  const nodesToSelect = cy.collection();
  nodeIdsToSelect.forEach((nodeId) => {
    const node = cy.$id(nodeId);
    if (node && node.length > 0) {
      node.select();
      nodesToSelect.merge(node);
    }
  });
  
  // Smooth center animation on first selected node (or all if multiple)
  if (nodesToSelect.length > 0) {
    cy.animate({
      center: {
        eles: nodesToSelect,
      },
      duration: 500,
      easing: 'ease-out',
    });
  }
}

