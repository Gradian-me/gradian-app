import type cytoscape from 'cytoscape';

import type { GraphLayout } from '../types';

export const LAYOUTS: Record<GraphLayout, cytoscape.LayoutOptions> = {
  dagre: {
    name: 'dagre',
    rankDir: 'TB',
    nodeSep: 40,
    rankSep: 80,
    edgeSep: 20,
    animate: true,
    animationDuration: 800,
    animationEasing: 'ease-out',
  } as any,
  'dagre-lr': {
    name: 'dagre',
    rankDir: 'LR',
    nodeSep: 40,
    rankSep: 80,
    edgeSep: 20,
    animate: true,
    animationDuration: 800,
    animationEasing: 'ease-out',
  } as any,
  cose: {
    name: 'cose',
    animate: true,
    animationDuration: 1000,
    animationEasing: 'ease-out',
    idealEdgeLength: 100,
    nodeRepulsion: 4500,
    nestingFactor: 0.1,
    gravity: 0.25,
    numIter: 2500,
    initialEnergyOnIncremental: 0.3,
  } as any,
  breadthfirst: {
    name: 'breadthfirst',
    directed: true,
    padding: 30,
    spacingFactor: 1.2,
    animate: true,
    animationDuration: 800,
    animationEasing: 'ease-out',
  },
};


