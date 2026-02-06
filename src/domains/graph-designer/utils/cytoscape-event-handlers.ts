import type { Core } from 'cytoscape';
import type { GraphNodeData } from '../types';
import { extractNodeDataFromElement } from './node-data-extractor';
import { createNodeContextMenu, type ExtraNodeContextAction } from './node-context-menu';
import { createEdgeContextMenu } from './edge-context-menu';

/**
 * Configuration for setting up Cytoscape event handlers
 */
export interface EventHandlersConfig {
  cy: Core;
  edgeModeEnabledRef: React.MutableRefObject<boolean>;
  multiSelectEnabledRef: React.MutableRefObject<boolean>;
  onNodeClick?: (node: GraphNodeData, isMultiSelect: boolean) => void;
  onBackgroundClick?: () => void;
  onNodeContextAction?: (action: 'edit' | 'delete' | 'select', node: GraphNodeData) => void;
  extraNodeContextActions?: ExtraNodeContextAction[];
  /** When true, node context menu hides Edit and Select (e.g. dynamic query builder mode) */
  hideSelectAndEdit?: boolean;
  onEdgeContextAction?: (action: 'delete' | 'toggleOptional', edge: any) => void;
}

/**
 * Sets up all Cytoscape event handlers
 * Returns cleanup function to remove event listeners
 */
export function setupCytoscapeEventHandlers(config: EventHandlersConfig): () => void {
  const {
    cy,
    edgeModeEnabledRef,
    multiSelectEnabledRef,
    onNodeClick,
    onBackgroundClick,
    onNodeContextAction,
    extraNodeContextActions,
    hideSelectAndEdit,
    onEdgeContextAction,
  } = config;

  // Node click handler - only active when edge mode is disabled
  const handleNodeClick = (event: any) => {
    // Don't handle clicks when edge mode is enabled (edgehandles will handle it)
    if (edgeModeEnabledRef.current) return;
    if (!onNodeClick) return;
    
    // Check if Ctrl/Cmd key is pressed (for multiselect)
    const originalEvent = event.originalEvent as MouseEvent | TouchEvent;
    const isCtrlPressed = originalEvent && (
      (originalEvent instanceof MouseEvent && (originalEvent.ctrlKey || originalEvent.metaKey)) ||
      (originalEvent instanceof TouchEvent && false) // Touch events don't have modifier keys
    );
    
    // Multiselect is active if toggle is enabled OR Ctrl is pressed
    const isMultiSelect = multiSelectEnabledRef.current || isCtrlPressed;
    
    const node = extractNodeDataFromElement(event.target);
    onNodeClick(node, isMultiSelect);
  };

  // Background click handler - clear selection when clicking empty space
  const handleBackgroundClick = (event: any) => {
    // Only clear if clicking on background (not on a node or edge)
    if (edgeModeEnabledRef.current) return;
    const target = event.target;
    // Check if we clicked on the core/background (not a node or edge)
    if ((target === cy || (!target.isNode() && !target.isEdge())) && onBackgroundClick) {
      // Clicked on background - clear selection
      onBackgroundClick();
    }
  };

  // Register event handlers
  cy.on('tap', 'node', handleNodeClick);
  cy.on('tap', handleBackgroundClick);

  // Setup context menus
  if (onNodeContextAction) {
    (cy as any).cxtmenu(createNodeContextMenu(onNodeContextAction, extraNodeContextActions, { hideSelectAndEdit }));
  }

  if (onEdgeContextAction) {
    (cy as any).cxtmenu(createEdgeContextMenu(onEdgeContextAction));
  }

  // Return cleanup function
  return () => {
    cy.off('tap', 'node', handleNodeClick);
    cy.off('tap', handleBackgroundClick);
  };
}

