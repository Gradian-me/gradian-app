import type { Core } from 'cytoscape';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

/**
 * Manages edgehandles plugin enable/disable state
 */
export function manageEdgehandles(
  eh: any,
  cy: Core,
  enabled: boolean | undefined,
): void {
  if (!eh || !cy) return;
  const isEnabled = enabled ?? false;

  if (isEnabled) {
    // CRITICAL: Must enable the extension first, then enable draw mode
    // enableDrawMode() only works when the extension is enabled
    loggingCustom(LogType.GRAPH_LOG, 'info', 'Enabling edgehandles extension and draw mode');
    
    // Step 1: Enable the extension
    eh.enable();
    
    // Step 2: Enable draw mode (entire node body acts as handle)
    // This requires handleNodes: 'node' in the config (already set above)
    eh.enableDrawMode();
    
    loggingCustom(LogType.GRAPH_LOG, 'debug', `Edgehandles enabled and draw mode active, node count=${cy.nodes().length}`);
    
    // Step 3: Ensure nodes are grabbable (they should be by default, but ensure it)
    // Edgehandles needs nodes to be grabbable to detect drag events
    cy.nodes().grabify();
    
    // Step 4: Prevent node selection when edge mode is active to avoid conflicts
    cy.nodes().unselect();
    
    loggingCustom(LogType.GRAPH_LOG, 'debug', 'Edgehandles fully enabled: extension=enabled, drawMode=enabled, nodes=grabbable');
  } else {
    // Disable in reverse order: draw mode first, then extension
    loggingCustom(LogType.GRAPH_LOG, 'info', 'Disabling edgehandles draw mode and extension');
    
    // Step 1: Disable draw mode
    eh.disableDrawMode();
    
    // Step 2: Disable the extension
    eh.disable();
    
    // Step 3: Ensure nodes remain grabbable for normal interaction
    cy.nodes().grabify();
    
    loggingCustom(LogType.GRAPH_LOG, 'debug', 'Edgehandles disabled: extension=disabled, drawMode=disabled, nodes=grabbable');
  }
}

/**
 * Cleanup function for edgehandles
 */
export function cleanupEdgehandles(eh: any, enabled: boolean | undefined): void {
  if (eh && enabled) {
    loggingCustom(LogType.GRAPH_LOG, 'debug', 'Cleaning up edgehandles on effect cleanup');
    eh.disableDrawMode();
    eh.disable();
  }
}

