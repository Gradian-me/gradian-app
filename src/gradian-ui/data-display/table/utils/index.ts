// Table Viewer Utilities

import { TableColumn, TableConfig } from '../types';
import { extractLabels } from '../../../form-builder/form-elements/utils/option-normalizer';

export * from './column-config';
export * from './field-formatters';
export * from './column-builder';

const toComparableString = (input: any): string => {
  if (input === null || input === undefined) return '';
  const isStructured = Array.isArray(input) || (typeof input === 'object' && input !== null);
  if (isStructured) {
    const labels = extractLabels(input);
    if (labels.length > 0) {
      return labels.join(', ');
    }
    if (Array.isArray(input)) {
      return input.map(entry => toComparableString(entry)).join(', ');
    }
    try {
      return JSON.stringify(input);
    } catch {
      return String(input);
    }
  }
  return String(input);
};

/**
 * Get value from row using column accessor
 */
export function getCellValue<T>(
  row: T,
  column: TableColumn<T>
): any {
  if (typeof column.accessor === 'function') {
    return column.accessor(row);
  }
  return row[column.accessor];
}

/**
 * Sort data based on sort configuration
 */
export function sortData<T>(
  data: T[],
  sortBy: string | null,
  sortDirection: 'asc' | 'desc',
  columns: TableColumn<T>[]
): T[] {
  if (!sortBy) return data;

  const column = columns.find(col => col.id === sortBy);
  if (!column || !column.sortable) return data;

  const sorted = [...data].sort((a, b) => {
    const aValue = getCellValue(a, column);
    const bValue = getCellValue(b, column);

    // Handle null/undefined values
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    // Compare values
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    const aStr = toComparableString(aValue).toLowerCase();
    const bStr = toComparableString(bValue).toLowerCase();

    if (sortDirection === 'asc') {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });

  return sorted;
}

/**
 * Filter data based on global search and column filters
 */
export function filterData<T>(
  data: T[],
  globalFilter: string,
  columnFilters: Record<string, any>,
  columns: TableColumn<T>[]
): T[] {
  let filtered = data;

  // Apply global search
  if (globalFilter) {
    const searchLower = globalFilter.toLowerCase();
    filtered = filtered.filter(row => {
      return columns.some(column => {
        const value = getCellValue(row, column);
        return toComparableString(value).toLowerCase().includes(searchLower);
      });
    });
  }

  // Apply column filters
  Object.entries(columnFilters).forEach(([columnId, filterValue]) => {
    if (filterValue === null || filterValue === undefined || filterValue === '') {
      return;
    }

    const column = columns.find(col => col.id === columnId);
    if (!column) return;

    const filterLower = String(filterValue).toLowerCase();
    filtered = filtered.filter(row => {
      const value = getCellValue(row, column);
      return toComparableString(value).toLowerCase().includes(filterLower);
    });
  });

  return filtered;
}

/**
 * Paginate data
 */
export function paginateData<T>(
  data: T[],
  page: number,
  pageSize: number | 'all'
): { paginatedData: T[]; totalPages: number; totalItems: number } {
  const totalItems = data.length;
  
  if (pageSize === 'all') {
    return {
      paginatedData: data,
      totalPages: 1,
      totalItems,
    };
  }
  
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);

  return { paginatedData, totalPages, totalItems };
}

/**
 * Process table data with sorting, filtering, and pagination
 */
export function processTableData<T>(
  data: T[],
  config: TableConfig<T>,
  state: {
    page: number;
    pageSize: number | 'all';
    sortBy: string | null;
    sortDirection: 'asc' | 'desc';
    globalFilter: string;
    columnFilters: Record<string, any>;
  }
): {
  processedData: T[];
  totalPages: number;
  totalItems: number;
} {
  let processed = [...data];

  // Apply filtering
  if (config.filtering?.enabled) {
    processed = filterData(
      processed,
      state.globalFilter,
      state.columnFilters,
      config.columns
    );
  }

  // Apply sorting
  if (config.sorting?.enabled && state.sortBy) {
    processed = sortData(
      processed,
      state.sortBy,
      state.sortDirection,
      config.columns
    );
  }

  // Apply pagination
  if (config.pagination?.enabled) {
    const paginationResult = paginateData(processed, state.page, state.pageSize);
    return {
      processedData: paginationResult.paginatedData,
      totalPages: paginationResult.totalPages,
      totalItems: paginationResult.totalItems,
    };
  }

  return {
    processedData: processed,
    totalPages: 1,
    totalItems: processed.length,
  };
}

