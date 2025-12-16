'use client';

import { useMemo } from 'react';
import { TableWrapper, TableConfig, TableColumn } from '@/gradian-ui/data-display/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PencilRuler, Trash2, Sparkles, Code } from 'lucide-react';
import { AiAgent } from '../../types';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';

interface AiAgentTableViewProps {
  agents: AiAgent[];
  onEdit: (agent: AiAgent) => void;
  onView: (agent: AiAgent) => void;
  onDelete: (agent: AiAgent) => void;
  isLoading?: boolean;
}

export function AiAgentTableView({ agents, onEdit, onView, onDelete, isLoading = false }: AiAgentTableViewProps) {
  const tableColumns = useMemo<TableColumn<AiAgent>[]>(() => [
    {
      id: 'actions',
      label: 'Actions',
      accessor: 'id',
      sortable: false,
      align: 'center',
      width: 140,
      render: (_value: any, row: AiAgent) => {
        return (
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onView(row);
              }}
              className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
              title="View Agent"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row);
              }}
              className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
              title="Edit Agent"
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
              title="Delete Agent"
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
      render: (_value: any, row: AiAgent) => {
        return row.icon ? (
          <div className="flex items-center justify-center">
            <IconRenderer
              iconName={row.icon}
              className="h-5 w-5 text-blue-600 dark:text-blue-300"
            />
          </div>
        ) : null;
      },
    },
    {
      id: 'label',
      label: 'Label',
      accessor: 'label',
      sortable: true,
      width: 200,
      render: (_value: any, row: AiAgent) => {
        return (
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {row.label}
          </div>
        );
      },
    },
    {
      id: 'description',
      label: 'Description',
      accessor: 'description',
      sortable: true,
      width: 300,
      render: (_value: any, row: AiAgent) => {
        return (
          <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {row.description || '-'}
          </div>
        );
      },
    },
    {
      id: 'model',
      label: 'Model',
      accessor: 'model',
      sortable: true,
      width: 150,
      render: (_value: any, row: AiAgent) => {
        return row.model ? (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {row.model}
          </Badge>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      id: 'outputFormat',
      label: 'Output Format',
      accessor: 'requiredOutputFormat',
      sortable: true,
      width: 130,
      render: (_value: any, row: AiAgent) => {
        return row.requiredOutputFormat ? (
          <Badge variant="secondary" className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
            {row.requiredOutputFormat}
          </Badge>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      id: 'stats',
      label: 'Stats',
      accessor: 'id',
      sortable: false,
      width: 150,
      render: (_value: any, row: AiAgent) => {
        const renderComponentsCount = row.renderComponents?.length ?? 0;
        const preloadRoutesCount = row.preloadRoutes?.length ?? 0;
        return (
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {renderComponentsCount > 0 && (
              <div className="flex items-center gap-1">
                <Code className="h-3.5 w-3.5" />
                <span>{renderComponentsCount}</span>
              </div>
            )}
            {preloadRoutesCount > 0 && (
              <div className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{preloadRoutesCount}</span>
              </div>
            )}
            {renderComponentsCount === 0 && preloadRoutesCount === 0 && (
              <span className="text-gray-400">-</span>
            )}
          </div>
        );
      },
    },
  ], [onEdit, onView, onDelete]);

  const tableConfig: TableConfig<AiAgent> = useMemo(
    () => ({
      id: 'ai-agents-table',
      columns: tableColumns,
      data: agents,
      pagination: {
        enabled: agents.length > 10,
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
        message: 'No AI agents found',
      },
      loading: isLoading,
      striped: true,
      hoverable: true,
      bordered: true,
    }),
    [agents, tableColumns, isLoading]
  );

  return (
    <div className="w-full">
      <TableWrapper
        tableConfig={tableConfig}
        columns={tableColumns}
        data={agents}
        showCards={false}
        disableAnimation={false}
        index={0}
        isLoading={isLoading}
      />
    </div>
  );
}

