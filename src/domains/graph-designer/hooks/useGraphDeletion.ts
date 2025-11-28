import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { GraphNodeData, GraphEdgeData } from '../types';

interface DeleteConfirmation {
  isOpen: boolean;
  type: 'node' | 'edge';
  item: GraphNodeData | GraphEdgeData | null;
}

export function useGraphDeletion(
  removeNode: (nodeId: string) => void,
  removeEdge: (edgeId: string) => void
) {
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    isOpen: false,
    type: 'node',
    item: null,
  });

  const openDeleteConfirmation = useCallback((type: 'node' | 'edge', item: GraphNodeData | GraphEdgeData) => {
    setDeleteConfirmation({
      isOpen: true,
      type,
      item,
    });
  }, []);

  const closeDeleteConfirmation = useCallback(() => {
    setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteConfirmation.item) {
      closeDeleteConfirmation();
      return;
    }

    if (deleteConfirmation.type === 'node') {
      removeNode((deleteConfirmation.item as GraphNodeData).id);
      toast.success('Node deleted');
    } else {
      removeEdge((deleteConfirmation.item as GraphEdgeData).id);
      toast.success('Edge deleted');
    }

    setDeleteConfirmation({ isOpen: false, type: 'node', item: null });
  }, [deleteConfirmation, removeNode, removeEdge, closeDeleteConfirmation]);

  return {
    deleteConfirmation,
    openDeleteConfirmation,
    closeDeleteConfirmation,
    confirmDelete,
  };
}

