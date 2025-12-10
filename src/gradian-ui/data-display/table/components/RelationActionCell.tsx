'use client';

import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { Loader2 } from 'lucide-react';

type RelationActionCellProps = {
  itemId: string | number;
  relationId?: string | null;
  onView?: (itemId: string | number) => void;
  onEdit?: (itemId: string | number) => void;
  onDeleted?: () => Promise<void> | void;
  isDeletingLabel?: string;
};

/**
 * Reusable action cell for relation-based repeating tables.
 * Renders view/edit/delete actions when callbacks are provided.
 */
export function RelationActionCell({
  itemId,
  relationId,
  onView,
  onEdit,
  onDeleted,
  isDeletingLabel = 'Deleting...',
}: RelationActionCellProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleView = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onView?.(itemId);
    },
    [itemId, onView]
  );

  const handleEdit = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onEdit?.(itemId);
    },
    [itemId, onEdit]
  );

  const handleDelete = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (!relationId) return;
      try {
        setIsDeleting(true);
        const response = await apiRequest(`/api/relations/${relationId}`, {
          method: 'DELETE',
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
    },
    [onDeleted, relationId]
  );

  return (
    <div className="flex items-center justify-center gap-1.5">
      {onView && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleView}
          className="h-8 w-8 p-0 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition-all duration-200"
          title="View details"
        >
          <IconRenderer iconName="Eye" className="h-4 w-4" />
        </Button>
      )}
      {onEdit && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleEdit}
          className="h-8 w-8 p-0 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-all duration-200"
          title="Edit"
        >
          <IconRenderer iconName="Edit" className="h-4 w-4" />
        </Button>
      )}
      {relationId && onDeleted && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleDelete}
          disabled={isDeleting}
          className="h-8 w-8 p-0 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition-all duration-200"
          title="Delete relation"
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" aria-label={isDeletingLabel} /> : <IconRenderer iconName="Trash" className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}


