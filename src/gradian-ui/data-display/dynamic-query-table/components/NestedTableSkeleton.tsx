'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/gradian-ui/shared/utils';

interface NestedTableSkeletonProps {
  columnCount?: number;
  rowCount?: number;
  showIds?: boolean;
}

export function NestedTableSkeleton({
  columnCount = 5,
  rowCount = 5,
  showIds = false,
}: NestedTableSkeletonProps) {
  // Calculate total columns: expand/collapse column + ID column (if showIds) + regular columns
  const totalColumns = 1 + (showIds ? 1 : 0) + columnCount;

  return (
    <div className="w-full">
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto overflow-y-hidden w-full">
        <table className="border-collapse" style={{ tableLayout: 'auto', width: '-webkit-fill-available' }}>
          <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
            <tr>
              {/* Expand/collapse column */}
              <th className="w-10 px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200"></th>
              {/* ID column header (if showIds) */}
              {showIds && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700">
                  <Skeleton className="h-3 w-8" />
                </th>
              )}
              {/* Regular column headers */}
              {Array.from({ length: columnCount }).map((_, colIndex) => (
                <th
                  key={`column-header-${colIndex}`}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700',
                    colIndex === columnCount - 1 && 'last:border-r-0'
                  )}
                >
                  <Skeleton className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <tr
                key={`skeleton-row-${rowIndex}`}
                className={cn(
                  'transition-colors border-b border-gray-200 dark:border-gray-700',
                  rowIndex % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900',
                  'hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                {/* Expand/collapse cell */}
                <td className="p-3">
                  <Skeleton className="w-6 h-6 rounded" />
                </td>
                {/* ID column cell (if showIds) */}
                {showIds && (
                  <td className="p-3 text-xs text-gray-900 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700">
                    <Skeleton className="h-4 w-40" />
                  </td>
                )}
                {/* Regular data cells */}
                {Array.from({ length: columnCount }).map((_, colIndex) => {
                  // Vary skeleton widths for more realistic appearance
                  const widthClasses = [
                    'w-16', 'w-24', 'w-32', 'w-20', 'w-28', 'w-36', 'w-40', 'w-24', 'w-20', 'w-32'
                  ];
                  const widthClass = widthClasses[colIndex % widthClasses.length];
                  
                  return (
                    <td
                      key={`skeleton-cell-${rowIndex}-${colIndex}`}
                      className={cn(
                        'p-3 text-xs text-gray-900 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700',
                        colIndex === columnCount - 1 && 'last:border-r-0'
                      )}
                    >
                      <Skeleton className={cn('h-4', widthClass)} />
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

