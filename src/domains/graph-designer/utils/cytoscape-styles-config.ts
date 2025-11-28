import type { StylesheetCSS } from 'cytoscape';

/**
 * Cytoscape stylesheet configuration for graph visualization
 * Defines styles for nodes, edges, and various states
 */
export const GRAPH_STYLES: StylesheetCSS[] = [
  {
    selector: 'node',
    style: {
      shape: 'round-rectangle',
      'background-color': '#f9f5ff', // violet-50
      'background-opacity': 0.95,
      label: 'data(title)',
      color: '#1e293b', // slate-800
      events: 'yes', // Required for edgehandles to work
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': 9.5,
      'text-wrap': 'wrap',
      'text-max-width': 80 as any,
      width: 76 as any,
      height: 46 as any,
      'border-width': 2,
      'border-color': '#8b5cf6', // violet-500
      'border-opacity': 0.9,
      padding: 5 as any,
      'shadow-blur': 8,
      'shadow-opacity': 0.12,
      'shadow-color': '#4c1d95',
      'shadow-offset-x': 0,
      'shadow-offset-y': 2,
    } as any,
  },
  {
    // Parent/group nodes (compound) - minimal style
    selector: 'node:parent',
    style: {
      shape: 'round-rectangle',
      'background-color': 'transparent',
      'background-opacity': 0,
      'border-color': '#cbd5e1', // slate-300
      'border-width': 1,
      'border-style': 'dashed',
      'border-opacity': 0.5,
      padding: 8 as any,
      'text-valign': 'top',
      'text-halign': 'center',
      'text-margin-y': -4,
      'font-size': 10,
      'font-weight': 500,
      color: '#64748b', // slate-500
      'shadow-blur': 0,
      'shadow-opacity': 0,
    } as any,
  },
  {
    selector: 'node[incomplete = 1]',
    style: {
      'border-style': 'dashed',
      'border-color': '#f97316', // orange-500
      'border-width': 3,
      'background-color': '#fff7ed', // orange-50
      'border-opacity': 1,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': '#6366f1', // indigo-500
      'target-arrow-color': '#06b6d4', // cyan-500
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
    },
  },
  {
    selector: 'node:selected',
    style: {
      'border-style': 'solid',
      'border-color': '#ef4444', // red-500
      'border-width': 3,
    },
  },
  {
    selector: 'edge:selected',
    style: {
      'line-color': '#f97316',
      'target-arrow-color': '#f97316',
    },
  },
  // Edgehandles extension styles
  {
    selector: 'node.eh-source',
    style: {
      'border-color': '#6366f1', // indigo-500
      'border-width': 3,
    },
  },
  {
    selector: 'node.eh-target',
    style: {
      'border-color': '#06b6d4', // cyan-500
      'border-width': 3,
    },
  },
  {
    selector: 'node.eh-hover',
    style: {
      'border-color': '#06b6d4', // cyan-500
      'border-width': 3,
      'border-opacity': 0.8,
    },
  },
  {
    selector: 'node.eh-presumptive-target',
    style: {
      'border-color': '#06b6d4', // cyan-500
      'border-width': 2,
      'border-opacity': 0.6,
    },
  },
  {
    selector: 'edge.eh-preview',
    style: {
      'line-color': '#06b6d4', // cyan-500
      'target-arrow-color': '#06b6d4',
      'line-style': 'dashed',
      'line-dash-pattern': [6, 3],
      opacity: 0.7,
    },
  },
  {
    selector: 'edge.eh-ghost-edge',
    style: {
      'line-color': '#6366f1', // indigo-500
      'target-arrow-color': '#6366f1',
      'line-style': 'dashed',
      'line-dash-pattern': [4, 4],
      opacity: 0.5,
    },
  },
];

