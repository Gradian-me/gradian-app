'use client';

import React, { useCallback, useState } from 'react';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { HierarchyActionsMenu } from '@/gradian-ui/data-display/hierarchy/HierarchyActionsMenu';

type RelationActionCellProps = {
  itemId: string | number;
  relationId?: string | null;
  schemaId?: string; // Schema ID for constructing view URL
  onView?: (itemId: string | number) => void;
  onEdit?: (itemId: string | number) => void;
  onDeleted?: () => Promise<void> | void;
  onDeleteClick?: (relationId: string | number, itemId: string | number) => void;
  isDeletingLabel?: string;
  /** When set, only these actions are shown (e.g. from schema.permissions). Omit = show all. */
  permissions?: string[];
};

/**
 * Reusable action cell for relation-based repeating tables.
 * Renders view/edit/delete actions when callbacks are provided,
 * using HierarchyActionsMenu (shared ellipsis menu) for consistency with main pages.
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
  permissions,
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

  const viewHref = schemaId && itemId ? `/page/${schemaId}/${itemId}?showBack=true` : undefined;
  const hasView = Boolean(viewHref || onView);
  const hasEdit = Boolean(onEdit);
  const hasDelete = Boolean(relationId && (onDeleted || onDeleteClick));
  const hasAny = hasView || hasEdit || hasDelete;
  if (!hasAny) return null;

  return (
    <HierarchyActionsMenu
      stopPropagation
      outOfEllipsis={['view', 'edit']}
      permissions={permissions}
      viewHref={viewHref}
      onView={hasView && !viewHref ? handleView : undefined}
      onEdit={hasEdit ? handleEdit : undefined}
      onDelete={hasDelete && !isDeleting ? handleDelete : undefined}
    />
  );
}


