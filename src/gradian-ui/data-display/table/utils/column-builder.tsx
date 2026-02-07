import React from 'react';
import { TableColumn } from '../types';
import { formatFieldValue, getFieldValue } from './field-formatters';
import { ColumnWidthMap } from '../types';
import { resolveColumnWidth, shouldAllowWrap } from './column-config';
import { resolveSchemaFieldLabel } from '@/gradian-ui/shared/utils/translation-utils';

export const buildTableColumns = (
  fields: any[],
  schema: any,
  columnWidths?: ColumnWidthMap,
  lang?: string,
  defaultLang?: string
): TableColumn[] => {
  const effectiveLang = lang ?? 'en';
  const effectiveDefaultLang = defaultLang ?? 'en';

  return fields.map((field) => {
    const widthSettings = resolveColumnWidth(field, columnWidths);
    const align =
      field?.component === 'number' || field?.displayType === 'currency' || field?.displayType === 'percentage'
        ? 'right'
        : 'left';

    const resolvedLabel =
      resolveSchemaFieldLabel(field, effectiveLang, effectiveDefaultLang) ||
      field.label ||
      field.name;

    return {
      id: field.id,
      label: resolvedLabel,
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


