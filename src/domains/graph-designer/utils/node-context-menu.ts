import type { GraphNodeData } from '../types';

/**
 * Helper function to extract node data from Cytoscape element
 */
function extractNodeData(element: any): GraphNodeData {
  const data = element.data();
  return {
    id: data.id,
    schemaId: data.schemaId,
    nodeId: data.nodeId || data.id, // Use nodeId from data, fallback to id
    title: data.title,
    incomplete: !!data.incomplete,
    // Cytoscape uses 'parent' for compound nodes
    parentId: data.parent ?? null,
    payload: data.payload ?? {},
  };
}

export interface ExtraNodeContextAction {
  label: string;
  action: (node: GraphNodeData) => void;
}

/**
 * Escape HTML for safe use in context menu content
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface NodeContextMenuOptions {
  /** When true, only show Delete (and extra actions); hide Edit and Select */
  hideSelectAndEdit?: boolean;
}

/**
 * Creates the node context menu configuration for Cytoscape
 */
export function createNodeContextMenu(
  onNodeContextAction: (action: 'edit' | 'delete' | 'select', node: GraphNodeData) => void,
  extraNodeContextActions?: ExtraNodeContextAction[],
  options?: NodeContextMenuOptions
) {
  const hideSelectAndEdit = options?.hideSelectAndEdit ?? false;

  const deleteCommand = {
    content: '<div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #ef4444;"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg><span style="font-weight: 500; color: #1e293b;">Delete</span></div>',
    select: (element: any) => {
      const node = extractNodeData(element);
      onNodeContextAction('delete', node);
    },
  };

  const commands: Array<{ content: string; select: (element: any) => void }> = hideSelectAndEdit
    ? [deleteCommand]
    : [
        {
          content: '<div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #6366f1;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg><span style="font-weight: 500; color: #1e293b;">Edit</span></div>',
          select: (element: any) => {
            const node = extractNodeData(element);
            onNodeContextAction('edit', node);
          },
        },
        {
          content: '<div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #8b5cf6;"><path d="M3 3h8v8H3z"></path><path d="M13 3h8v8h-8z"></path><path d="M3 13h8v8H3z"></path><path d="M13 17a4 4 0 1 1 8 0 4 4 0 1 1-8 0"></path></svg><span style="font-weight: 500; color: #1e293b;">Select</span></div>',
          select: (element: any) => {
            const node = extractNodeData(element);
            onNodeContextAction('select', node);
          },
        },
        deleteCommand,
      ];

  if (extraNodeContextActions?.length) {
    for (const extra of extraNodeContextActions) {
      commands.push({
        content: `<div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #0ea5e9;"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg><span style="font-weight: 500; color: #1e293b;">${escapeHtml(extra.label)}</span></div>`,
        select: (element: any) => {
          const node = extractNodeData(element);
          extra.action(node);
        },
      });
    }
  }

  return {
    selector: 'node',
    commands,
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

