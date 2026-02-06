import type { GraphEdgeData } from '../types';

/**
 * Helper function to extract edge data from Cytoscape element
 */
function extractEdgeData(element: any): GraphEdgeData {
  const data = element.data();
  return {
    id: data.id,
    source: data.source,
    target: data.target,
    sourceSchema: data.sourceSchema,
    sourceId: data.sourceId,
    targetSchema: data.targetSchema,
    targetId: data.targetId,
    relationTypeId: data.relationTypeId,
    optional: data.optional,
  };
}

/**
 * Creates the edge context menu configuration for Cytoscape
 */
export function createEdgeContextMenu(
  onEdgeContextAction: (action: 'delete' | 'toggleOptional', edge: GraphEdgeData) => void
) {
  return {
    selector: 'edge',
    commands: [
      {
        content: '<div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #6366f1;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg><span style="font-weight: 500; color: #1e293b;">Toggle optional</span></div>',
        select: (element: any) => {
          const edge = extractEdgeData(element);
          onEdgeContextAction('toggleOptional', edge);
        },
      },
      {
        content: '<div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #ef4444;"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg><span style="font-weight: 500; color: #1e293b;">Delete</span></div>',
        select: (element: any) => {
          const edge = extractEdgeData(element);
          onEdgeContextAction('delete', edge);
        },
      },
    ],
    menuRadius: 100,
    indicatorSize: 28,
    activePadding: 12,
    itemColor: '#1e293b',
    itemTextShadow: false,
    fillColor: '#ffffff',
    activeFillColor: '#f8fafc',
    activeItemColor: '#6366f1',
    itemTextOutlineColor: 'transparent',
    openMenuEvents: 'cxttapstart taphold',
    zIndex: 9999,
    outsideMenuCancel: true, // Close menu when clicking outside
    adaptativeNodeSpotlightRadius: true, // Adapt spotlight radius based on node size
  };
}

