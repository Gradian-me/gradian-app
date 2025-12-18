import type { Core } from 'cytoscape';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

/**
 * Configuration for edgehandles plugin
 */
export interface EdgehandlesConfig {
  handleNodes?: string;
  hoverDelay?: number;
  snap?: boolean;
  snapThreshold?: number;
  snapFrequency?: number;
  noEdgeEventsInDraw?: boolean;
  disableBrowserGestures?: boolean;
}

/**
 * Default edgehandles configuration
 */
const DEFAULT_CONFIG: Required<EdgehandlesConfig> = {
  handleNodes: 'node',
  hoverDelay: 150,
  snap: true,
  snapThreshold: 50,
  snapFrequency: 15,
  noEdgeEventsInDraw: true,
  disableBrowserGestures: true,
};

/**
 * Creates and initializes the edgehandles plugin
 * Returns the plugin instance
 */
export function createEdgehandles(cy: Core, config: EdgehandlesConfig = {}): any {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  loggingCustom(LogType.GRAPH_LOG, 'debug', 'Initializing edgehandles plugin');

  const eh = (cy as any).edgehandles({
    // CRITICAL: Specify which nodes can act as handles for drawing edges
    // 'node' selector means all nodes can be used as handles
    handleNodes: finalConfig.handleNodes,
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
    hoverDelay: finalConfig.hoverDelay,
    snap: finalConfig.snap,
    snapThreshold: finalConfig.snapThreshold,
    snapFrequency: finalConfig.snapFrequency,
    noEdgeEventsInDraw: finalConfig.noEdgeEventsInDraw,
    disableBrowserGestures: finalConfig.disableBrowserGestures,
  });

  // Start disabled - will be enabled via edgeModeEnabled prop
  eh.disable();
  eh.disableDrawMode();
  loggingCustom(LogType.GRAPH_LOG, 'debug', 'Edgehandles plugin initialized and disabled');

  return eh;
}

