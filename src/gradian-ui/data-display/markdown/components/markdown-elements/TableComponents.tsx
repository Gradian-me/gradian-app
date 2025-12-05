'use client';

import React from 'react';
import { cn } from '@/gradian-ui/shared/utils';
import { TableWrapper } from '../../../table/components/TableWrapper';
import { parseMarkdownTable, createTableColumns, createTableConfig } from '../../utils/tableParser';

export interface TableProps {
  node?: any;
  children?: React.ReactNode;
  [key: string]: any;
}

export interface TableBodyProps {
  children?: React.ReactNode;
  [key: string]: any;
}

export interface TableRowProps {
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}

export interface TableCellProps {
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}

export function Table({ node, children }: TableProps) {
  const parsed = parseMarkdownTable(node);
  
  if (!parsed) {
    // Fallback to default table rendering if parsing fails
    return (
      <div className="my-6">
        <div className="w-full m-2">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto overflow-y-hidden">
            <table className="min-w-full border-collapse">
              {children ?? null}
            </table>
          </div>
        </div>
      </div>
    );
  }
  
  const { headers, data } = parsed;
  const columns = createTableColumns(headers);
  const tableConfig = createTableConfig(columns, data);
  
  return (
    <div className="my-6">
      <TableWrapper
        tableConfig={tableConfig}
        columns={columns}
        data={data}
        showCards={false}
        disableAnimation={false}
      />
    </div>
  );
}

export function TableHead({ children }: { children?: React.ReactNode }) {
  return (
    <thead className="bg-gray-50/50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
      {children ?? null}
    </thead>
  );
}

export function TableBody({ children }: TableBodyProps) {
  // Apply zebra striping to rows
  const rows = React.Children.toArray(children);
  return (
    <tbody>
      {React.Children.map(rows, (child: any, index: number) => {
        if (React.isValidElement(child)) {
          const isEven = index % 2 === 0;
          const isLast = index === rows.length - 1;
          const rowClassName = cn(
            'transition-colors',
            isEven ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800',
            'hover:bg-gray-200 dark:hover:bg-gray-600',
            !isLast && 'border-b border-gray-200 dark:border-gray-700'
          );
          const existingClassName = (child.props as any)?.className;
          return React.cloneElement(child, {
            className: cn(existingClassName, rowClassName),
          } as any);
        }
        return child;
      })}
    </tbody>
  );
}

export function TableRow({ children, className }: TableRowProps) {
  return (
    <tr className={className}>
      {children ?? null}
    </tr>
  );
}

export function TableHeader({ children, className }: TableCellProps) {
  return (
    <th className={cn(
      "px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 last:border-r-0",
      className
    )}>
      {children ?? null}
    </th>
  );
}

export function TableCell({ children, className }: TableCellProps) {
  return (
    <td className={cn(
      "p-3 text-xs text-gray-900 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700 last:border-r-0",
      className
    )}>
      {children ?? null}
    </td>
  );
}

