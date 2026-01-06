'use client';

import React, { useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/gradian-ui/shared/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NestedTableViewProps, Schema, ColumnGroup, FlattenedSchemasConfig } from '../types';
import { createColumnsFromSchema, getSchemaHeaderBorderColor, getBorderColorClasses, createColumnToGroupInfoMap, getActionButtonsForSchema } from '../utils';
import { useNestedTableExpansion } from '../hooks';
import { TableColumn } from '../../table/types';
import { formatFieldValue } from '../../table/utils/field-formatters';
import { DynamicActionButtons } from '@/gradian-ui/data-display/components/DynamicActionButtons';
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
  showIds = false,
  flattenedSchemas = [],
  dynamicQueryActions,
  dynamicQueryId,
  onEditEntity
}: NestedTableViewProps) {
  // Helper function to check if a schema ID is in flattenedSchemas at the current depth
  const isSchemaFlattened = useCallback((schemaId: string, currentDepth: number): boolean => {
    if (!flattenedSchemas || flattenedSchemas.length === 0) return false;
    
    // Detect structure type
    const firstItem = flattenedSchemas[0];
    
    if (typeof firstItem === 'object' && firstItem !== null && 'depth' in firstItem) {
      // Object array format: Array<{ depth: number; schemas: string[] }>
      const depthConfig = (flattenedSchemas as FlattenedSchemasConfig)
        .find(config => config.depth === currentDepth);
      
      if (!depthConfig || !depthConfig.schemas || depthConfig.schemas.length === 0) {
        return false;
      }
      
      return depthConfig.schemas.some(flattenedId => {
        // Existing matching logic (normalize and compare)
        const normalizedFlattened = flattenedId.replace(/-/g, '');
        const normalizedSchema = schemaId.replace(/-/g, '');
        return flattenedId === schemaId || 
               normalizedFlattened === normalizedSchema ||
               schemaId.includes(flattenedId) || 
               flattenedId.includes(schemaId);
      });
    } else {
      // Backward compatibility: flat array string[]
      return (flattenedSchemas as string[]).some(flattenedId => {
        const normalizedFlattened = flattenedId.replace(/-/g, '');
        const normalizedSchema = schemaId.replace(/-/g, '');
        return flattenedId === schemaId || 
               normalizedFlattened === normalizedSchema ||
               schemaId.includes(flattenedId) || 
               flattenedId.includes(schemaId);
      });
    }
  }, [flattenedSchemas]);

  // Generate base columns from current schema
  const baseColumns = useMemo(() => {
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
  
  // Process data to handle flattened children
  const processedData = useMemo(() => {
    return data.map((row: any) => {
      const children = Array.isArray(row.children) ? row.children : [];
      
      // Separate flattened vs nested children
      const flattenedChildren: Array<{ schema: Schema; items: any[] }> = [];
      const nestedChildren: any[] = [];
      
      children.forEach((childItem: any) => {
        const childSchemaId = childItem.schema;
        const childData = Array.isArray(childItem.data) ? childItem.data : [];
        
        if (!childSchemaId || childData.length === 0) return;
        
        const matchingSchema = schemas.find(
          (s) => s.id === childSchemaId || s.id === childSchemaId.replace(/-/g, '')
        ) || schemas.find(
          (s) => childSchemaId.includes(s.id) || s.id.includes(childSchemaId.replace(/-/g, ''))
        );
        
        if (!matchingSchema) return;
        
        if (isSchemaFlattened(childSchemaId, depth)) {
          // Group flattened children by schema
          let flattenedGroup = flattenedChildren.find(g => g.schema.id === matchingSchema.id);
          if (!flattenedGroup) {
            flattenedGroup = { schema: matchingSchema, items: [] };
            flattenedChildren.push(flattenedGroup);
          }
          flattenedGroup.items.push(...childData);
        } else {
          nestedChildren.push(childItem);
        }
      });
      
      // Also check for nested children that come from flattened items
      // (e.g., if tenders are flattened, tender-items from all tenders should be aggregated)
      // Note: Children that should be flattened at depth + 1 are added to nestedChildren,
      // and will be flattened when the nested table renders at depth + 1
      flattenedChildren.forEach((flattenedGroup) => {
        flattenedGroup.items.forEach((flattenedItem: any) => {
          const itemChildren = Array.isArray(flattenedItem.children) ? flattenedItem.children : [];
          itemChildren.forEach((itemChild: any) => {
            const itemChildSchemaId = itemChild.schema;
            if (!itemChildSchemaId) return;
            
            // Always add to nestedChildren - the nested table at depth + 1 will handle flattening
            // if the schema should be flattened at that depth
            const existingChild = nestedChildren.find((nc: any) => nc.schema === itemChildSchemaId);
            if (existingChild) {
              // Merge data arrays
              const existingData = Array.isArray(existingChild.data) ? existingChild.data : [];
              const newData = Array.isArray(itemChild.data) ? itemChild.data : [];
              existingChild.data = [...existingData, ...newData];
            } else {
              nestedChildren.push({ ...itemChild });
            }
          });
        });
      });
      
      return {
        ...row,
        flattenedChildren,
        nestedChildren,
      };
    });
  }, [data, schemas, isSchemaFlattened, depth]);

  // Generate columns for flattened schemas
  const flattenedColumns = useMemo(() => {
    const flattenedCols: ColumnGroup[] = [];
    const flattenedSchemasSet = new Set<string>();
    
    processedData.forEach((row: any) => {
      row.flattenedChildren?.forEach((group: { schema: Schema; items: any[] }) => {
        if (flattenedSchemasSet.has(group.schema.id)) return;
        flattenedSchemasSet.add(group.schema.id);
        
        const schemaColumns = createColumnsFromSchema(group.schema, highlightQuery);
        
        // Filter/show ID fields based on showIds
        let filteredSchemaColumns = schemaColumns;
        if (!showIds) {
          filteredSchemaColumns = schemaColumns.filter(col => {
            const fieldName = col.field?.name || col.id;
            return fieldName?.toLowerCase() !== 'id';
          });
        }
        
        // Prefix column IDs with schema ID to avoid conflicts
        const prefixedColumns: TableColumn[] = filteredSchemaColumns.map((col, idx) => {
          const originalFieldName = col.field?.name || col.id;
          const prefixedPath = `${group.schema.id}.${originalFieldName}`;
          return {
            ...col,
            id: prefixedPath,
            label: col.label,
            accessor: (row: any) => row[prefixedPath],
          };
        });
        
        // Add ID column if showIds is true
        if (showIds && !prefixedColumns.some(col => col.field?.name?.toLowerCase() === 'id')) {
          const idPath = `${group.schema.id}.id`;
          const idColumn: TableColumn = {
            id: idPath,
            label: 'ID',
            accessor: (row: any) => row[idPath] || '',
            sortable: false,
            align: 'left' as const,
            allowWrap: false,
            field: { id: 'id', name: 'id', label: 'ID', component: 'text' },
            render: (value: any) => {
              return <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{value || '—'}</span>;
            },
          };
          prefixedColumns.unshift(idColumn);
        }
        
        flattenedCols.push({
          schema: group.schema,
          columns: prefixedColumns,
          startIndex: 0, // Will be calculated later
        });
      });
    });
    
    // Calculate start indices
    let currentIndex = baseColumns.length;
    flattenedCols.forEach(group => {
      group.startIndex = currentIndex;
      currentIndex += group.columns.length;
    });
    
    return flattenedCols;
  }, [processedData, baseColumns.length, highlightQuery, showIds]);

  // Generate all columns (base + flattened)
  const allColumns = useMemo(() => {
    return [
      ...baseColumns,
      ...flattenedColumns.flatMap(group => group.columns)
    ];
  }, [baseColumns, flattenedColumns]);

  // All column groups (main + flattened) for schema access
  const allGroups: ColumnGroup[] = useMemo(() => [
    { schema, columns: baseColumns, startIndex: 0 },
    ...flattenedColumns
  ], [baseColumns, flattenedColumns, schema]);

  // Column to group info map for styling
  const columnToGroupInfo = useMemo(() => {
    return createColumnToGroupInfoMap(allGroups);
  }, [allGroups]);

  // Generate expanded rows (with flattened children)
  const expandedRowsData = useMemo(() => {
    const rows: Array<{ row: any; flattenedChildIndex: number; totalFlattenedRows: number; originalIndex: number }> = [];
    
    processedData.forEach((row: any, originalIndex: number) => {
      const flattenedGroups = row.flattenedChildren || [];
      
      if (flattenedGroups.length === 0) {
        // No flattened children, just one row
        rows.push({ row, flattenedChildIndex: 0, totalFlattenedRows: 1, originalIndex });
      } else {
        // Calculate total flattened rows (max items across all flattened groups)
        const maxItems = Math.max(1, ...flattenedGroups.map((g: { items: any[] }) => g.items.length));
        
        // Create one row per flattened item index
        for (let i = 0; i < maxItems; i++) {
          const flattenedData: Record<string, any> = {};
          
          flattenedGroups.forEach((group: { schema: Schema; items: any[] }) => {
            const item = group.items[i];
            if (item) {
              Object.keys(item).forEach(key => {
                flattenedData[`${group.schema.id}.${key}`] = item[key];
              });
            }
          });
          
          rows.push({
            row: { ...row, ...flattenedData },
            flattenedChildIndex: i,
            totalFlattenedRows: maxItems,
            originalIndex,
          });
        }
      }
    });
    
    return rows;
  }, [processedData]);

  const columns = allColumns;
  
  const { expandedRows, toggleRow, expandAll, collapseAll } = useNestedTableExpansion(processedData, expandAllTrigger);

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
            {/* Schema header row for flattened columns */}
            {flattenedColumns.length > 0 && (
              <tr className="bg-violet-200 dark:bg-violet-950/90 border-b border-gray-200 dark:border-gray-700">
                <th className="w-10 px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300"></th>
                {/* Main schema header with action column if needed */}
                {(() => {
                  const hasMainSchemaActions = dynamicQueryId && dynamicQueryActions && 
                    getActionButtonsForSchema(schema, dynamicQueryActions, dynamicQueryId, undefined, onEditEntity);
                  const mainSchemaColSpan = baseColumns.length + (hasMainSchemaActions ? 1 : 0);
                  return (
                    <th 
                      colSpan={mainSchemaColSpan} 
                      className={cn(
                        'px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider',
                        getSchemaHeaderBorderColor(-1, false)
                      )}
                    >
                      {schema.label || schema.id}
                    </th>
                  );
                })()}
                {flattenedColumns.map((group, groupIndex) => {
                  const isLast = groupIndex === flattenedColumns.length - 1;
                  const hasGroupActions = dynamicQueryId && dynamicQueryActions && 
                    getActionButtonsForSchema(group.schema, dynamicQueryActions, dynamicQueryId, undefined, onEditEntity);
                  const groupColSpan = group.columns.length + (hasGroupActions ? 1 : 0);
                  return (
                    <th
                      key={group.schema.id}
                      colSpan={groupColSpan}
                      className={cn(
                        'px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider',
                        getSchemaHeaderBorderColor(groupIndex, isLast)
                      )}
                    >
                      {group.schema.label || group.schema.id}
                    </th>
                  );
                })}
              </tr>
            )}
            {/* Column header row */}
            <tr>
              <th className="w-10 px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200"></th>
              {columns.map((column, colIndex) => {
                const isLastColumn = colIndex === columns.length - 1;
                const columnGroup = columnToGroupInfo.get(column.id);
                const isFirstColumnInGroup = columnGroup && columnGroup.columnIndex === 0;
                const groupSchema = columnGroup && allGroups[columnGroup.groupIndex]?.schema;
                const groupHasActions = groupSchema && dynamicQueryId && dynamicQueryActions && 
                  getActionButtonsForSchema(groupSchema, dynamicQueryActions, dynamicQueryId, undefined, onEditEntity);
                
                return (
                  <React.Fragment key={column.id}>
                    {/* Action column header before each schema group that has actions */}
                    {isFirstColumnInGroup && groupHasActions && (
                      <th className="w-20 px-2 py-3 text-center text-xs font-semibold text-gray-900 dark:text-gray-200"></th>
                    )}
                    <th
                      className={cn(
                        'px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider',
                        isLastColumn ? 'border-r-0' : getBorderColorClasses(column.id, columnToGroupInfo)
                      )}
                    >
                      {column.label}
                    </th>
                  </React.Fragment>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {expandedRowsData.map(({ row: processedRow, flattenedChildIndex, totalFlattenedRows, originalIndex }, rowIndex) => {
              const originalRow = processedData[originalIndex] || processedRow;
              
              const hasNestedChildren = originalRow.nestedChildren && originalRow.nestedChildren.length > 0;
              // Use original index for expansion state (all flattened rows share the same expansion state)
              const rowKey = originalRow.id || `row-${originalIndex}`;
              const isExpanded = expandedRows.has(originalIndex);
              
              // Get nested child schema labels for tooltip (excluding flattened)
              const getNestedChildSchemaLabels = () => {
                if (!hasNestedChildren) return null;
                
                const childSchemaLabels = new Set<string>();
                originalRow.nestedChildren.forEach((childItem: any) => {
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
              
              const nestedChildSchemaLabels = getNestedChildSchemaLabels();
              const tooltipText = nestedChildSchemaLabels && nestedChildSchemaLabels.length > 0
                ? nestedChildSchemaLabels.join(', ')
                : null;
              
              // Only show expand button if there are nested children
              const showExpandButton = hasNestedChildren;
              
              return (
                <React.Fragment key={`${rowKey}-${flattenedChildIndex}`}>
                  <tr
                    className={cn(
                      'transition-colors border-b border-gray-200 dark:border-gray-700',
                      rowIndex % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900',
                      'hover:bg-gray-200 dark:hover:bg-gray-600'
                    )}
                  >
                    <td className="p-3">
                      {showExpandButton && flattenedChildIndex === 0 ? (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => toggleRow(originalIndex)}
                                className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                )}
                              </button>
                            </TooltipTrigger>
                            {tooltipText && (
                            <TooltipContent side="right" sideOffset={4}>
                              {tooltipText}
                            </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="w-6 h-6" />
                      )}
                    </td>
                    {columns.map((column, colIndex) => {
                      const value = typeof column.accessor === 'function' ? column.accessor(processedRow) : processedRow[column.accessor as string];
                      const isLastColumn = colIndex === columns.length - 1;
                      const columnGroup = columnToGroupInfo.get(column.id);
                      const isFirstColumnInGroup = columnGroup && columnGroup.columnIndex === 0;
                      const groupSchema = columnGroup && allGroups[columnGroup.groupIndex]?.schema;
                      
                      // Get row ID for flattened schema groups
                      const getRowIdForSchema = (schemaId: string) => {
                        // For flattened schemas, try to get ID from the flattened data
                        if (schemaId !== schema.id) {
                          const flattenedIdPath = `${schemaId}.id`;
                          return processedRow[flattenedIdPath] || processedRow[`${schemaId}id`] || null;
                        }
                        return processedRow?.id || originalRow?.id;
                      };
                      
                      return (
                        <React.Fragment key={column.id}>
                          {/* Action buttons cell before each schema group that has actions */}
                          {isFirstColumnInGroup && groupSchema && (() => {
                            const groupRowId = getRowIdForSchema(groupSchema.id);
                            const groupActionButtons = dynamicQueryId && dynamicQueryActions 
                              ? getActionButtonsForSchema(groupSchema, dynamicQueryActions, dynamicQueryId, groupRowId, onEditEntity)
                              : null;
                            return groupActionButtons ? (
                              <td className="p-2 text-center">
                                <DynamicActionButtons actions={groupActionButtons} variant="minimal" />
                              </td>
                            ) : null;
                          })()}
                          <td
                            className={cn(
                              'p-3 text-xs text-gray-900 dark:text-gray-200',
                              isLastColumn ? 'border-r-0' : getBorderColorClasses(column.id, columnToGroupInfo),
                              column.align === 'center' && 'text-center',
                              column.align === 'right' && 'text-right'
                            )}
                          >
                            {column.render ? column.render(value, processedRow, rowIndex) : <span>{String(value ?? '—')}</span>}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                  <AnimatePresence>
                    {isExpanded && hasNestedChildren && flattenedChildIndex === 0 && (
                      <tr className="bg-gray-50/30 dark:bg-gray-800/20">
                        <td colSpan={columns.length + 1} className="p-0 border-b border-gray-200 dark:border-gray-700">
                          <motion.div
                            key={`expanded-${rowKey}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 border-l-4 border-violet-300 dark:border-violet-400 bg-white dark:bg-gray-900/50">
                              {originalRow.nestedChildren.map((childItem: any, childIndex: number) => {
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
                                      flattenedSchemas={flattenedSchemas}
                                      dynamicQueryActions={dynamicQueryActions}
                                      dynamicQueryId={dynamicQueryId}
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

