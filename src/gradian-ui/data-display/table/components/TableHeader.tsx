// Table Header Component

import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { TableColumn } from '../types'; 
import { cn } from '../../../shared/utils';

export interface TableHeaderProps<T = any> {
  columns: TableColumn<T>[];
  sortBy?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnId: string) => void;
  stickyHeader?: boolean;
  selectionEnabled?: boolean;
  allSelected?: boolean;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  striped?: boolean;
  bordered?: boolean;
}

export function TableHeader<T = any>({
  columns,
  sortBy,
  sortDirection,
  onSort,
  stickyHeader,
  selectionEnabled,
  allSelected,
  onSelectAll,
  onClearSelection,
  striped,
  bordered,
}: TableHeaderProps<T>) {
  const headerClasses = cn(
    'bg-gray-50/50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700',
    striped && 'bg-gray-50/50',
    bordered && 'border-b border-gray-100'
  );

  const thClasses = (column: TableColumn<T>) =>
    cn(
      'text-left text-xs font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider',
      column.align === 'center' && 'text-center',
      column.align === 'right' && 'text-right',
      column.sortable && onSort && 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700',
      column.sticky === 'left' && 'sticky left-0 z-10 bg-gray-50/50 dark:bg-gray-700',
      column.sticky === 'right' && 'sticky right-0 z-10 bg-gray-50/50 dark:bg-gray-700',
      stickyHeader && 'sticky top-0 z-20',
      bordered && 'border-r border-gray-200 dark:border-gray-700 last:border-r-0',
      // Match padding with td cells - use same padding as TableBody
      'px-4 py-3'
    );

  const handleHeaderClick = (column: TableColumn<T>) => {
    if (column.sortable && onSort) {
      onSort(column.id);
    }
  };

  const handleSelectAllClick = () => {
    if (allSelected) {
      onClearSelection?.();
    } else {
      onSelectAll?.();
    }
  };

  return (
    <thead className={headerClasses}>
      <tr>
        {selectionEnabled && (
          <th className={cn('w-12 px-2 bg-gray-50/50', stickyHeader && 'sticky top-0 z-20')}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={handleSelectAllClick}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </th>
        )}
        {columns.map((column) => (
          <th
            key={column.id}
            className={thClasses(column)}
            dir="auto"
            style={{
              // Only set width if explicitly provided, otherwise let content determine width
              width: column.width ? (typeof column.width === 'number' ? `${column.width}px` : column.width) : undefined,
              // Only set maxWidth to prevent columns from being too wide
              maxWidth: column.maxWidth ? `${column.maxWidth}px` : undefined,
              // Ensure width constraints are strictly applied
              boxSizing: 'border-box',
              // Use white-space nowrap for headers without maxWidth to prevent wrapping
              whiteSpace: column.maxWidth ? 'normal' : 'nowrap',
            }}
            onClick={() => handleHeaderClick(column)}
          >
            <div className={cn(
              "flex items-center gap-2",
              column.align === 'center' && "justify-center",
              column.align === 'right' && "justify-end",
              column.align === 'left' && "justify-between"
            )}>
              {column.headerRender ? (
                column.headerRender()
              ) : (
                <span>{column.label}</span>
              )}
              {column.sortable && onSort && column.align !== 'right' && (
                <span className="shrink-0">
                  {sortBy === column.id ? (
                    sortDirection === 'asc' ? (
                      <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    )
                  ) : (
                    <ChevronsUpDown className="h-4 w-4 text-gray-400 dark:text-gray-400" />
                  )}
                </span>
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
}

TableHeader.displayName = 'TableHeader';

