import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { GraphRecord } from '../types';
import { saveGraphRecord } from '../utils/graph-db';
import { validateGraph, formatValidationMessage } from '../utils/graph-validation';

export function useGraphActions(graph: GraphRecord | null) {
  const { mutate: saveGraph } = useMutation({
    mutationFn: async () => {
      if (!graph) return;
      await saveGraphRecord(graph);
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
        toast.success('Graph saved locally');
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

