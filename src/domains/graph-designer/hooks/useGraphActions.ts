import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { GraphRecord } from '../types';
import { saveGraphRecord } from '../utils/graph-db';
import { validateGraph, formatValidationMessage } from '../utils/graph-validation';
import { apiRequest } from '@/gradian-ui/shared/utils/api';

export function useGraphActions(graph: GraphRecord | null) {
  const { mutate: saveGraph } = useMutation({
    mutationFn: async () => {
      if (!graph) return;
      
      // Save to IndexedDB first
      await saveGraphRecord(graph);
      
      // Then save to API
      const payload = {
        graphId: graph.id,
        nodes: graph.nodes,
        edges: graph.edges,
      };
      
      // Determine endpoint and method based on whether graph has an ID
      const endpoint = graph.id ? `/api/graph/${graph.id}` : '/api/graph';
      const method = graph.id ? 'PUT' : 'POST';
      
      const result = await apiRequest<{ success: boolean; data?: any; message?: string }>(endpoint, {
        method,
        body: payload,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save graph to server');
      }
      
      return result.data;
    },
  });

  const handleSave = useCallback(() => {
    // Validate graph before saving
    const validation = validateGraph(graph);
    
    if (!validation.valid) {
      // Show errors and prevent saving
      const errorMessage = formatValidationMessage(validation);
      toast.error('Cannot save graph: Validation failed', {
        description: errorMessage,
        duration: 8000,
      });
      return;
    }

    // Show warnings if any, but still allow saving
    if (validation.warnings.length > 0) {
      const warningMessage = validation.warnings
        .map((w, i) => `${i + 1}. ${w.message}`)
        .join('\n');
      toast.warning('Graph has warnings', {
        description: warningMessage,
        duration: 6000,
      });
    }

    // Proceed with save if validation passed
    saveGraph(undefined, {
      onSuccess: () => {
        toast.success('Graph saved successfully');
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to save graph');
      },
    });
  }, [graph, saveGraph]);

  return {
    handleSave,
  };
}

