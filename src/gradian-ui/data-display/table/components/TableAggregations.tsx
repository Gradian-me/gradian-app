// Table Aggregations Component
// Shows aggregation results for specified columns

import React from 'react';
import { TableColumn } from '../types';
import { getCellValue } from '../utils';
import { cn, formatNumber } from '../../../shared/utils';

export interface AggregationConfig {
  column: string; // Column ID (field ID)
  aggregationTypes: Array<'sum' | 'avg' | 'min' | 'max' | 'first' | 'last' | 'count' | 'countdistinct' | 'stdev'>;
  unit?: string; // Unit to display after the value (e.g., "USD", "%", "kg")
  precision?: number; // Number of decimal places (default: 2)
}

export interface TableAggregationsProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  aggregations: AggregationConfig[];
  alignment?: 'start' | 'center' | 'end';
  gridColumns?: 1 | 2 | 3;
  className?: string;
}

/**
 * Calculate aggregation value
 */
function calculateAggregation(
  values: any[],
  aggregationType: 'sum' | 'avg' | 'min' | 'max' | 'first' | 'last' | 'count' | 'countdistinct' | 'stdev'
): number | string {
  // Filter out null/undefined values and convert to numbers where possible
  const numericValues = values
    .filter(v => v !== null && v !== undefined && v !== '')
    .map(v => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        // Try to parse currency, percentage, or number strings
        const cleaned = v.replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    })
    .filter(v => v !== null) as number[];

  switch (aggregationType) {
    case 'sum':
      return numericValues.reduce((acc, val) => acc + val, 0);
    
    case 'avg':
      return numericValues.length > 0
        ? numericValues.reduce((acc, val) => acc + val, 0) / numericValues.length
        : 0;
    
    case 'min':
      return numericValues.length > 0 ? Math.min(...numericValues) : 0;
    
    case 'max':
      return numericValues.length > 0 ? Math.max(...numericValues) : 0;
    
    case 'first':
      return values[0] ?? '';
    
    case 'last':
      return values[values.length - 1] ?? '';
    
    case 'count':
      return values.filter(v => v !== null && v !== undefined && v !== '').length;
    
    case 'countdistinct': {
      const distinct = new Set(values.filter(v => v !== null && v !== undefined && v !== ''));
      return distinct.size;
    }
    
    case 'stdev': {
      if (numericValues.length === 0) return 0;
      const avg = numericValues.reduce((acc, val) => acc + val, 0) / numericValues.length;
      const squaredDiffs = numericValues.map(val => Math.pow(val - avg, 2));
      const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / numericValues.length;
      return Math.sqrt(avgSquaredDiff);
    }
    
    default:
      return 0;
  }
}

/**
 * Format aggregation value based on type
 */
function formatAggregationValue(
  value: number | string,
  aggregationType: string,
  column: TableColumn,
  config?: AggregationConfig
): React.ReactNode {
  if (aggregationType === 'first' || aggregationType === 'last') {
    return <span className="text-gray-900">{String(value)}</span>;
  }

  const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
  const precision = config?.precision ?? 2;

  // Check if column is currency type (you might need to pass field type here)
  // For now, we'll use number formatting
  if (aggregationType === 'count' || aggregationType === 'countdistinct') {
    const formatted = formatNumber(numValue, {
      useGrouping: true, // Always use thousand separators
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    return <span className="text-gray-900 font-medium">{formatted}</span>;
  }

  // Format as number with specified precision and always use thousand separators
  const formatted = formatNumber(numValue, {
    useGrouping: true, // Always use thousand separators
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  });

  const unit = config?.unit ? ` ${config.unit}` : '';

  return <span className="text-gray-900 font-medium">{formatted}{unit}</span>;
}

/**
 * Get aggregation label
 */
function getAggregationLabel(type: string): string {
  const labels: Record<string, string> = {
    sum: 'Sum',
    avg: 'Average',
    min: 'Min',
    max: 'Max',
    first: 'First',
    last: 'Last',
    count: 'Count',
    countdistinct: 'Distinct Count',
    stdev: 'Std Dev',
  };
  return labels[type] || type;
}

export function TableAggregations<T = any>({
  data,
  columns,
  aggregations,
  alignment = 'end',
  gridColumns = 3,
  className,
}: TableAggregationsProps<T>) {
  if (!aggregations || aggregations.length === 0 || data.length === 0) {
    return null;
  }

  // Grid classes for aggregation columns
  const gridClasses = cn(
    "grid gap-4",
    gridColumns === 1 && "grid-cols-1",
    gridColumns === 2 && "grid-cols-1 sm:grid-cols-2",
    gridColumns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
  );

  return (
    <div className={cn("border-t border-gray-200", className)}>
      <div className="px-4 py-3">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Aggregations</h4>
        <div className={gridClasses}>
          {aggregations.map((aggConfig, aggIndex) => {
            const column = columns.find(col => col.id === aggConfig.column);
            if (!column) return null;

            // Get all values for this column
            const values = data.map(row => getCellValue(row, column));

            const hasSingleAggregation = aggConfig.aggregationTypes.length === 1;

            return (
              <div 
                key={aggIndex} 
                className={cn(
                  "space-y-2",
                  aggIndex >= 0 && "border-e border-gray-300 pe-4"
                )}
              >
                {hasSingleAggregation ? (
                  // Single aggregation: show column name with aggregation in parenthesis on one line
                  <div className={cn(
                    "flex items-center text-sm",
                    alignment === 'start' && "justify-start",
                    alignment === 'center' && "justify-center",
                    alignment === 'end' && "justify-between"
                  )}>
                    <span className="text-gray-700 font-medium">
                      {column.label}
                      <span className="text-gray-400 font-normal text-sm ms-1">
                        ({getAggregationLabel(aggConfig.aggregationTypes[0])})
                      </span>:
                    </span>
                    <span className={cn(
                      "text-gray-900 font-medium",
                      alignment === 'start' && "ms-2",
                      alignment === 'center' && "ms-2"
                    )}>
                      {formatAggregationValue(
                        calculateAggregation(values, aggConfig.aggregationTypes[0]),
                        aggConfig.aggregationTypes[0],
                        column,
                        aggConfig
                      )}
                    </span>
                  </div>
                ) : (
                  // Multiple aggregations: show column name as header, then list aggregations
                  <>
                    <div className="text-sm font-medium text-gray-700">
                      {column.label}
                    </div>
                    <div className="space-y-1">
                      {aggConfig.aggregationTypes.map((aggType) => {
                        const aggValue = calculateAggregation(values, aggType);
                        return (
                          <div
                            key={aggType}
                            className={cn(
                              "flex items-center text-sm",
                              alignment === 'start' && "justify-start",
                              alignment === 'center' && "justify-center",
                              alignment === 'end' && "justify-between"
                            )}
                          >
                            <span className={cn(
                              "text-gray-400 font-normal text-sm",
                              alignment === 'center' && "me-2",
                              alignment === 'start' && "me-2"
                            )}>
                              {getAggregationLabel(aggType)}:
                            </span>
                            <span className="text-gray-900 font-medium">
                              {formatAggregationValue(aggValue, aggType, column, aggConfig)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

TableAggregations.displayName = 'TableAggregations';

