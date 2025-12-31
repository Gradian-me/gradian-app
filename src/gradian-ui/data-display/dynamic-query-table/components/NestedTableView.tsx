'use client';

import React, { useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/gradian-ui/shared/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NestedTableViewProps } from '../types';
import { createColumnsFromSchema } from '../utils';
import { useNestedTableExpansion } from '../hooks';
import { TableColumn } from '../../table/types';
// Import will be handled via forward reference

export function NestedTableView({ 
  data, 
  schema, 
  schemas, 
  depth = 0, 
  highlightQuery, 
  expandAllTrigger = 0, 
  onExpandAll, 
  onCollapseAll, 
  showFlattenSwitch, 
  flatten, 
  onFlattenChange,
  showIds = false
}: NestedTableViewProps) {
  const columns = useMemo(() => {
    const allColumns = createColumnsFromSchema(schema, highlightQuery);
    
    // Filter out ID fields when showIds is false
    let filteredColumns = allColumns;
    if (!showIds) {
      filteredColumns = allColumns.filter(col => {
        const fieldName = col.field?.name || col.id;
        return fieldName?.toLowerCase() !== 'id';
      });
    }
    
    // Add ID column as first column when showIds is true
    if (showIds) {
      // Check if there's already an ID column
      const hasIdColumn = filteredColumns.some(col => {
        const fieldName = col.field?.name || col.id;
        return fieldName?.toLowerCase() === 'id';
      });
      
      if (!hasIdColumn) {
        // Create an ID column
        const idColumn: TableColumn = {
          id: 'id',
          label: 'ID',
          accessor: (row: any) => row?.id || '',
          sortable: false,
          align: 'left' as const,
          allowWrap: false,
          field: { id: 'id', name: 'id', label: 'ID', component: 'text' },
          render: (value: any) => {
            return <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{value || '—'}</span>;
          },
        };
        filteredColumns = [idColumn, ...filteredColumns];
      } else {
        // Move existing ID column to the front
        const idColumnIndex = filteredColumns.findIndex(col => {
          const fieldName = col.field?.name || col.id;
          return fieldName?.toLowerCase() === 'id';
        });
        if (idColumnIndex > 0) {
          const idColumn = filteredColumns[idColumnIndex];
          filteredColumns = [idColumn, ...filteredColumns.filter((_, i) => i !== idColumnIndex)];
        }
      }
    }
    
    return filteredColumns;
  }, [schema, highlightQuery, showIds]);
  
  const { expandedRows, toggleRow, expandAll, collapseAll } = useNestedTableExpansion(data, expandAllTrigger);

  const handleExpandAll = () => {
    expandAll();
    // Call parent expand all to propagate to root
    if (onExpandAll) {
      onExpandAll();
    }
  };

  const handleCollapseAll = () => {
    collapseAll();
    if (onCollapseAll) {
      onCollapseAll();
    }
  };

  if (!data || data.length === 0) {
    return <div className="text-sm text-gray-400 dark:text-gray-500 py-2">No data</div>;
  }

  return (
    <div className="w-full">
      {/* Toolbar removed - all controls (flatten switch, expand/collapse) are now in DynamicFilterPane */}

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto overflow-y-hidden w-full">
        <table className="border-collapse" style={{ tableLayout: 'auto', width: '-webkit-fill-available' }}>
          <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="w-10 px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200"></th>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const children = Array.isArray(row.children) ? row.children : [];
              const hasNestedData = children.length > 0;
              const isExpanded = expandedRows.has(index);
              
              // Get child schema labels for tooltip
              const getChildSchemaLabels = () => {
                if (!hasNestedData) return null;
                
                const childSchemaLabels = new Set<string>();
                children.forEach((childItem: any) => {
                  const childSchemaId = childItem.schema;
                  if (!childSchemaId) return;
                  
                  const matchingSchema = schemas.find(
                    (s) => s.id === childSchemaId || s.id === childSchemaId.replace(/-/g, '')
                  ) || schemas.find(
                    (s) => childSchemaId.includes(s.id) || s.id.includes(childSchemaId.replace(/-/g, ''))
                  );
                  
                  if (matchingSchema) {
                    childSchemaLabels.add(matchingSchema.label || matchingSchema.id);
                  } else {
                    childSchemaLabels.add(childSchemaId);
                  }
                });
                
                return Array.from(childSchemaLabels);
              };
              
              const childSchemaLabels = getChildSchemaLabels();
              const tooltipText = childSchemaLabels && childSchemaLabels.length > 0
                ? childSchemaLabels.join(', ')
                : (schema.label || schema.id);
              
              return (
                <React.Fragment key={row.id || index}>
                  <tr
                    className={cn(
                      'transition-colors border-b border-gray-200 dark:border-gray-700',
                      index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900',
                      'hover:bg-gray-200 dark:hover:bg-gray-600'
                    )}
                  >
                    <td className="p-3">
                      {hasNestedData ? (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => toggleRow(index)}
                                className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={4}>
                              {tooltipText}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="w-6 h-6" />
                      )}
                    </td>
                    {columns.map((column) => {
                      const value = typeof column.accessor === 'function' ? column.accessor(row) : row[column.accessor as string];
                      return (
                        <td
                          key={column.id}
                          className={cn(
                            'p-3 text-xs text-gray-900 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700 last:border-r-0',
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right'
                          )}
                        >
                          {column.render ? column.render(value, row, index) : <span>{String(value ?? '—')}</span>}
                        </td>
                      );
                    })}
                  </tr>
                  <AnimatePresence>
                    {isExpanded && hasNestedData && (
                      <tr className="bg-gray-50/30 dark:bg-gray-800/20">
                        <td colSpan={columns.length + 1} className="p-0 border-b border-gray-200 dark:border-gray-700">
                          <motion.div
                            key={`expanded-${row.id || index}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 border-l-4 border-violet-300 dark:border-violet-400 bg-white dark:bg-gray-900/50">
                              {children.map((childItem: any, childIndex: number) => {
                                const childSchemaId = childItem.schema;
                                const childData = Array.isArray(childItem.data) ? childItem.data : [];

                                if (!childSchemaId || childData.length === 0) {
                                  return null;
                                }

                                const matchingSchema = schemas.find(
                                  (s) => s.id === childSchemaId || s.id === childSchemaId.replace(/-/g, '')
                                ) || schemas.find(
                                  (s) => childSchemaId.includes(s.id) || s.id.includes(childSchemaId.replace(/-/g, ''))
                                );

                                if (!matchingSchema) {
                                  return (
                                    <div key={`${childSchemaId}-${childIndex}`} className="text-sm text-gray-400 dark:text-gray-500 py-2">
                                      Schema not found for {childSchemaId}
                                    </div>
                                  );
                                }

                                return (
                                  <div key={`${childSchemaId}-${childIndex}`} className="mb-4 last:mb-0">
                                    <div className="px-3 py-2 rounded-md mb-3 font-semibold text-sm bg-violet-100 dark:bg-violet-900/40 text-violet-900 dark:text-violet-100 inline-block">
                                      {matchingSchema.label || childSchemaId}
                                    </div>
                                    <NestedTableView
                                      data={childData}
                                      schema={matchingSchema}
                                      schemas={schemas}
                                      depth={depth + 1}
                                      highlightQuery={highlightQuery}
                                      expandAllTrigger={expandAllTrigger}
                                      onExpandAll={onExpandAll}
                                      onCollapseAll={onCollapseAll}
                                      showIds={showIds}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

