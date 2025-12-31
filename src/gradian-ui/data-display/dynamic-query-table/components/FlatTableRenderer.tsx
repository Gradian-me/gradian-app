'use client';

import React, { useMemo } from 'react';
import { TableColumn } from '../../table/types';
import { formatFieldValue } from '../../table/utils/field-formatters';
import { resolveColumnWidth } from '../../table/utils/column-config';
import { cn } from '@/gradian-ui/shared/utils';
import { FlatTableRendererProps, Schema, SchemaField, ColumnGroup } from '../types';
import { parseFlattenedData, getSchemaInfoFromPath, getBorderColorClasses, getSchemaHeaderBorderColor, createColumnToGroupInfoMap } from '../utils';

// Helper to infer field component type from value structure
function inferFieldComponent(fieldName: string, value: any): string {
  if (value === null || value === undefined) return 'text';
  
  // Check if it's an array with structured objects (badges, pickers, etc.)
  if (Array.isArray(value) && value.length > 0) {
    const firstItem = value[0];
    // Check if it looks like a status/badge object (has id, icon, color, label)
    if (typeof firstItem === 'object' && firstItem !== null) {
      if (firstItem.id && (firstItem.icon || firstItem.color || firstItem.label)) {
        // Check if field name suggests status
        if (fieldName.toLowerCase() === 'status') {
          return 'select'; // Status fields are typically select with badge rendering
        }
        // Otherwise treat as picker/badge field
        return 'picker';
      }
      // Check if it's a list-input (array of strings or simple objects)
      if (typeof firstItem === 'string' || (firstItem.label || firstItem.name || firstItem.value)) {
        return 'list-input';
      }
    }
    // Array of strings or IDs
    if (typeof firstItem === 'string') {
      return 'checkbox-list';
    }
  }
  
  // Check field name patterns
  const nameLower = fieldName.toLowerCase();
  if (nameLower.includes('date')) return 'date';
  if (nameLower.includes('email')) return 'email';
  if (nameLower.includes('url') || nameLower.includes('link')) return 'url';
  if (nameLower.includes('phone')) return 'tel';
  if (nameLower === 'status') return 'select';
  
  // Check value type
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'checkbox';
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    // Object with id/label structure suggests picker
    if (value.id || value.label || value.name) return 'picker';
  }
  
  return 'text';
}

// Helper to create synthetic field definition for fields not in schema
function createSyntheticField(fieldName: string, value: any, schema: Schema): SchemaField {
  const component = inferFieldComponent(fieldName, value);
  
  // Extract options from value if it's an array with structured objects
  let options: any[] | undefined;
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
    options = value.map((item: any) => ({
      id: item.id || item.value,
      label: item.label || item.name || item.title || item.id || item.value,
      icon: item.icon,
      color: item.color,
      ...item
    }));
  }
  
  // Determine role based on field name
  let role: string | undefined;
  if (fieldName.toLowerCase() === 'status') {
    role = 'status';
  } else if (fieldName.toLowerCase().includes('type')) {
    role = 'entityType';
  } else if (fieldName.toLowerCase().includes('rating')) {
    role = 'rating';
  } else if (fieldName.toLowerCase().includes('code')) {
    role = 'code';
  }
  
  return {
    id: fieldName,
    name: fieldName,
    label: fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1'),
    component,
    options,
    role,
  };
}

export function FlatTableRenderer({ data, schemas, showFlattenSwitch, flatten, onFlattenChange, showIds = false, onShowIdsChange, highlightQuery }: FlatTableRendererProps) {
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
    
    // Build a map of field values from actual data to help infer field types
    const fieldValueMap = new Map<string, any>(); // fieldPath -> sample value
    parsedRows.forEach((row) => {
      Object.keys(row).forEach((path) => {
        if (!fieldValueMap.has(path)) {
          fieldValueMap.set(path, row[path]);
        }
      });
    });

    // Map each column path to its schema based on schema ID
    // Root level (just field name) = schema[0]
    // Nested level (schemaId.0.data.0.field) = schema matching schemaId
    // Deeper nested (schemaId.0.data.0.childSchemaId.0.data.0.field) = schema matching childSchemaId
    const schemaToColumns = new Map<number, Array<{ path: string; fieldName: string; fieldIndex: number }>>();
    
    parsedColumns.forEach((fieldPath) => {
      const pathInfo = getSchemaInfoFromPath(fieldPath, schemaList);
      const { fieldName, depth, schemaId, schemaIndex: pathSchemaIndex } = pathInfo;
      
      // Use the schema index from path info if available, otherwise fall back to depth
      let schemaIndex = pathSchemaIndex;
      if (schemaId && schemaIndex === depth) {
        // Try to find the schema by ID
        const foundIndex = schemaList.findIndex(s => s.id === schemaId || s.id === schemaId.replace(/-/g, ''));
        if (foundIndex !== -1) {
          schemaIndex = foundIndex;
        } else {
          // Fallback: use depth as index
          schemaIndex = depth < schemaList.length ? depth : schemaList.length - 1;
        }
      } else if (schemaIndex >= schemaList.length) {
        schemaIndex = schemaList.length - 1;
      }
      
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
    const columnGroupsArray: ColumnGroup[] = [];
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

      // Filter out ID fields if showIds is false, or separate them if showIds is true
      const regularColumns: Array<{ path: string; fieldName: string }> = [];
      const idColumns: Array<{ path: string; fieldName: string }> = [];
      
      columnInfos.forEach(({ path, fieldName }) => {
        // Check if this is an ID field (field name is 'id' or path ends with '.id' or just 'id' for root level)
        const isIdField = fieldName.toLowerCase() === 'id' || 
                         path.toLowerCase() === 'id' || 
                         path.toLowerCase().endsWith('.id') ||
                         path.toLowerCase().endsWith('data.id');
        
        if (isIdField) {
          if (showIds) {
            idColumns.push({ path, fieldName });
          }
          // If showIds is false, skip ID fields entirely
        } else {
          regularColumns.push({ path, fieldName });
        }
      });

      // Build regular columns
      const schemaColumns: TableColumn[] = regularColumns.map(({ path, fieldName }) => {
        let schemaField = fieldDefs.get(fieldName);
        
        // If field not in schema, create synthetic field definition based on data
        if (!schemaField) {
          const sampleValue = fieldValueMap.get(path);
          schemaField = createSyntheticField(fieldName, sampleValue, schema);
        }
        
        // Get column width configuration based on field type
        const widthConfig = resolveColumnWidth(schemaField);
        
        // Determine if this is a badge/status field that needs more space
        const isBadgeField = schemaField?.role === 'status' || 
                            schemaField?.role === 'badge' || 
                            schemaField?.role === 'entityType' ||
                            schemaField?.component === 'select' ||
                            schemaField?.component === 'checkbox-list' ||
                            schemaField?.component === 'picker';
        
        // For badge fields, ensure adequate width and allow wrapping
        // Status fields with icons/colors need more space for badges
        const badgeMinWidth = isBadgeField ? 180 : widthConfig.minWidth;
        const badgeMaxWidth = isBadgeField ? 350 : widthConfig.maxWidth;
        
        return {
          id: path,
          label: schemaField?.label || fieldName,
          accessor: (row: any) => row[path],
          sortable: false,
          align: 'left' as const,
          allowWrap: isBadgeField ? true : (widthConfig.maxWidth != null),
          minWidth: badgeMinWidth || widthConfig.minWidth,
          maxWidth: badgeMaxWidth,
          field: schemaField,
          render: (value: any, row: any) => {
            // Always use formatFieldValue for proper rendering (badges, dates, etc.)
            return formatFieldValue(schemaField, value, row, true, highlightQuery);
          },
        };
      });

      // Build ID columns if showIds is true
      if (showIds && idColumns.length > 0) {
        // Use the first ID column found for this schema (or create a synthetic one)
        const firstIdColumn = idColumns[0];
        const idPath = firstIdColumn.path;
        const idField = fieldDefs.get('id');
        
        const idColumn: TableColumn = {
          id: idPath,
          label: 'ID',
          accessor: (row: any) => row[idPath] || '',
          sortable: false,
          align: 'left' as const,
          allowWrap: false,
          minWidth: 200,
          maxWidth: 250,
          field: idField || { id: 'id', name: 'id', label: 'ID', component: 'text' },
          render: (value: any) => {
            return <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{value || '—'}</span>;
          },
        };
        
        // Insert ID column as the first column of this schema group
        schemaColumns.unshift(idColumn);
      }

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
  }, [data, schemaList, showIds, highlightQuery]);

  // Use rows directly (IDs are now part of the column groups)
  const rowsWithIds = rows;

  // Flatten all columns for table rendering
  const allColumns = useMemo(() => {
    return columnGroups.flatMap(group => group.columns);
  }, [columnGroups]);

  // Create a map of column IDs to their schema group index and position for border color assignment
  const columnToGroupInfo = useMemo(() => {
    return createColumnToGroupInfoMap(columnGroups);
  }, [columnGroups]);

  // Render custom table with schema header row
  return (
    <div className="w-full">
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto overflow-y-hidden w-full">
        <table className="border-collapse" style={{ tableLayout: 'auto', width: '-webkit-fill-available' }}>
          {/* Schema header row */}
          <thead>
            <tr className="bg-violet-200 dark:bg-violet-950/90 border-b border-gray-200 dark:border-gray-700">
              {columnGroups.map((group, groupIndex) => {
                const isLast = groupIndex === columnGroups.length - 1;
                return (
                  <th
                    key={group.schema.id}
                    colSpan={group.columns.length}
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
            {/* Column header row */}
            <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
              {allColumns.map((column, colIndex) => {
                const isLastColumn = colIndex === allColumns.length - 1;
                
                return (
                  <th
                    key={column.id}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider',
                      isLastColumn ? 'border-r-0' : getBorderColorClasses(column.id, columnToGroupInfo)
                    )}
                    style={{
                      // Apply width constraints to headers to match cells
                      minWidth: column.minWidth ? `${column.minWidth}px` : undefined,
                      maxWidth: column.maxWidth ? `${column.maxWidth}px` : undefined,
                      width: column.width ? (typeof column.width === 'number' ? `${column.width}px` : column.width) : undefined,
                      boxSizing: 'border-box',
                      whiteSpace: column.maxWidth ? 'normal' : 'nowrap',
                    }}
                  >
                    {column.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rowsWithIds.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  'transition-colors border-b border-gray-200 dark:border-gray-700',
                  rowIndex % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900',
                  'hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                {allColumns.map((column, colIndex) => {
                  const value = typeof column.accessor === 'function' 
                    ? column.accessor(row)
                    : row[column.accessor as string];
                  const isLastColumn = colIndex === allColumns.length - 1;
                  
                  // Determine if this is a badge field that needs wrapping
                  const isBadgeField = column.field?.role === 'status' || 
                                      column.field?.role === 'badge' || 
                                      column.field?.role === 'entityType' ||
                                      column.field?.component === 'select' ||
                                      column.field?.component === 'checkbox-list' ||
                                      column.field?.component === 'picker';
                  
                  const shouldAllowWrapping = column.allowWrap !== false && (column.maxWidth != null || isBadgeField);
                  
                  return (
                    <td
                      key={column.id}
                      className={cn(
                        'p-3 text-xs text-gray-900 dark:text-gray-200',
                        isLastColumn ? 'border-r-0' : getBorderColorClasses(column.id, columnToGroupInfo),
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                      style={{
                        // Apply width constraints for badge columns
                        minWidth: column.minWidth ? `${column.minWidth}px` : undefined,
                        maxWidth: column.maxWidth ? `${column.maxWidth}px` : undefined,
                        width: column.width ? (typeof column.width === 'number' ? `${column.width}px` : column.width) : undefined,
                        boxSizing: 'border-box',
                        // Allow wrapping for badge columns
                        whiteSpace: shouldAllowWrapping ? 'normal' : 'nowrap',
                        wordBreak: shouldAllowWrapping ? 'break-word' : 'normal',
                        overflowWrap: shouldAllowWrapping ? 'break-word' : 'normal',
                        overflowX: 'hidden',
                        overflowY: shouldAllowWrapping ? 'visible' : 'hidden',
                      }}
                    >
                      <div className={shouldAllowWrapping ? "min-w-0 w-full" : ""}>
                        {column.render ? column.render(value, row, rowIndex) : <span>{String(value ?? '—')}</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

