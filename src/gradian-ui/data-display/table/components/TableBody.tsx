// Table Body Component

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TableColumn } from '../types';
import { getCellValue } from '../utils';
import { cn } from '../../../shared/utils';
import { extractLabels } from '../../../form-builder/form-elements/utils/option-normalizer';
import { renderHighlightedText } from '@/gradian-ui/shared/utils/highlighter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CopyContent } from '../../../form-builder/form-elements/components/CopyContent';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';

export interface TableBodyProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  selectedRows: Set<number>;
  onRowClick?: (row: T, index: number) => void;
  onCellClick?: (value: any, row: T, column: TableColumn<T>, index: number) => void;
  onRowSelect?: (index: number) => void;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  selectionEnabled?: boolean;
  highlightQuery?: string;
}

export function TableBody<T = any>({
  data,
  columns,
  selectedRows,
  onRowClick,
  onCellClick,
  onRowSelect,
  striped,
  hoverable,
  bordered,
  selectionEnabled,
  highlightQuery,
}: TableBodyProps<T>) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<{ fieldName: string; content: string; isJson?: boolean } | null>(null);

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

  const applyHighlight = (node: React.ReactNode): React.ReactNode => {
    if (!highlightQuery || node === null || node === undefined || typeof node === 'boolean') {
      return node;
    }

    if (typeof node === 'string' || typeof node === 'number') {
      return renderHighlightedText(String(node), highlightQuery);
    }

    if (Array.isArray(node)) {
      return node.map((child) => applyHighlight(child));
    }

    if (React.isValidElement(node)) {
      // Avoid double-highlighting content that already handles its own highlighting (like CodeBadge)
      const elementType: any = node.type;
      if (elementType && (elementType.displayName === 'CodeBadge' || elementType.name === 'CodeBadge')) {
        return node;
      }
      const props = node.props as { children?: React.ReactNode };
      const highlightedChildren = React.Children.map(
        props.children,
        (child) => applyHighlight(child)
      );

      if (highlightedChildren === props.children) {
        return node;
      }

      return React.cloneElement(node, props, highlightedChildren);
    }

    return node;
  };
  const trClasses = (index: number, isSelected: boolean, row: T) => {
    const isIncomplete = (row as any)?.incomplete === true;
    return cn(
      'transition-colors',
      // Amber background for incomplete rows (takes priority over striped)
      isIncomplete && 'bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-l-amber-400 dark:border-l-amber-500',
      // Striped rows (only if not incomplete)
      !isIncomplete && striped && index % 2 === 1 && 'bg-gray-50 dark:bg-gray-800',
      !isIncomplete && striped && index % 2 === 0 && 'bg-white dark:bg-gray-900',
      hoverable && 'hover:bg-gray-200 dark:hover:bg-gray-600',
      isIncomplete && hoverable && 'hover:bg-amber-100/60 dark:hover:bg-amber-950/30',
      hoverable && onRowClick && 'cursor-pointer',
      isSelected && 'bg-blue-50',
      bordered && 'border-b border-gray-200 dark:border-gray-700'
    );
  };

  const tdClasses = (column: TableColumn<T>, rowIndex: number, isSelected: boolean, row: T) => {
    const isIncomplete = (row as any)?.incomplete === true;
    return cn(
      'p-3 text-xs text-gray-900 dark:text-gray-200',
      // Use better word breaking for columns with maxWidth - break on words, not characters
      column.maxWidth && 'wrap-break-word',
      column.align === 'center' && 'text-center',
      (column.align === 'left' || !column.align) && 'text-start',
      column.align === 'right' && 'text-end',
      // For sticky columns, match the row background for zebra striping, selection, and incomplete
      column.sticky === 'left' && 'sticky left-0 rtl:left-auto rtl:right-0 z-10',
      column.sticky === 'right' && 'sticky right-0 rtl:right-auto rtl:left-0 z-10',
      // Set background for sticky columns based on row state (selected > incomplete > striped > default)
      column.sticky === 'left' && (isSelected ? 'bg-blue-50' : (isIncomplete ? 'bg-amber-50/50 dark:bg-amber-950/20' : (striped && rowIndex % 2 === 1 ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'))),
      column.sticky === 'right' && (isSelected ? 'bg-blue-50' : (isIncomplete ? 'bg-amber-50/50 dark:bg-amber-950/20' : (striped && rowIndex % 2 === 1 ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'))),
      // For non-sticky columns, use transparent to show row background
      !column.sticky && striped && 'bg-transparent',
      bordered && 'border-r border-gray-200 dark:border-gray-700 last:border-r-0 rtl:border-r-0 rtl:border-l rtl:last:border-l-0'
    );
  };

  const handleRowClick = (row: T, index: number) => {
    if (onRowClick) {
      onRowClick(row, index);
    }
  };

  const handleCellClick = (
    value: any,
    row: T,
    column: TableColumn<T>,
    index: number
  ) => {
    if (onCellClick) {
      onCellClick(value, row, column, index);
    }
  };

  const handleRowSelect = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRowSelect) {
      onRowSelect(index);
    }
  };

  return (
    <tbody>
      {data.map((row, rowIndex) => {
        const isSelected = selectedRows.has(rowIndex);
        return (
          <motion.tr
            key={rowIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.2,
              delay: Math.min(rowIndex * 0.02, 0.3),
              ease: 'easeOut',
            }}
            className={trClasses(rowIndex, isSelected, row)}
            onClick={() => handleRowClick(row, rowIndex)}
          >
            {selectionEnabled && (
              <td className="w-12 px-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  onClick={(e) => handleRowSelect(rowIndex, e)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </td>
            )}
            {columns.map((column) => {
              const value = getCellValue(row, column);
              const cellClassName =
                typeof column.cellClassName === 'function'
                  ? column.cellClassName(row, rowIndex)
                  : column.cellClassName;

              // Allow wrapping when explicitly enabled or when maxWidth is provided (backward compatible)
              const shouldAllowWrapping = column.allowWrap ?? !!column.maxWidth;

              // Check if this is a textarea field with long content (more than 200 characters)
              const isTextarea = column.field?.component === 'textarea';
              const textValue = isTextarea && value ? String(value) : null;
              const shouldTruncate = isTextarea && textValue && textValue.length > 200;
              const truncatedText = shouldTruncate ? truncateText(textValue!, 200) : null;

              return (
                <td
                  key={column.id}
                  className={cn(tdClasses(column, rowIndex, isSelected, row), cellClassName)}
                  style={{
                    // Only set width if explicitly provided, otherwise let content determine width
                    width: column.width ? (typeof column.width === 'number' ? `${column.width}px` : column.width) : undefined,
                    // Only set maxWidth to prevent columns from being too wide
                    maxWidth: column.maxWidth ? `${column.maxWidth}px` : undefined,
                    // Actions column should always be middle-aligned, others with maxWidth should be top-aligned for wrapping
                    verticalAlign: column.id === 'actions' ? 'middle' : (shouldAllowWrapping ? 'top' : 'middle'),
                    // Ensure width constraints are strictly applied
                    boxSizing: 'border-box',
                    // Better word breaking for wrapped text
                    wordBreak: shouldAllowWrapping ? 'break-word' : 'normal',
                    overflowWrap: shouldAllowWrapping ? 'break-word' : 'normal',
                    // Allow wrapping for badge columns or columns with maxWidth
                    whiteSpace: shouldAllowWrapping ? 'normal' : 'nowrap',
                    // Prevent horizontal overflow, allow vertical growth for wrapped content
                    overflowX: 'hidden',
                    overflowY: shouldAllowWrapping ? 'visible' : 'hidden',
                  }}
                  onClick={() => handleCellClick(value, row, column, rowIndex)}
                >
                  <div 
                    className={shouldAllowWrapping ? "min-w-0 w-full" : ""} // Allow shrinking and full width if wrapping is allowed
                    style={{
                      // Limit to 3 lines max for wrapped text columns with ellipsis
                      // For badge columns, we rely on BadgeViewer's flex-wrap to handle wrapping
                      ...(column.maxWidth ? {
                        // Don't apply line clamp - let content wrap naturally
                        overflow: 'visible',
                      } : {})
                    }}
                >
                  {column.render ? (
                    shouldTruncate ? (
                      <div className="space-y-1" dir="auto">
                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap" dir="auto">
                          {truncatedText}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleShowMore(column.label, textValue!, e)}
                          className="text-xs text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300 underline font-medium"
                        >
                          Show more
                        </button>
                      </div>
                    ) : (
                      applyHighlight(column.render(value, row, rowIndex))
                    )
                  ) : (
                    <span className="block" dir="auto">
                      {(() => {
                        let textValue: string;
                        let isStructured = false;
                        let isJson = false;
                        const originalValue: any = value;
                        
                        if (value === null || value === undefined) {
                          textValue = '—';
                        } else {
                          isStructured = Array.isArray(value) || (typeof value === 'object' && value !== null);
                          if (isStructured) {
                            const labels = extractLabels(value);
                            if (labels.length > 0) {
                              textValue = labels.join(', ');
                            } else if (Array.isArray(value)) {
                              textValue = value
                                .map((entry) => {
                                  if (entry && typeof entry === 'object') {
                                    return entry.label || entry.name || entry.id || JSON.stringify(entry);
                                  }
                                  return String(entry);
                                })
                                .join(', ');
                            } else {
                              // For objects, stringify with formatting
                              textValue = JSON.stringify(value, null, 2);
                              isJson = true;
                            }
                          } else {
                            textValue = String(value);
                          }
                        }
                        
                        // Check if JSON string is too long (more than 200 characters)
                        const shouldTruncateJson = isJson && textValue.length > 200;
                        const truncatedJson = shouldTruncateJson ? truncateText(textValue, 200) : null;
                        
                        if (shouldTruncateJson) {
                          return (
                            <div className="space-y-1" dir="auto">
                              <div className="text-sm text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap wrap-break-word" dir="auto">
                                {applyHighlight(truncatedJson!)}
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
                        
                        return applyHighlight(textValue);
                      })()}
                    </span>
                  )}
                  </div>
                </td>
              );
            })}
          </motion.tr>
        );
      })}
      {/* Dialog for showing full content (textarea or JSON) */}
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
    </tbody>
  );
}

TableBody.displayName = 'TableBody';

