// Table Component

import React from 'react';
import { motion } from 'framer-motion';
import { TableProps, TableColumn } from '../types';
import { useTable } from '../hooks/useTable';
import { getCellValue } from '../utils';
import { cn } from '../../../shared/utils';
import { TableLoadingState } from './TableLoadingState';
import { TableEmptyState } from './TableEmptyState';
import { TableHeader } from './TableHeader';
import { TableBody } from './TableBody';
import { DynamicPagination } from '../../components/DynamicPagination';

export function Table<T = any>({
  config,
  className,
  onRowClick,
  onCellClick,
  highlightQuery,
}: TableProps<T>) {
  const {
    state,
    processedData,
    totalPages,
    totalItems,
    handleSort,
    goToPage,
    setPageSize,
    toggleRowSelection,
    selectAll,
    clearSelection,
  } = useTable({ config });

  const tableClasses = cn(
    'border-collapse',
    config.compact && 'text-sm',
    className
  );

  // Use auto table layout to let columns size based on their content
  // This allows horizontal scrolling when columns exceed viewport width
  const tableStyle: React.CSSProperties = {
    tableLayout: 'auto',
    width: '-webkit-fill-available', // Let table width be determined by column content
  };

  const containerClasses = cn(
    'overflow-x-auto w-full',
    config.bordered && 'border border-gray-200 dark:border-gray-700 rounded-lg m-2',
    className
  );

  if (config.loading) {
    return <TableLoadingState />;
  }

  if (processedData.length === 0 && !config.hideEmptyState) {
    return (
      <TableEmptyState
        message={config.emptyState?.message || 'No data available'}
        icon={config.emptyState?.icon}
      />
    );
  }

  // If hideEmptyState is true and there's no data, return null to let parent handle empty state
  if (processedData.length === 0 && config.hideEmptyState) {
    return null;
  }

  return (
    <div className={containerClasses} style={{ width: '-webkit-fill-available' }}>
      <table className={tableClasses} style={tableStyle}>
        <TableHeader
          columns={config.columns}
          sortBy={state.sortBy}
          sortDirection={state.sortDirection}
          onSort={config.sorting?.enabled ? handleSort : undefined}
          stickyHeader={config.stickyHeader}
          selectionEnabled={config.selection?.enabled}
          allSelected={state.selectedRows.size === processedData.length && processedData.length > 0}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          striped={config.striped}
          bordered={config.bordered}
        />
        <TableBody
          data={processedData}
          columns={config.columns}
          selectedRows={state.selectedRows}
          onRowClick={onRowClick}
          onCellClick={onCellClick}
          onRowSelect={config.selection?.enabled ? toggleRowSelection : undefined}
          striped={config.striped}
          hoverable={config.hoverable}
          bordered={config.bordered}
          highlightQuery={highlightQuery}
        />
      </table>

      {config.pagination?.enabled && (config.pagination.alwaysShow || totalPages > 1 || state.pageSize === 'all') && (
        <DynamicPagination
          currentPage={state.page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={state.pageSize}
          pageSizeOptions={config.pagination.pageSizeOptions || [10, 25, 50, 100, 'all']}
          showPageSizeSelector={config.pagination.showPageSizeSelector}
          onPageChange={goToPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}

Table.displayName = 'Table';

