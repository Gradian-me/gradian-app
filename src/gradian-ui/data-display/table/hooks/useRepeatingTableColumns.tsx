import React, { useMemo } from 'react';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { TableColumn, ColumnWidthMap } from '../types';
import { buildTableColumns } from '../utils';
import { ForceIcon } from '@/gradian-ui/form-builder/form-elements/components/ForceIcon';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';

export interface UseRepeatingTableColumnsOptions {
  fields: any[];
  schemaForColumns: FormSchema | null;
  columnWidths?: ColumnWidthMap;
  renderActionCell?: (row: any, itemId: string | number | undefined, index: number) => React.ReactNode;
  getRowId?: (row: any) => string | number | undefined;
  showForceColumn?: boolean; // Whether to show the force column (default: true for backward compatibility)
}

export function useRepeatingTableColumns({
  fields,
  schemaForColumns,
  columnWidths,
  renderActionCell,
  getRowId,
  showForceColumn = true, // Default to true for backward compatibility
}: UseRepeatingTableColumnsOptions): TableColumn[] {
  const baseColumns = useMemo(() => {
    if (!schemaForColumns) {
      return [];
    }

    return buildTableColumns(fields, schemaForColumns, columnWidths);
  }, [columnWidths, fields, schemaForColumns]);

  const columnsWithActions = useMemo(() => {
    if (!renderActionCell) {
      return baseColumns;
    }

    const viewColumn: TableColumn = {
      id: 'actions',
      label: 'Actions',
      accessor: 'id',
      sortable: false,
      align: 'center',
      width: 80,
      render: (value: any, row: any, index: number) => {
        const itemId = getRowId?.(row) ?? row?.id ?? value;
        if (!itemId) return null;
        return renderActionCell(row, itemId, index);
      },
    };

    const existingActionIndex = baseColumns.findIndex((column) => column.id === 'actions');
    if (existingActionIndex !== -1) {
      const cloned = [...baseColumns];
      cloned[existingActionIndex] = viewColumn;
      
      // Only add force column if showForceColumn is true
      if (showForceColumn) {
        const forceColumn: TableColumn = {
          id: 'force',
          label: '',
          accessor: 'isForce',
          sortable: false,
          align: 'center',
          width: 40,
          headerRender: () => {
            return (
              <div className="flex items-center justify-center">
                <IconRenderer
                  iconName="OctagonAlert"
                  className="h-4 w-4 text-pink-600 dark:text-pink-500"
                />
              </div>
            );
          },
          render: (_value: any, row: any) => {
            return <ForceIcon isForce={row?.isForce === true} size="sm" forceReason={row?.forceReason} />;
          },
        };
        
        // Add force column after actions
        const existingForceIndex = cloned.findIndex((column) => column.id === 'force');
        if (existingForceIndex !== -1) {
          cloned[existingForceIndex] = forceColumn;
        } else {
          cloned.splice(existingActionIndex + 1, 0, forceColumn);
        }
      }
      
      return cloned;
    }

    // Only add force column if showForceColumn is true
    if (showForceColumn) {
      const forceColumn: TableColumn = {
        id: 'force',
        label: '',
        accessor: 'isForce',
        sortable: false,
        align: 'center',
        width: 40,
        headerRender: () => {
          return (
            <div className="flex items-center justify-center">
              <IconRenderer
                iconName="OctagonAlert"
                className="h-4 w-4 text-pink-600 dark:text-pink-500"
              />
            </div>
          );
        },
        render: (_value: any, row: any) => {
          return <ForceIcon isForce={row?.isForce === true} size="sm" forceReason={row?.forceReason} />;
        },
      };
      return [viewColumn, forceColumn, ...baseColumns];
    }

    return [viewColumn, ...baseColumns];
  }, [baseColumns, getRowId, renderActionCell]);

  return columnsWithActions;
}


