'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { TableWrapper } from '@/gradian-ui/data-display/table/components/TableWrapper';
import { TableConfig, TableColumn } from '@/gradian-ui/data-display/table/types';
import { formatFieldValue } from '@/gradian-ui/data-display/table/utils/field-formatters';
import { HierarchyExpandCollapseControls } from './HierarchyExpandCollapseControls';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/gradian-ui/shared/utils';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface DynamicQueryTableProps {
  dynamicQueryId: string;
  flatten?: boolean;
  showFlattenSwitch?: boolean;
  onFlattenChange?: (flatten: boolean) => void;
}

interface DynamicQueryResponse {
  success: boolean;
  statusCode: number;
  message?: string;
  data: any;
}

interface SchemaField {
  id: string;
  name: string;
  label: string;
  component: string;
  options?: any[];
  role?: string;
  targetSchema?: string;
  [key: string]: any;
}

interface Schema {
  id: string;
  label: string;
  fields: SchemaField[];
}

// Utility to map schema fields to TableColumn format
function createColumnsFromSchema(schema: Schema, highlightQuery?: string): TableColumn[] {
  if (!schema?.fields || !Array.isArray(schema.fields)) {
    return [];
  }

  return schema.fields.map((field) => ({
    id: field.id || field.name,
    label: field.label || field.name,
    accessor: (row: any) => {
      const fieldName = field.name;
      return row?.[fieldName];
    },
    sortable: false,
    align: 'left' as const,
    allowWrap: true,
    field: field,
    render: (value: any, row: any) => {
      return formatFieldValue(field, value, row, true, highlightQuery);
    },
  }));
}

// Utility to parse flattened data structure
// Handles format: data.data.0.id, data.data.2.children.0.data.0.id, etc.
function parseFlattenedData(data: Record<string, any>): { rows: any[]; columns: string[] } {
  const rowsMap = new Map<string, Record<string, any>>();
  const columnSet = new Set<string>();

  // Extract all keys and parse them
  Object.keys(data).forEach((key) => {
    // Skip schemas key and data.schema
    if (key === 'schemas' || key === 'data.schema') return;

    // Parse pattern: data.data.index.fieldPath or data.data.index.children.0.data.0.fieldPath
    // Example: "data.data.0.id" -> rowIndex: "0", fieldPath: "id", depth: 0
    // Example: "data.data.2.children.0.data.0.id" -> rowIndex: "2", fieldPath: "children.0.data.0.id", depth: 1
    const match = key.match(/^data\.data\.(\d+)\.(.+)$/);
    if (match) {
      const rowIndex = match[1];
      const fieldPath = match[2];
      const fullKey = `root.${rowIndex}`;

      // Use the full field path as column name
      columnSet.add(fieldPath);

      if (!rowsMap.has(fullKey)) {
        rowsMap.set(fullKey, {});
      }

      const row = rowsMap.get(fullKey)!;
      // Store value using the field path as key
      row[fieldPath] = data[key];
    }
  });

  // Convert map to array, preserving row order
  const sortedKeys = Array.from(rowsMap.keys()).sort((a, b) => {
    const matchA = a.match(/^root\.(\d+)$/);
    const matchB = b.match(/^root\.(\d+)$/);
    if (matchA && matchB) {
      return parseInt(matchA[1]) - parseInt(matchB[1]);
    }
    return a.localeCompare(b);
  });

  const rows = sortedKeys.map((key) => rowsMap.get(key)!);
  const columns = Array.from(columnSet);

  return { rows, columns };
}

// Utility to determine schema index from field path
// Returns { schemaIndex: number, fieldName: string, depth: number }
function getSchemaInfoFromPath(fieldPath: string): { schemaIndex: number; fieldName: string; depth: number } {
  // Count number of "children.X.data" patterns to determine depth
  const depthMatch = fieldPath.match(/children\.\d+\.data/g);
  const depth = depthMatch ? depthMatch.length : 0;
  
  // Extract the actual field name (last part after all children.data patterns)
  const parts = fieldPath.split('.');
  const fieldName = parts[parts.length - 1];
  
  // Schema index is depth + 1 (0 = root, 1 = first nested, etc.)
  // But we need to map this based on the actual schema structure
  // For now, return depth as schema index (will be corrected by schema mapping)
  return { schemaIndex: depth, fieldName, depth };
}

// Flat table renderer
function FlatTableRenderer({ data, schemas, showFlattenSwitch, flatten, onFlattenChange }: { data: Record<string, any>; schemas?: Schema[]; showFlattenSwitch?: boolean; flatten?: boolean; onFlattenChange?: (flatten: boolean) => void }) {
  const schemaList = schemas || [];

  // Parse data and group columns by schema and determine order
  const { rows, columnGroups } = useMemo(() => {
    const { rows: parsedRows, columns: parsedColumns } = parseFlattenedData(data);
    // Build field index maps for each schema (field name -> index in fields array)
    const fieldIndexMap = new Map<string, Map<string, number>>(); // schema id -> (field name -> index)
    const fieldDefMap = new Map<string, Map<string, SchemaField>>(); // schema id -> (field name -> field definition)
    
    schemaList.forEach((schema) => {
      const nameToIndex = new Map<string, number>();
      const nameToField = new Map<string, SchemaField>();
      schema.fields?.forEach((field, fieldIdx) => {
        nameToIndex.set(field.name, fieldIdx);
        nameToField.set(field.name, field);
        if (field.id && field.id !== field.name) {
          nameToIndex.set(field.id, fieldIdx);
          nameToField.set(field.id, field);
        }
      });
      fieldIndexMap.set(schema.id, nameToIndex);
      fieldDefMap.set(schema.id, nameToField);
    });

    // Map each column path to its schema based on depth
    // Root level (no children pattern) = schema[0]
    // One level deep (children.0.data.0.field) = schema[1]
    // Two levels deep (children.0.data.0.children.0.data.0.field) = schema[2]
    const schemaToColumns = new Map<number, Array<{ path: string; fieldName: string; fieldIndex: number }>>();
    
    parsedColumns.forEach((fieldPath) => {
      const pathInfo = getSchemaInfoFromPath(fieldPath);
      const { fieldName, depth } = pathInfo;
      
      // Map depth to schema index (0 = root schema, 1 = first nested, etc.)
      // This assumes schemas are ordered by hierarchy in the array
      const schemaIndex = depth < schemaList.length ? depth : schemaList.length - 1;
      const schema = schemaList[schemaIndex];
      if (!schema) return;
      
      // Get field index within schema (by field order in fields array)
      const fieldMap = fieldIndexMap.get(schema.id);
      const fieldIdx = fieldMap?.get(fieldName) ?? 999; // Use 999 for unknown fields (sort to end)
      
      if (!schemaToColumns.has(schemaIndex)) {
        schemaToColumns.set(schemaIndex, []);
      }
      schemaToColumns.get(schemaIndex)!.push({
        path: fieldPath,
        fieldName,
        fieldIndex: fieldIdx,
      });
    });

    // Build column groups ordered by schema index, fields ordered by field index
    const columnGroupsArray: { schema: Schema; columns: TableColumn[]; startIndex: number }[] = [];
    let currentIndex = 0;

    // Process schemas in order of their index in the schemas array
    schemaList.forEach((schema, schemaIndex) => {
      const columnInfos = schemaToColumns.get(schemaIndex) || [];
      
      // Sort columns by field index (order in fields array), then by field name
      columnInfos.sort((a, b) => {
        if (a.fieldIndex !== b.fieldIndex) {
          return a.fieldIndex - b.fieldIndex;
        }
        return a.fieldName.localeCompare(b.fieldName);
      });

      // Get field definitions for this schema
      const fieldDefs = fieldDefMap.get(schema.id) || new Map();

      const schemaColumns: TableColumn[] = columnInfos.map(({ path, fieldName }) => {
        const schemaField = fieldDefs.get(fieldName);
        
        return {
          id: path,
          label: schemaField?.label || fieldName,
          accessor: (row: any) => row[path],
          sortable: false,
          align: 'left' as const,
          allowWrap: true,
          field: schemaField,
          render: schemaField
            ? (value: any, row: any) => formatFieldValue(schemaField, value, row, true)
            : (value: any) => <span>{String(value ?? '—')}</span>,
        };
      });

      if (schemaColumns.length > 0) {
        columnGroupsArray.push({
          schema,
          columns: schemaColumns,
          startIndex: currentIndex,
        });
        currentIndex += schemaColumns.length;
      }
    });

    return { rows: parsedRows, columnGroups: columnGroupsArray };
  }, [data, schemaList]);

  // Flatten all columns for table rendering
  const allColumns = useMemo(() => {
    return columnGroups.flatMap(group => group.columns);
  }, [columnGroups]);

  // Render custom table with schema header row
  return (
    <div className="w-full">
      {showFlattenSwitch && (
        <div className="flex items-center justify-end gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Label htmlFor="flatten-switch" className="text-sm cursor-pointer">
              Flatten mode
            </Label>
            <Switch
              id="flatten-switch"
              checked={flatten || false}
              onCheckedChange={(checked) => {
                if (onFlattenChange) {
                  onFlattenChange(checked);
                }
              }}
            />
          </div>
        </div>
      )}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="border-collapse" style={{ tableLayout: 'auto', width: '-webkit-fill-available' }}>
            {/* Schema header row */}
            <thead>
              <tr className="bg-violet-50 dark:bg-violet-950/30 border-b border-violet-200 dark:border-violet-700">
                {columnGroups.map((group) => (
                  <th
                    key={group.schema.id}
                    colSpan={group.columns.length}
                    className="px-3 py-1.5 text-left text-xs font-medium text-violet-700 dark:text-violet-300 border-r border-violet-200 dark:border-violet-700 last:border-r-0"
                  >
                    {group.schema.label || group.schema.id}
                  </th>
                ))}
              </tr>
              {/* Column header row */}
              <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
                {allColumns.map((column) => (
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
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    'border-b border-gray-200 dark:border-gray-700',
                    rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700',
                    'hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors'
                  )}
                >
                  {allColumns.map((column) => {
                    const value = typeof column.accessor === 'function' ? column.accessor(row) : row[column.accessor as string];
                    return (
                      <td
                        key={column.id}
                        className={cn(
                          'px-4 py-3 text-xs text-gray-900 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700 last:border-r-0',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right'
                        )}
                      >
                        {column.render ? column.render(value, row, rowIndex) : <span>{String(value ?? '—')}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Wrapper component to handle expand all at root level
interface NestedTableViewWrapperProps {
  data: any[];
  schema: Schema;
  schemas: Schema[];
  depth?: number;
  highlightQuery?: string;
  showFlattenSwitch?: boolean;
  flatten?: boolean;
  onFlattenChange?: (flatten: boolean) => void;
}

function NestedTableViewWrapper({ data, schema, schemas, depth = 0, highlightQuery, showFlattenSwitch, flatten, onFlattenChange }: NestedTableViewWrapperProps) {
  const [expandAllTrigger, setExpandAllTrigger] = useState(0);

  const expandAll = () => {
    setExpandAllTrigger((prev) => prev + 1);
  };

  const collapseAll = () => {
    setExpandAllTrigger(0);
  };

  return (
      <NestedTableView
        data={data}
        schema={schema}
        schemas={schemas}
        depth={depth}
        highlightQuery={highlightQuery}
        expandAllTrigger={expandAllTrigger}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        showFlattenSwitch={showFlattenSwitch}
        flatten={flatten}
        onFlattenChange={onFlattenChange}
      />
  );
}

// Nested table view component
interface NestedTableViewProps {
  data: any[];
  schema: Schema;
  schemas: Schema[];
  depth?: number;
  highlightQuery?: string;
  expandAllTrigger?: number; // Trigger to expand all recursively
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  showFlattenSwitch?: boolean;
  flatten?: boolean;
  onFlattenChange?: (flatten: boolean) => void;
}

function NestedTableView({ data, schema, schemas, depth = 0, highlightQuery, expandAllTrigger = 0, onExpandAll, onCollapseAll, showFlattenSwitch, flatten, onFlattenChange }: NestedTableViewProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const columns = useMemo(() => createColumnsFromSchema(schema, highlightQuery), [schema, highlightQuery]);

  // When expandAllTrigger changes, expand all rows at this level (child components will receive the same trigger)
  useEffect(() => {
    if (expandAllTrigger > 0) {
      const allRowIndices = new Set(data.map((_, index) => index));
      setExpandedRows(allRowIndices);
    } else if (expandAllTrigger === 0 && expandedRows.size > 0) {
      // Only collapse if we had rows expanded
      setExpandedRows(new Set());
    }
  }, [expandAllTrigger, data.length]);

  const toggleRow = (index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    // Expand all rows at this level
    const allRowIndices = new Set(data.map((_, index) => index));
    setExpandedRows(allRowIndices);
    
    // Call parent expand all to propagate to root
    if (onExpandAll) {
      onExpandAll();
    }
  };

  const handleCollapseAll = () => {
    setExpandedRows(new Set());
    if (onCollapseAll) {
      onCollapseAll();
    }
  };

  if (!data || data.length === 0) {
    return <div className="text-sm text-gray-400 dark:text-gray-500 py-2">No data</div>;
  }

  return (
    <div className="w-full">
      {depth === 0 && (
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-md font-semibold text-sm bg-violet-100 dark:bg-violet-900/40 text-violet-900 dark:text-violet-100">
              {schema.label || schema.id}
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Displaying results as nested expandable tables
            </span>
          </div>
          <div className="flex items-center gap-3">
            {showFlattenSwitch && (
              <div className="flex items-center gap-2">
                <Label htmlFor="flatten-switch" className="text-sm cursor-pointer">
                  Flatten mode
                </Label>
                <Switch
                  id="flatten-switch"
                  checked={flatten || false}
                  onCheckedChange={(checked) => {
                    if (onFlattenChange) {
                      onFlattenChange(checked);
                    }
                  }}
                />
              </div>
            )}
            <HierarchyExpandCollapseControls
              onExpandAll={handleExpandAll}
              onCollapseAll={handleCollapseAll}
              expandDisabled={data.length === 0}
              collapseDisabled={expandedRows.size === 0}
              variant="ghost"
              size="sm"
            />
          </div>
        </div>
      )}

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden w-full shadow-sm">
        <div className="overflow-x-auto">
        <table className="border-collapse" style={{ tableLayout: 'auto', width: '-webkit-fill-available' }}>
          <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="w-10 px-3 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200"></th>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className="px-3 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 last:border-r-0"
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
              
              return (
                <React.Fragment key={row.id || index}>
                  <tr
                    className={cn(
                      'border-b border-gray-200 dark:border-gray-700',
                      index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700',
                      'hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors'
                    )}
                  >
                    <td className="px-3 py-3">
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
                              {schema.label || schema.id}
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
                            'px-3 py-3 text-xs text-gray-900 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700 last:border-r-0',
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right'
                          )}
                        >
                          {column.render ? column.render(value, row, index) : <span>{String(value ?? '—')}</span>}
                        </td>
                      );
                    })}
                  </tr>
                  {isExpanded && hasNestedData && (
                    <tr>
                      <td colSpan={columns.length + 1} className="p-0 border-b border-gray-200 dark:border-gray-700">
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-gray-50/50 dark:bg-gray-800/30"
                        >
                          <div className="p-4 border-l-4 border-violet-400 dark:border-violet-600">
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
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

// Nested table renderer
function NestedTableRenderer({ data, schemas, showFlattenSwitch, flatten, onFlattenChange }: { data: any; schemas?: Schema[]; showFlattenSwitch?: boolean; flatten?: boolean; onFlattenChange?: (flatten: boolean) => void }) {
  // New structure: { schema: string, data: array, schemas: array }
  const rootSchemaId = data.schema;
  const rootData = Array.isArray(data.data) ? data.data : [];

  if (!rootSchemaId || rootData.length === 0) {
    return <div className="text-gray-500 dark:text-gray-400 p-4">No data available</div>;
  }

  const rootSchema = schemas?.find((s) => s.id === rootSchemaId || s.id === rootSchemaId.replace(/-/g, ''));

  if (!rootSchema) {
    return <div className="text-gray-500 dark:text-gray-400 p-4">Schema not found for {rootSchemaId}</div>;
  }

  return (
    <div className="w-full">
      <NestedTableViewWrapper 
        data={rootData} 
        schema={rootSchema} 
        schemas={schemas || []} 
        depth={0}
        showFlattenSwitch={showFlattenSwitch}
        flatten={flatten}
        onFlattenChange={onFlattenChange}
      />
    </div>
  );
}

// Main component
export function DynamicQueryTable({
  dynamicQueryId,
  flatten: controlledFlatten = false,
  showFlattenSwitch = true,
  onFlattenChange,
}: DynamicQueryTableProps) {
  const [internalFlatten, setInternalFlatten] = useState(controlledFlatten);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<DynamicQueryResponse | null>(null);

  // Use controlled or internal state
  const flatten = onFlattenChange !== undefined ? controlledFlatten : internalFlatten;
  const setFlatten = onFlattenChange || setInternalFlatten;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const endpoint = `/api/dynamic-query/${dynamicQueryId}${flatten ? '?flatten=true' : ''}`;
        const response = await apiRequest<DynamicQueryResponse>(endpoint, {
          method: 'POST',
          callerName: 'DynamicQueryTable',
        });

        if (response.success && response.data) {
          setResponseData({
            success: true,
            statusCode: response.statusCode || 200,
            data: response.data,
          });
        } else {
          setError((response.data as any)?.error || (response.data as any)?.message || 'Failed to fetch data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (dynamicQueryId) {
      fetchData();
    }
  }, [dynamicQueryId, flatten]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500 dark:text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (!responseData?.data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 dark:text-gray-400">No data available</div>
      </div>
    );
  }

  const { data } = responseData;
  const schemas: Schema[] = data.schemas || [];

  return (
    <div className="w-full space-y-4">
      {flatten ? (
        <FlatTableRenderer data={data} schemas={schemas} showFlattenSwitch={showFlattenSwitch} flatten={flatten} onFlattenChange={setFlatten} />
      ) : (
        <NestedTableRenderer data={data} schemas={schemas} showFlattenSwitch={showFlattenSwitch} flatten={flatten} onFlattenChange={setFlatten} />
      )}
    </div>
  );
}

DynamicQueryTable.displayName = 'DynamicQueryTable';

