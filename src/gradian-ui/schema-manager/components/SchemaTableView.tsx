'use client';

import { useMemo } from 'react';
import { TableWrapper, TableConfig, TableColumn } from '@/gradian-ui/data-display/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PencilRuler, LayoutList, Trash2, Database, Users2 } from 'lucide-react';
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
        const isActionForm = row.schemaType === 'action-form';
        return (
          <div className="flex items-center justify-center gap-1">
            {!isActionForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (e.button === 1 || e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    window.open(`/page/${row.id}`, '_blank', 'noopener,noreferrer');
                    return;
                  }
                  onView(row);
                }}
                onMouseDown={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(`/page/${row.id}`, '_blank', 'noopener,noreferrer');
                  }
                }}
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(`/page/${row.id}`, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="h-8 w-8 p-0 transition-all duration-200 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                title="View List (Ctrl+Click or Middle-Click to open in new tab)"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (e.button === 1 || e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                  window.open(`/builder/schemas/${row.id}`, '_blank', 'noopener,noreferrer');
                  return;
                }
                onEdit(row);
              }}
              onMouseDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(`/builder/schemas/${row.id}`, '_blank', 'noopener,noreferrer');
                }
              }}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(`/builder/schemas/${row.id}`, '_blank', 'noopener,noreferrer');
                }
              }}
              className="h-8 w-8 p-0 transition-all duration-200 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800 dark:hover:border-violet-600 dark:hover:bg-violet-900/30 dark:hover:text-violet-100"
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
              className="h-8 w-8 p-0 transition-all duration-200 hover:border-red-300 hover:bg-red-50 hover:text-red-800 dark:hover:border-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-100"
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
      id: 'relatedTenants',
      label: 'Tenants',
      accessor: 'relatedTenants',
      sortable: true,
      align: 'left',
      minWidth: 160,
      render: (_value: any, row: FormSchema) => {
        if (row.applyToAllTenants) {
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <Users2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className={row.inactive ? 'text-gray-400 dark:text-gray-500' : 'text-emerald-700 dark:text-emerald-300'}>
                All tenants
              </span>
            </div>
          );
        }

        const tenants = row.relatedTenants || [];
        if (!tenants.length) {
          return (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Not set
            </span>
          );
        }

        const primary = tenants[0];
        const extraCount = tenants.length - 1;

        return (
          <div className="flex items-center gap-1.5 text-xs">
            <Users2 className="h-3.5 w-3.5 text-gray-400" />
            <span className={row.inactive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}>
              {primary.label || primary.id}
              {extraCount > 0 && (
                <span className="text-gray-400 dark:text-gray-500">
                  {` +${extraCount}`}
                </span>
              )}
          </span>
          </div>
        );
      },
    },
    {
      id: 'syncStrategy',
      label: 'Sync Strategy',
      accessor: 'syncStrategy',
      sortable: true,
      align: 'left',
      minWidth: 140,
      render: (_value: any, row: FormSchema) => {
        const strategy = row.syncStrategy || 'schema-only';
        const isSchemaOnly = strategy === 'schema-only';

        return (
          <div className="flex items-center gap-1.5 text-xs">
            <Database className={`h-3.5 w-3.5 ${isSchemaOnly ? 'text-blue-500' : 'text-purple-500'}`} />
            <span className={row.inactive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}>
              {isSchemaOnly ? 'Schema only' : 'Schema & data'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'description',
      label: 'Description',
      accessor: 'description',
      sortable: true,
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
      id: 'id',
      label: 'Schema ID',
      accessor: 'id',
      sortable: true,
      align: 'left',
      minWidth: 150,
      render: (_value: any, row: FormSchema) => {
        return (
          <code className={`text-xs px-2 py-1 rounded bg-violet-100 dark:bg-violet-900/30 ${
            row.inactive ? 'text-gray-500 dark:text-gray-500' : 'text-gray-700 dark:text-violet-200'
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
        pageSize: 25,
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

