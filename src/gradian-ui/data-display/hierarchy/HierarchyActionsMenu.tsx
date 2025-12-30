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
import { useTheme } from 'next-themes';
import { cn } from '@/gradian-ui/shared/utils';

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const hasAnyAction = onAddChild || onEdit || onDelete || (onChangeParent && hasParent);
  if (!hasAnyAction) {
    return null;
  }

  const menuContentClasses = cn(
    'z-50 overflow-hidden rounded-xl border p-1 shadow-lg',
    'w-44',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
    'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
    "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-100 dark:text-gray-900"
  );

  const itemClasses = cn(
    'relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm outline-none transition-colors',
    'hover:bg-violet-50 focus:bg-violet-50 text-gray-800 dark:hover:bg-violet-500/10 dark:focus:bg-violet-500/10 dark:text-gray-200'
  );

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
      <DropdownMenuContent align="end" className={menuContentClasses}>
        {onAddChild && (
          <DropdownMenuItem onClick={onAddChild} className={itemClasses}>
            <Plus className="me-3 h-4 w-4" />
            <span>Add child</span>
          </DropdownMenuItem>
        )}
        {onChangeParent && hasParent && (
          <DropdownMenuItem onClick={onChangeParent} className={itemClasses}>
            <ArrowRightLeft className="me-3 h-4 w-4" />
            <span>Change parent</span>
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={onEdit} className={itemClasses}>
            <Pencil className="me-3 h-4 w-4" />
            <span>Edit</span>
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            className={cn(
              itemClasses,
              'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 focus:bg-red-50 dark:focus:bg-red-500/10'
            )}
          >
            <Trash2 className="me-3 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

HierarchyActionsMenu.displayName = 'HierarchyActionsMenu';


