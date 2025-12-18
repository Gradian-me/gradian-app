import type { Core } from 'cytoscape';
import type { GraphNodeData, GraphEdgeData } from '../types';
import { validateEdgeCreation } from './edge-handling';
import { extractNodeDataFromElement } from './node-data-extractor';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

/**
 * Configuration for edgehandles event handlers
 */
export interface EdgehandlesEventConfig {
  onEdgeCreated?: (source: GraphNodeData, target: GraphNodeData) => void;
  onEdgeModeDisable?: () => void;
  existingEdges: GraphEdgeData[];
  edgesRef: React.MutableRefObject<GraphEdgeData[]>;
}

/**
 * Sets up edgehandles event handlers for Cytoscape
 */
export function setupEdgehandlesEvents(
  cy: Core,
  config: EdgehandlesEventConfig,
): () => void {
  const { onEdgeCreated, onEdgeModeDisable, edgesRef } = config;

  // Handle edge creation completion
  const handleEdgeComplete = (_event: any, source: any, target: any, added: any) => {
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
    
    const sourceNode = extractNodeDataFromElement(source);
    const targetNode = extractNodeDataFromElement(target);

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
    
    // Clear drag state after edge creation completes
    edgehandlesDragStarted = false;
    loggingCustom(LogType.GRAPH_LOG, 'debug', 'Edge creation completed, cleared drag state');
    
    // Disable edge mode after creating an edge
    if (onEdgeModeDisable) {
      loggingCustom(LogType.GRAPH_LOG, 'debug', 'Disabling edge mode after edge creation');
      onEdgeModeDisable();
    }
  };

  // Track if edgehandles is currently drawing an edge
  let edgehandlesDragStarted = false;
  
  // Handle edge creation start for visual feedback
  const handleEdgeStart = (_event: any, sourceNode: any) => {
    // Source node is automatically styled with .eh-source class
    edgehandlesDragStarted = true;
    loggingCustom(LogType.GRAPH_LOG, 'info', `Edge creation started from node: ${sourceNode.id()}`);
  };

  // Handle hover events for better UX
  const handleHoverOver = (_event: any, sourceNode: any, targetNode: any) => {
    // Target node gets .eh-hover class automatically
    loggingCustom(LogType.GRAPH_LOG, 'debug', `Hovering over target node: ${targetNode.id()}`);
  };

  // Handle preview events
  const handlePreviewOn = (_event: any, sourceNode: any, targetNode: any, previewEdge: any) => {
    // Preview edge is shown with .eh-preview class
    loggingCustom(LogType.GRAPH_LOG, 'debug', `Preview edge shown: source=${sourceNode.id()}, target=${targetNode.id()}`);
  };
  
  const handlePreviewOff = () => {
    loggingCustom(LogType.GRAPH_LOG, 'debug', 'Preview edge hidden');
  };
  
  const handleEdgeCancel = () => {
    edgehandlesDragStarted = false;
    loggingCustom(LogType.GRAPH_LOG, 'info', 'Edge creation cancelled');
  };
  
  const handleEdgeStop = () => {
    loggingCustom(LogType.GRAPH_LOG, 'debug', 'Edge creation stopped');
  };

  // Handle draw mode events
  const handleDrawOn = () => {
    loggingCustom(LogType.GRAPH_LOG, 'info', 'Draw mode enabled');
  };
  
  const handleDrawOff = () => {
    loggingCustom(LogType.GRAPH_LOG, 'info', 'Draw mode disabled');
  };

  // Register all event handlers
  // Note: handleEdgeComplete already handles the complete event and state cleanup
  cy.on('ehcomplete', handleEdgeComplete);
  cy.on('ehstart', handleEdgeStart);
  cy.on('ehhoverover', handleHoverOver);
  cy.on('ehpreviewon', handlePreviewOn);
  cy.on('ehpreviewoff', handlePreviewOff);
  cy.on('ehcancel', handleEdgeCancel);
  cy.on('ehstop', handleEdgeStop);
  cy.on('ehdrawon', handleDrawOn);
  cy.on('ehdrawoff', handleDrawOff);

  // Return cleanup function
  return () => {
    cy.off('ehcomplete', handleEdgeComplete);
    cy.off('ehstart', handleEdgeStart);
    cy.off('ehhoverover', handleHoverOver);
    cy.off('ehpreviewon', handlePreviewOn);
    cy.off('ehpreviewoff', handlePreviewOff);
    cy.off('ehcancel', handleEdgeCancel);
    cy.off('ehstop', handleEdgeStop);
    cy.off('ehdrawon', handleDrawOn);
    cy.off('ehdrawoff', handleDrawOff);
  };
}

