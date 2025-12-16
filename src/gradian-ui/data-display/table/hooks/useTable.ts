// Table Viewer Hook

import { useState, useMemo, useCallback } from 'react';
import { TableConfig, TableState } from '../types';
import { processTableData } from '../utils';

export interface UseTableOptions<T = any> {
  config: TableConfig<T>;
  onStateChange?: (state: TableState) => void;
}

export function useTable<T = any>({ config, onStateChange }: UseTableOptions<T>) {
  const [state, setState] = useState<TableState>(() => {
    const initialState: TableState = {
      page: 1,
      pageSize: config.pagination?.pageSize || 25,
      sortBy: config.sorting?.defaultSort?.columnId || null,
      sortDirection: config.sorting?.defaultSort?.direction || 'asc',
      selectedRows: new Set(),
      globalFilter: '',
      columnFilters: {},
    };
    return initialState;
  });

  // Process data with current state
  const processedData = useMemo(() => {
    const result = processTableData(config.data, config, state);
    return result;
  }, [config.data, config, state]);

  // Update state helper
  const updateState = useCallback(
    (updates: Partial<TableState>) => {
      setState(prev => {
        const newState = { ...prev, ...updates };
        onStateChange?.(newState);
        return newState;
      });
    },
    [onStateChange]
  );

  // Sorting handlers
  const handleSort = useCallback(
    (columnId: string) => {
      setState(prev => {
        const newSortBy = prev.sortBy === columnId ? prev.sortBy : columnId;
        const newDirection: 'asc' | 'desc' =
          prev.sortBy === columnId && prev.sortDirection === 'asc' ? 'desc' : 'asc';
        const newState = {
          ...prev,
          sortBy: newSortBy,
          sortDirection: newDirection,
        };
        onStateChange?.(newState);
        return newState;
      });
    },
    [onStateChange]
  );

  // Pagination handlers
  const goToPage = useCallback(
    (page: number) => {
      updateState({ page });
    },
    [updateState]
  );

  const setPageSize = useCallback(
    (pageSize: number | 'all') => {
      updateState({ pageSize, page: 1 });
    },
    [updateState]
  );

  // Selection handlers
  const toggleRowSelection = useCallback(
    (index: number) => {
      setState(prev => {
        const newSelected = new Set(prev.selectedRows);
        if (newSelected.has(index)) {
          newSelected.delete(index);
        } else {
          if (config.selection?.multiple) {
            newSelected.add(index);
          } else {
            return { ...prev, selectedRows: new Set([index]) };
          }
        }
        const newState = { ...prev, selectedRows: newSelected };
        onStateChange?.(newState);
        return newState;
      });
    },
    [config.selection?.multiple, onStateChange]
  );

  const selectAll = useCallback(() => {
    setState(prev => {
      const allSelected = new Set(processedData.processedData.map((_, idx) => idx));
      const newState = { ...prev, selectedRows: allSelected };
      onStateChange?.(newState);
      return newState;
    });
  }, [processedData.processedData, onStateChange]);

  const clearSelection = useCallback(() => {
    updateState({ selectedRows: new Set() });
  }, [updateState]);

  // Filter handlers
  const setGlobalFilter = useCallback(
    (filter: string) => {
      updateState({ globalFilter: filter, page: 1 });
    },
    [updateState]
  );

  const setColumnFilter = useCallback(
    (columnId: string, value: any) => {
      setState(prev => {
        const newFilters = { ...prev.columnFilters, [columnId]: value };
        const newState = { ...prev, columnFilters: newFilters, page: 1 };
        onStateChange?.(newState);
        return newState;
      });
    },
    [onStateChange]
  );

  const clearFilters = useCallback(() => {
    updateState({ globalFilter: '', columnFilters: {}, page: 1 });
  }, [updateState]);

  return {
    state,
    processedData: processedData.processedData,
    totalPages: processedData.totalPages,
    totalItems: processedData.totalItems,
    handleSort,
    goToPage,
    setPageSize,
    toggleRowSelection,
    selectAll,
    clearSelection,
    setGlobalFilter,
    setColumnFilter,
    clearFilters,
  };
}

