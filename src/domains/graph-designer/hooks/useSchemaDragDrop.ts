import { useCallback } from 'react';
import type { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import type { GraphNodeData } from '../types';

interface UseSchemaDragDropParams {
  schemas: FormSchema[];
  addNode: (input: { schemaId: string; title?: string; payload?: Record<string, unknown> }) => GraphNodeData | null;
  onNodeAdded?: (node: GraphNodeData) => void;
}

export function useSchemaDragDrop({
  schemas,
  addNode,
  onNodeAdded,
}: UseSchemaDragDropParams) {
  const handleDropOnCanvas = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/x-graph-schema');
      if (!raw) return;

      try {
        const payload = JSON.parse(raw) as { schemaId: string; name?: string };
        const schema = schemas.find((s) => s.id === payload.schemaId);
        const title =
          schema?.plural_name || schema?.singular_name || schema?.name || schema?.id || payload.name || 'Node';

        const newNode = addNode({
          schemaId: payload.schemaId,
          title,
        });
        if (newNode && onNodeAdded) {
          onNodeAdded(newNode);
        }
      } catch (error) {
        console.error('Failed to handle schema drop:', error);
      }
    },
    [addNode, schemas, onNodeAdded],
  );

  const handleDragOverCanvas = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleAddSchema = useCallback((schema: FormSchema) => {
    const title =
      schema.plural_name || schema.singular_name || schema.name || schema.id || 'Node';
    const newNode = addNode({
      schemaId: schema.id,
      title,
    });
    if (newNode && onNodeAdded) {
      onNodeAdded(newNode);
    }
  }, [addNode, onNodeAdded]);

  return {
    handleDropOnCanvas,
    handleDragOverCanvas,
    handleAddSchema,
  };
}

