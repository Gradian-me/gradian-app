'use client';

import { useMemo } from 'react';
import { TableWrapper, TableConfig, TableColumn } from '@/gradian-ui/data-display/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PencilRuler, LayoutList, Trash2, Layers, Type } from 'lucide-react';
import { FormSchema } from '../types';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';

interface SchemaTableViewProps {
  schemas: FormSchema[];
  onEdit: (schema: FormSchema) => void;
  onView: (schema: FormSchema) => void;
  onDelete: (schema: FormSchema) => void;
  isLoading?: boolean;
}

export function SchemaTableView({ schemas, onEdit, onView, onDelete, isLoading = false }: SchemaTableViewProps) {
  const tableColumns = useMemo<TableColumn<FormSchema>[]>(() => [
    {
      id: 'actions',
      label: 'Actions',
      accessor: 'id',
      sortable: false,
      align: 'center',
      width: 140,
      render: (_value: any, row: FormSchema) => {
        return (
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                // Handle middle-click or Ctrl/Cmd+click to open in new tab
                if (e.button === 1 || e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                  window.open(`/page/${row.id}`, '_blank');
                  return;
                }
                // Regular click
                onView(row);
              }}
              onMouseDown={(e) => {
                // Handle middle-click (button 1)
                if (e.button === 1) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(`/page/${row.id}`, '_blank');
                }
              }}
              onAuxClick={(e) => {
                // Handle middle-click (auxiliary click)
                if (e.button === 1) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(`/page/${row.id}`, '_blank');
                }
              }}
              className="h-8 w-8 p-0 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition-all duration-200"
              title="View List (Ctrl+Click or Middle-Click to open in new tab)"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row);
              }}
              className="h-8 w-8 p-0 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-all duration-200"
              title="Edit Schema"
            >
              <PencilRuler className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row);
              }}
              className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all duration-200"
              title="Delete Schema"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
    {
      id: 'icon',
      label: '',
      accessor: 'icon',
      sortable: false,
      align: 'center',
      width: 50,
      render: (_value: any, row: FormSchema) => {
        if (!row.icon) return null;
        return (
          <IconRenderer 
            iconName={row.icon} 
            className={`h-5 w-5 ${row.inactive ? 'text-gray-400' : 'text-violet-600 dark:text-violet-300'}`} 
          />
        );
      },
    },
    {
      id: 'plural_name',
      label: 'Name',
      accessor: 'plural_name',
      sortable: true,
      align: 'left',
      minWidth: 200,
      render: (_value: any, row: FormSchema) => {
        return (
          <div className="flex items-center gap-2">
            <span className={`font-medium ${row.inactive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {row.plural_name}
            </span>
            {row.inactive && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gray-300 text-gray-600">
                Inactive
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'singular_name',
      label: 'Singular Name',
      accessor: 'singular_name',
      sortable: true,
      align: 'left',
      minWidth: 150,
      render: (_value: any, row: FormSchema) => {
        return (
          <span className={row.inactive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}>
            {row.singular_name || '-'}
          </span>
        );
      },
    },
    {
      id: 'description',
      label: 'Description',
      accessor: 'description',
      sortable: false,
      align: 'left',
      minWidth: 200,
      render: (_value: any, row: FormSchema) => {
        return (
          <span className={`text-sm line-clamp-2 ${row.inactive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>
            {row.description || '-'}
          </span>
        );
      },
    },
    {
      id: 'sections',
      label: 'Sections',
      accessor: 'sectionsCount',
      sortable: true,
      align: 'center',
      width: 100,
      render: (_value: any, row: FormSchema) => {
        const count = row.sectionsCount ?? row.sections?.length ?? 0;
        return (
          <div className="flex items-center justify-center gap-1.5 text-sm">
            <Layers className="h-4 w-4 text-gray-400" />
            <span className={row.inactive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}>
              {count}
            </span>
          </div>
        );
      },
    },
    {
      id: 'fields',
      label: 'Fields',
      accessor: 'fieldsCount',
      sortable: true,
      align: 'center',
      width: 100,
      render: (_value: any, row: FormSchema) => {
        const count = row.fieldsCount ?? row.fields?.length ?? 0;
        return (
          <div className="flex items-center justify-center gap-1.5 text-sm">
            <Type className="h-4 w-4 text-gray-400" />
            <span className={row.inactive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}>
              {count}
            </span>
          </div>
        );
      },
    },
    {
      id: 'id',
      label: 'Schema ID',
      accessor: 'id',
      sortable: true,
      align: 'left',
      minWidth: 150,
      render: (_value: any, row: FormSchema) => {
        return (
          <code className={`text-xs px-2 py-1 rounded bg-violet-100 dark:bg-violet-300 ${
            row.inactive ? 'text-gray-500 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'
          }`}>
            {row.id}
          </code>
        );
      },
    },
  ], [onEdit, onView, onDelete]);

  const tableConfig: TableConfig<FormSchema> = useMemo(
    () => ({
      id: 'schemas-table',
      columns: tableColumns,
      data: schemas,
      pagination: {
        enabled: schemas.length > 10,
        pageSize: 10,
        showPageSizeSelector: true,
        pageSizeOptions: [5, 10, 25, 50],
        alwaysShow: false,
      },
      sorting: {
        enabled: true,
      },
      filtering: {
        enabled: false,
      },
      selection: {
        enabled: false,
      },
      emptyState: {
        message: 'No schemas found',
      },
      loading: isLoading,
      striped: true,
      hoverable: true,
      bordered: true,
    }),
    [schemas, tableColumns, isLoading]
  );

  return (
    <div className="w-full">
      <TableWrapper
        tableConfig={tableConfig}
        columns={tableColumns}
        data={schemas}
        showCards={false}
        disableAnimation={false}
        index={0}
        isLoading={isLoading}
      />
    </div>
  );
}

