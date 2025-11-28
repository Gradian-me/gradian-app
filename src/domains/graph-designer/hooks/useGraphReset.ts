import { useCallback } from 'react';
import { toast } from 'sonner';
import type { GraphNodeData, GraphEdgeData } from '../types';

interface UseGraphResetParams {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  createNewGraph: () => void;
  onReset: () => void;
}

export function useGraphReset({ nodes, edges, createNewGraph, onReset }: UseGraphResetParams) {
  const handleReset = useCallback(() => {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    
    if (nodeCount === 0 && edgeCount === 0) {
      toast.info('Graph is already empty');
      return;
    }

    createNewGraph();
    onReset();
    toast.success('Graph reset to original state');
  }, [nodes.length, edges.length, createNewGraph, onReset]);

  return {
    handleReset,
  };
}

