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
      <div className="my-6 w-full min-w-0 overflow-x-auto">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto overflow-y-hidden">
          <table className="min-w-full border-collapse">
            {children ?? null}
          </table>
        </div>
      </div>
    );
  }

  const { headers, data } = parsed;
  const columns = createTableColumns(headers);
  const tableConfig = createTableConfig(columns, data);

  return (
    <div className="my-6 w-full min-w-0 overflow-x-auto">
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
    <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
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
    <th 
      className={cn(
      "px-4 py-3 text-start text-xs font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 last:border-r-0",
      className
    )}>
      {children ?? null}
    </th>
  );
}

/**
 * Format number with thousand separators
 */
function formatNumberWithSeparators(text: string): string {
  // Match numbers (integers or decimals) that are standalone
  // Only format if integer part has 4+ digits
  const numberPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d{4,}(?:\.\d+)?)/g;
  
  return text.replace(numberPattern, (match) => {
    // Skip if already has commas (already formatted)
    if (match.includes(',')) return match;
    
    // Check if it's a decimal number
    const hasDecimal = match.includes('.');
    const parts = hasDecimal ? match.split('.') : [match];
    const integerPart = parts[0];
    const decimalPart = parts[1] || '';
    
    // Only format if integer part has 4+ digits
    if (integerPart.length < 4) return match;
    
    // Add thousand separators to integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    return hasDecimal ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  });
}

/**
 * Recursively format numbers in React children
 */
function formatNumbersInChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      return formatNumberWithSeparators(child);
    }
    if (React.isValidElement(child)) {
      const props = child.props as { children?: React.ReactNode };
      if (props.children) {
        return React.cloneElement(child, {
          ...props,
          children: formatNumbersInChildren(props.children),
        } as any);
      }
      return child;
    }
    return child;
  });
}

export function TableCell({ children, className }: TableCellProps) {
  const formattedChildren = children ? formatNumbersInChildren(children) : null;
  
  return (
    <td className={cn(
      "p-3 text-xs text-gray-900 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700 last:border-r-0",
      className
    )}>
      {formattedChildren ?? null}
    </td>
  );
}

