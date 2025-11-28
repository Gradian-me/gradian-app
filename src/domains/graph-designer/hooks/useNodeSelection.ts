import { useCallback, useState } from 'react';
import type { GraphNodeData } from '../types';

export function useNodeSelection() {
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [activeNodeForForm, setActiveNodeForForm] = useState<GraphNodeData | null>(null);

  // For backward compatibility, return the first selected node ID or null
  const selectedNodeId = selectedNodeIds.size > 0 ? Array.from(selectedNodeIds)[0] : null;

  const handleNodeClick = useCallback((node: GraphNodeData, isMultiSelect: boolean) => {
    if (isMultiSelect) {
      // Toggle selection: if already selected, remove it; otherwise add it
      setSelectedNodeIds((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) {
          next.delete(node.id);
        } else {
          next.add(node.id);
        }
        return next;
      });
    } else {
      // Single select: replace selection with just this node
      setSelectedNodeIds(new Set([node.id]));
    }
  }, []);

  const handleEditNode = useCallback((node: GraphNodeData) => {
    setSelectedNodeIds(new Set([node.id]));
    setActiveNodeForForm(node);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeIds(new Set());
    setActiveNodeForForm(null);
  }, []);

  return {
    selectedNodeId,
    selectedNodeIds,
    activeNodeForForm,
    setSelectedNodeId: useCallback((id: string | null) => {
      setSelectedNodeIds(id ? new Set([id]) : new Set());
    }, []),
    setSelectedNodeIds,
    setActiveNodeForForm,
    handleNodeClick,
    handleEditNode,
    clearSelection,
  };
}

