'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/gradian-ui/shared/utils';

interface FlatTableSkeletonProps {
  schemaCount?: number;
  columnCountPerSchema?: number;
  rowCount?: number;
  showIds?: boolean;
}

export function FlatTableSkeleton({
  schemaCount = 3,
  columnCountPerSchema = 4,
  rowCount = 5,
  showIds = false,
}: FlatTableSkeletonProps) {
  // Calculate columns: each schema has columnCountPerSchema columns, plus 1 ID column if showIds is true
  const columnsPerSchema = showIds ? columnCountPerSchema + 1 : columnCountPerSchema;
  const totalColumns = schemaCount * columnsPerSchema;

  // Build column structure: for each schema, ID column first (if showIds), then regular columns
  const buildColumns = () => {
    const columns: Array<{ isId: boolean; schemaIndex: number }> = [];
    for (let schemaIndex = 0; schemaIndex < schemaCount; schemaIndex++) {
      if (showIds) {
        columns.push({ isId: true, schemaIndex });
      }
      for (let colIndex = 0; colIndex < columnCountPerSchema; colIndex++) {
        columns.push({ isId: false, schemaIndex });
      }
    }
    return columns;
  };

  const columns = buildColumns();

  return (
    <div className="w-full">
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto overflow-y-hidden w-full">
        <table className="border-collapse" style={{ tableLayout: 'auto', width: '-webkit-fill-available' }}>
          {/* Schema header row */}
          <thead>
            <tr className="bg-violet-200 dark:bg-violet-950/90 border-b border-gray-200 dark:border-gray-700">
              {Array.from({ length: schemaCount }).map((_, schemaIndex) => {
                const isLast = schemaIndex === schemaCount - 1;
                const colSpan = columnsPerSchema;
                
                return (
                  <th
                    key={`schema-header-${schemaIndex}`}
                    colSpan={colSpan}
                    className={cn(
                      'px-4 py-3 text-start text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider',
                      isLast ? 'border-r-0' : 'border-r-2 border-violet-300 dark:border-violet-600'
                    )}
                  >
                    <Skeleton className="h-4 w-32" />
                  </th>
                );
              })}
            </tr>
            {/* Column header row */}
            <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
              {columns.map((col, colIndex) => {
                const isLastColumn = colIndex === totalColumns - 1;
                // Check if this is the last column of a schema group
                const isLastInSchema = (colIndex + 1) % columnsPerSchema === 0;
                
                return (
                  <th
                    key={`column-header-${colIndex}`}
                    className={cn(
                      'px-4 py-3 text-start text-xs font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider',
                      isLastColumn ? 'border-r-0' : isLastInSchema 
                        ? 'border-r-2 border-violet-300 dark:border-violet-600' 
                        : 'border-r border-gray-200 dark:border-gray-700'
                    )}
                  >
                    <Skeleton className={cn('h-3', col.isId ? 'w-8' : 'w-20')} />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <tr
                key={`skeleton-row-${rowIndex}`}
                className={cn(
                  'transition-colors border-b border-gray-200 dark:border-gray-700',
                  rowIndex % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'
                )}
              >
                {columns.map((col, colIndex) => {
                  const isLastColumn = colIndex === totalColumns - 1;
                  const isLastInSchema = (colIndex + 1) % columnsPerSchema === 0;
                  
                  // Vary skeleton widths for more realistic appearance
                  const widthClasses = [
                    'w-16', 'w-24', 'w-32', 'w-20', 'w-28', 'w-36', 'w-40', 'w-24', 'w-20', 'w-32'
                  ];
                  const widthClass = widthClasses[colIndex % widthClasses.length];
                  
                  return (
                    <td
                      key={`skeleton-cell-${rowIndex}-${colIndex}`}
                      className={cn(
                        'p-3 text-xs text-gray-900 dark:text-gray-200',
                        isLastColumn ? 'border-r-0' : isLastInSchema 
                          ? 'border-r-2 border-violet-300 dark:border-violet-600' 
                          : 'border-r border-gray-200 dark:border-gray-700'
                      )}
                    >
                      <Skeleton className={cn('h-4', col.isId ? 'w-40' : widthClass)} />
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

