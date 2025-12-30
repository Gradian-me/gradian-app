import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TableColumn } from '../types';
import { getCellValue } from '../utils';
import { cn } from '../../../shared/utils';
import { extractLabels } from '../../../form-builder/form-elements/utils/option-normalizer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CopyContent } from '../../../form-builder/form-elements/components/CopyContent';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<{ fieldName: string; content: string; isJson?: boolean } | null>(null);
  
  const resolvedColumns = contentColumns ?? 2;

  // Helper function to truncate text to 200 characters
  const truncateText = (text: string, maxChars: number = 200): string => {
    if (!text) return '';
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars) + '...';
  };

  const handleShowMore = (fieldName: string, content: string, e: React.MouseEvent, isJson: boolean = false) => {
    e.stopPropagation();
    setDialogContent({ fieldName, content, isJson });
    setDialogOpen(true);
  };

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
                let isStructured = false;
                let isJson = false;
                let textValue: string;
                
                isStructured = Array.isArray(value) || (typeof value === 'object' && value !== null);
                if (isStructured) {
                  const labels = extractLabels(value);
                  if (labels.length > 0) {
                    textValue = labels.join(', ');
                  } else if (Array.isArray(value)) {
                    textValue = value.map(entry => {
                      if (entry && typeof entry === 'object') {
                        return entry.label || entry.name || entry.id || JSON.stringify(entry);
                      }
                      return String(entry);
                    }).join(', ');
                  } else {
                    // For objects, stringify with formatting
                    textValue = JSON.stringify(value, null, 2);
                    isJson = true;
                  }
                } else {
                  textValue = String(value);
                }
                
                // Check if JSON string is too long (more than 200 characters)
                const shouldTruncateJson = isJson && textValue.length > 200;
                const truncatedJson = shouldTruncateJson ? truncateText(textValue, 200) : null;
                
                if (shouldTruncateJson) {
                  return (
                    <div className="space-y-1">
                      <div className="text-sm text-gray-900 dark:text-gray-100 font-mono whitespace-pre-wrap wrap-break-word">
                        {truncatedJson}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleShowMore(column.label, textValue, e, true)}
                        className="text-xs text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300 underline font-medium"
                      >
                        Show more
                      </button>
                    </div>
                  );
                }
                
                return textValue;
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
      
      {/* Dialog for showing full JSON content */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={cn(
          "max-w-4xl max-h-[85vh] overflow-hidden flex flex-col",
          dialogContent?.isJson && "max-w-5xl"
        )}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{dialogContent?.fieldName || 'Content'}</DialogTitle>
              {dialogContent && (
                <CopyContent content={dialogContent.content} />
              )}
            </div>
          </DialogHeader>
          <div className="mt-4 flex-1 overflow-auto">
            {dialogContent?.isJson ? (
              <CodeViewer
                code={dialogContent.content}
                programmingLanguage="json"
                title={dialogContent.fieldName}
                initialLineNumbers={20}
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                {dialogContent?.content || ''}
              </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

TableCard.displayName = 'TableCard';


