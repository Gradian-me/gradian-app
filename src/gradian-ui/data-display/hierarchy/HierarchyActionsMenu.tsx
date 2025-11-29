'use client';

import React from 'react';
import { MoreVertical, Plus, Pencil, Trash2, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface HierarchyActionsMenuProps {
  onAddChild?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onChangeParent?: () => void;
  hasParent?: boolean;
}

export const HierarchyActionsMenu: React.FC<HierarchyActionsMenuProps> = ({
  onAddChild,
  onEdit,
  onDelete,
  onChangeParent,
  hasParent = false,
}) => {
  const hasAnyAction = onAddChild || onEdit || onDelete || (onChangeParent && hasParent);
  if (!hasAnyAction) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-gray-800"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {onAddChild && (
          <DropdownMenuItem onClick={onAddChild}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Add child</span>
          </DropdownMenuItem>
        )}
        {onChangeParent && hasParent && (
          <DropdownMenuItem onClick={onChangeParent}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            <span>Change parent</span>
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            <span>Edit</span>
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

HierarchyActionsMenu.displayName = 'HierarchyActionsMenu';


