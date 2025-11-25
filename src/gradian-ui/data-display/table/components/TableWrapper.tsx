import React from 'react';
import { LoadingSkeleton } from '@/gradian-ui/layout/components';
import { Skeleton } from '@/components/ui/skeleton';
import { Table } from './Table';
import { TableAggregations, AggregationConfig } from './TableAggregations';
import { TableCardView } from '../../components/TableCardView';
import { TableColumn, TableConfig } from '../types';

export interface TableWrapperProps<T = any> {
  tableConfig: TableConfig<T>;
  columns: TableColumn<T>[];
  data: T[];
  showCards: boolean;
  cardColumns?: 1 | 2 | 3;
  disableAnimation?: boolean;
  index?: number;
  aggregations?: AggregationConfig[];
  aggregationAlignment?: 'start' | 'center' | 'end';
  aggregationColumns?: 1 | 2 | 3;
  isLoading?: boolean;
  skeletonRowCount?: number;
  skeletonCardCount?: number;
  onRowClick?: (row: T, index: number) => void;
  highlightQuery?: string;
}

export function TableWrapper<T = any>({
  tableConfig,
  columns,
  data,
  showCards,
  cardColumns = 2,
  disableAnimation = false,
  index = 0,
  aggregations = [],
  aggregationAlignment = 'end',
  aggregationColumns = 3,
  isLoading = false,
  skeletonRowCount,
  skeletonCardCount,
  onRowClick,
  highlightQuery,
}: TableWrapperProps<T>) {
  const effectiveColumnCount = Math.max(
    1,
    tableConfig.columns?.length || columns.length || 4
  );

  const effectiveRowCount = skeletonRowCount || 2;
  const effectiveCardCount = skeletonCardCount || Math.min(6, Math.max(3, data.length || effectiveRowCount));

  if (isLoading) {
    return (
      <>
        {showCards ? (
          <TableCardSkeleton count={effectiveCardCount} columnCount={effectiveColumnCount} cardColumns={cardColumns} />
        ) : (
          <LoadingSkeleton variant="table" count={effectiveRowCount} />
        )}
        {aggregations.length > 0 && (
          <AggregationSkeleton count={aggregations.length} gridColumns={aggregationColumns} />
        )}
      </>
    );
  }

  return (
    <>
      {showCards ? (
        <>
          <TableCardView
            data={data}
            columns={columns}
            cardColumns={cardColumns}
            disableAnimation={disableAnimation}
            index={index}
          />
          {aggregations.length > 0 && (
            <TableAggregations
              data={data}
              columns={columns}
              aggregations={aggregations}
              alignment={aggregationAlignment}
              gridColumns={aggregationColumns}
            />
          )}
        </>
      ) : (
        <>
          <div className="mx-0 min-w-0">
            <Table config={tableConfig} onRowClick={onRowClick} highlightQuery={highlightQuery} />
          </div>
          {aggregations.length > 0 && (
            <TableAggregations
              data={data}
              columns={columns}
              aggregations={aggregations}
              alignment={aggregationAlignment}
              gridColumns={aggregationColumns}
            />
          )}
        </>
      )}
    </>
  );
}

TableWrapper.displayName = 'TableWrapper';



interface TableCardSkeletonProps {
  count: number;
  columnCount: number;
  cardColumns: 1 | 2 | 3;
}

function TableCardSkeleton({ count, columnCount, cardColumns }: TableCardSkeletonProps) {
  // Limit skeleton columns to a maximum of 4 for cleaner appearance
  const skeletonColumnCount = Math.min(columnCount, 7);
  const columnsPerRow = Math.min(skeletonColumnCount, cardColumns * 2);
  return (
    <div className="grid grid-cols-1 gap-3 p-2 lg:p-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`card-${index}`}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, columnsPerRow)}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: skeletonColumnCount }).map((_, colIndex) => (
              <div key={`card-cell-${index}-${colIndex}`} className="flex items-center">
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface AggregationSkeletonProps {
  count: number;
  gridColumns: 1 | 2 | 3;
}

function AggregationSkeleton({ count, gridColumns }: AggregationSkeletonProps) {
  const items = Array.from({ length: count });
  return (
    <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-4">
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
      >
        {items.map((_, index) => (
          <div
            key={`aggregation-${index}`}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm space-y-3"
          >
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}


