import React from 'react';
import { TableColumn } from '../types';
import { formatFieldValue, getFieldValue } from './field-formatters';
import { ColumnWidthMap } from '../types';
import { resolveColumnWidth, shouldAllowWrap } from './column-config';

export const buildTableColumns = (
  fields: any[],
  schema: any,
  columnWidths?: ColumnWidthMap
): TableColumn[] => {
  return fields.map((field) => {
    const widthSettings = resolveColumnWidth(field, columnWidths);
    const align =
      field?.component === 'number' || field?.displayType === 'currency' || field?.displayType === 'percentage'
        ? 'right'
        : 'left';

    return {
      id: field.id,
      label: field.label || field.name,
      accessor: (row: any) => getFieldValue(field, row),
      sortable: true,
      align,
      maxWidth: widthSettings.maxWidth,
      width: widthSettings.width,
      allowWrap: shouldAllowWrap(field, widthSettings),
      render: (value: any, row: any) => formatFieldValue(field, value, row),
      field: field, // Store field for component-specific rendering
    } as TableColumn;
  });
};


