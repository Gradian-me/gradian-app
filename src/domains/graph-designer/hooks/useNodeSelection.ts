import { useCallback, useState } from 'react';
import type { GraphNodeData } from '../types';

export function useNodeSelection() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeNodeForForm, setActiveNodeForForm] = useState<GraphNodeData | null>(null);

  const handleNodeClick = useCallback((node: GraphNodeData) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleEditNode = useCallback((node: GraphNodeData) => {
    setSelectedNodeId(node.id);
    setActiveNodeForForm(node);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setActiveNodeForForm(null);
  }, []);

  return {
    selectedNodeId,
    activeNodeForForm,
    setSelectedNodeId,
    setActiveNodeForForm,
    handleNodeClick,
    handleEditNode,
    clearSelection,
  };
}

