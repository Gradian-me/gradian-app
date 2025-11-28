import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { cacheSchemaClientSide } from '@/gradian-ui/schema-manager/utils/schema-client-cache';
import type { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import type { NormalizedOption } from '@/gradian-ui/form-builder/form-elements/utils/option-normalizer';
import type { GraphNodeData } from '../types';

interface PickerState {
  isOpen: boolean;
  node: GraphNodeData | null;
  schema: FormSchema | null;
}

export function useNodePicker(
  updateNode: (node: GraphNodeData) => void,
  existingNodes?: GraphNodeData[]
) {
  const [pickerState, setPickerState] = useState<PickerState>({
    isOpen: false,
    node: null,
    schema: null,
  });
  const queryClient = useQueryClient();

  const openPicker = useCallback(async (node: GraphNodeData) => {
    try {
      const response = await apiRequest<FormSchema>(`/api/schemas/${node.schemaId}`);
      if (response.success && response.data) {
        await cacheSchemaClientSide(response.data, { queryClient, persist: false });
        setPickerState({
          isOpen: true,
          node,
          schema: response.data,
        });
      } else {
        toast.error('Failed to load schema');
      }
    } catch (error) {
      console.error('Error fetching schema:', error);
      toast.error('Failed to load schema');
    }
  }, [queryClient]);

  const closePicker = useCallback(() => {
    setPickerState({ isOpen: false, node: null, schema: null });
  }, []);

  const handleSelect = useCallback(async (
    selectedItems: NormalizedOption[],
    rawItems: any[]
  ) => {
    if (!pickerState.node || selectedItems.length === 0) {
      closePicker();
      return;
    }

    const selectedItem = rawItems?.[0] || selectedItems[0];
    if (!selectedItem?.id) {
      toast.error('Invalid selection');
      closePicker();
      return;
    }

    // Check if this entity ID (nodeId) is already linked to another node in the graph
    if (existingNodes) {
      const duplicateNode = existingNodes.find(
        (n) => n.nodeId === selectedItem.id && n.id !== pickerState.node?.id
      );
      if (duplicateNode) {
        toast.error(
          `This entity is already linked to node "${duplicateNode.title || duplicateNode.id}". Each entity can only be linked once.`
        );
        closePicker();
        return;
      }
    }

    // Fetch the full entity data
    try {
      const response = await apiRequest<any>(
        `/api/data/${pickerState.node.schemaId}/${selectedItem.id}`
      );

      if (response.success && response.data) {
        const entityData = response.data;
        const schema = pickerState.schema!;
        
        // Get title for the node
        const titleField = schema.fields?.find((f) => f.role === 'title');
        const title =
          (titleField ? entityData[titleField.name] : null) ||
          entityData.name ||
          entityData.title ||
          schema.plural_name ||
          schema.singular_name ||
          selectedItem.id;

        // Update the node with the selected entity's data
        // nodeId should be the selected entity's ID from the picker, not the graph node's ID
        const updatedNode: GraphNodeData = {
          ...pickerState.node,
          title,
          incomplete: false,
          nodeId: selectedItem.id, // nodeId is the selected entity's ID from the popup picker
          payload: {
            ...(pickerState.node.payload || {}), // Preserve existing payload
            ...entityData, // Add/update with entity data
            id: selectedItem.id, // Entity ID
          },
        };

        updateNode(updatedNode);
        toast.success('Node updated with selected data');
      } else {
        toast.error('Failed to load entity data');
      }
    } catch (error) {
      console.error('Error fetching entity data:', error);
      toast.error('Failed to load entity data');
    }

    closePicker();
  }, [pickerState.node, pickerState.schema, updateNode, closePicker]);

  return {
    pickerState,
    openPicker,
    closePicker,
    handleSelect,
  };
}

