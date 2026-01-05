'use client';

import React, { useCallback, useState } from 'react';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { DynamicActionButtons, type ActionConfig } from '@/gradian-ui/data-display/components/DynamicActionButtons';

type RelationActionCellProps = {
  itemId: string | number;
  relationId?: string | null;
  schemaId?: string; // Schema ID for constructing view URL
  onView?: (itemId: string | number) => void;
  onEdit?: (itemId: string | number) => void;
  onDeleted?: () => Promise<void> | void;
  onDeleteClick?: (relationId: string | number, itemId: string | number) => void;
  isDeletingLabel?: string;
};

/**
 * Reusable action cell for relation-based repeating tables.
 * Renders view/edit/delete actions when callbacks are provided,
 * using DynamicActionButtons for consistent styling with main pages.
 */
export function RelationActionCell({
  itemId,
  relationId,
  schemaId,
  onView,
  onEdit,
  onDeleted,
  onDeleteClick,
  isDeletingLabel = 'Deleting...',
}: RelationActionCellProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleView = useCallback(() => {
    onView?.(itemId);
  }, [itemId, onView]);

  const handleEdit = useCallback(() => {
    onEdit?.(itemId);
  }, [itemId, onEdit]);

  const handleDelete = useCallback(async () => {
    if (!relationId) return;
    if (onDeleteClick) {
      onDeleteClick(relationId, itemId);
      return;
    }
    try {
      setIsDeleting(true);
      const response = await apiRequest(`/api/relations/${relationId}`, {
        method: 'DELETE',
        callerName: 'RelationActionCell.deleteRelation',
      });

      if (!response.success) {
        console.error('Failed to delete relation:', response.error);
      } else {
        await onDeleted?.();
      }
    } catch (error) {
      console.error('Error deleting relation:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [itemId, onDeleteClick, onDeleted, relationId]);

  const actions: ActionConfig[] = [];

  if (onView) {
    actions.push({
      type: 'view',
      onClick: handleView,
      href: schemaId && itemId ? `/page/${schemaId}/${itemId}?showBack=true` : undefined,
      canOpenInNewTab: true,
    });
  }

  if (onEdit) {
    actions.push({
      type: 'edit',
      onClick: handleEdit,
    });
  }

  if (relationId && onDeleted) {
    actions.push({
      type: 'delete',
      onClick: handleDelete,
      disabled: isDeleting,
    });
  }

  if (actions.length === 0) {
    return null;
  }

  return (
    <DynamicActionButtons
      actions={actions}
      variant="minimal"
      stopPropagation={true}
    />
  );
}


