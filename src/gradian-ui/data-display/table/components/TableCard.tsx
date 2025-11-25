import React from 'react';
import { motion } from 'framer-motion';
import { TableColumn } from '../types';
import { getCellValue } from '../utils';
import { cn } from '../../../shared/utils';
import { extractLabels } from '../../../form-builder/form-elements/utils/option-normalizer';

export interface TableCardProps<T = any> {
  row: T;
  rowIndex: number;
  dataColumns: TableColumn<T>[];
  actionColumns: TableColumn<T>[];
  contentColumns?: 1 | 2 | 3;
  disableAnimation?: boolean;
}

export function TableCard<T = any>({
  row,
  rowIndex,
  dataColumns,
  actionColumns,
  contentColumns = 2,
  disableAnimation = false,
}: TableCardProps<T>) {
  const resolvedColumns = contentColumns ?? 2;

  const gridClasses = cn(
    'grid gap-2',
    resolvedColumns === 1 && 'grid-cols-1',
    resolvedColumns === 2 && 'grid-cols-2',
    resolvedColumns === 3 && 'grid-cols-2 lg:grid-cols-3'
  );

  return (
    <motion.div
      initial={disableAnimation ? false : { opacity: 0, y: 10 }}
      animate={disableAnimation ? false : { opacity: 1, y: 0 }}
      transition={disableAnimation ? {} : { duration: 0.2, delay: rowIndex * 0.05 }}
      className={cn(
        'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4',
        'hover:shadow-md transition-shadow'
      )}
    >
      <div className={gridClasses}>
        {dataColumns.map((column) => {
          const value = getCellValue(row, column);
          const cellContent = column.render
            ? column.render(value, row, rowIndex)
            : (() => {
                if (value === null || value === undefined) {
                  return '—';
                }
                const isStructured = Array.isArray(value) || (typeof value === 'object' && value !== null);
                if (isStructured) {
                  const labels = extractLabels(value);
                  if (labels.length > 0) {
                    return labels.join(', ');
                  }
                  if (Array.isArray(value)) {
                    return value.map(entry => {
                      if (entry && typeof entry === 'object') {
                        return entry.label || entry.name || entry.id || JSON.stringify(entry);
                      }
                      return String(entry);
                    }).join(', ');
                  }
                  return JSON.stringify(value);
                }
                return String(value);
              })();

          return (
            <div key={column.id} className="flex flex-col gap-1 min-w-0" dir="auto">
              <span className="text-sm font-medium text-gray-400 dark:text-gray-400">{column.label}:</span>
              <div className="text-sm text-gray-900 dark:text-gray-100 wrap-break-word min-w-0" dir="auto">{cellContent}</div>
            </div>
          );
        })}
      </div>

      {actionColumns.length > 0 && (
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          {actionColumns.map((column) => {
            const value = getCellValue(row, column);
            return (
              <div key={column.id}>
                {column.render ? column.render(value, row, rowIndex) : null}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

TableCard.displayName = 'TableCard';


