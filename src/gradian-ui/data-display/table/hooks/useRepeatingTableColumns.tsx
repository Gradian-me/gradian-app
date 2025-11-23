import React, { useMemo } from 'react';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { TableColumn, ColumnWidthMap } from '../types';
import { buildTableColumns } from '../utils';
import { ForceIcon } from '@/gradian-ui/form-builder/form-elements/components/ForceIcon';

export interface UseRepeatingTableColumnsOptions {
  fields: any[];
  schemaForColumns: FormSchema | null;
  columnWidths?: ColumnWidthMap;
  renderActionCell?: (row: any, itemId: string | number | undefined, index: number) => React.ReactNode;
  getRowId?: (row: any) => string | number | undefined;
}

export function useRepeatingTableColumns({
  fields,
  schemaForColumns,
  columnWidths,
  renderActionCell,
  getRowId,
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

    const forceColumn: TableColumn = {
      id: 'force',
      label: '',
      accessor: 'isForce',
      sortable: false,
      align: 'center',
      width: 40,
      render: (_value: any, row: any) => {
        return <ForceIcon isForce={row?.isForce === true} size="sm" forceReason={row?.forceReason} />;
      },
    };

    const existingActionIndex = baseColumns.findIndex((column) => column.id === 'actions');
    if (existingActionIndex !== -1) {
      const cloned = [...baseColumns];
      cloned[existingActionIndex] = viewColumn;
      // Add force column after actions
      const existingForceIndex = cloned.findIndex((column) => column.id === 'force');
      if (existingForceIndex !== -1) {
        cloned[existingForceIndex] = forceColumn;
      } else {
        cloned.splice(existingActionIndex + 1, 0, forceColumn);
      }
      return cloned;
    }

    return [viewColumn, forceColumn, ...baseColumns];
  }, [baseColumns, getRowId, renderActionCell]);

  return columnsWithActions;
}


