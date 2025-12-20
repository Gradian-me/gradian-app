// Data Display Wrapper Component

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DataDisplayWrapperProps, DataDisplayState, DataDisplayFilters } from '../types';
import { DataDisplayFilterPane } from './DataDisplayFilterPane';
import { DataDisplayViewSwitch } from './DataDisplayViewSwitch';
import { DataDisplayContainer } from './DataDisplayContainer';
import { DataDisplayPagination } from './DataDisplayPagination';
import { DataDisplayEmptyState } from './DataDisplayEmptyState';
import { DataDisplayLoadingState } from './DataDisplayLoadingState';
import { DataDisplayErrorState } from './DataDisplayErrorState';
import { cn, debounce } from '../../shared/utils';
import { DEFAULT_LIMIT } from '@/gradian-ui/shared/utils/pagination-utils';

export const DataDisplayWrapper: React.FC<DataDisplayWrapperProps> = ({
  config,
  data = [],
  loading = false,
  error = null,
  onDataChange,
  onFilterChange,
  onViewChange,
  onAddNew,
  onRefresh,
  className,
  ...props
}) => {
  const {
    views = [],
    filters = [],
    search = { enabled: true },
    actions = [],
    pagination = { enabled: false },
    layout,
    styling = {},
    behavior = {},
  } = config;

  // State management
  const [state, setState] = useState<DataDisplayState>({
    data,
    filteredData: data,
    loading,
    error,
    currentView: views[0] || { id: 'card', name: 'Card', label: 'Card', component: 'card', config: {} },
    filters: {},
    pagination: {
      currentPage: 1,
      pageSize: pagination.pageSize || DEFAULT_LIMIT,
      totalPages: Math.ceil(data.length / (pagination.pageSize || DEFAULT_LIMIT)),
      totalItems: data.length,
    },
    selection: [],
    sorting: {
      field: behavior.sorting?.defaultSort?.field || null,
      direction: behavior.sorting?.defaultSort?.direction || 'asc',
    },
    grouping: {
      field: behavior.grouping?.defaultGroup || null,
      groups: {},
    },
  });

  // Debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce((searchTerm: string) => {
        setState(prev => ({
          ...prev,
          filters: { ...prev.filters, search: searchTerm },
        }));
      }, search.debounceMs || 600),
    [search.debounceMs]
  );

  // Filter and search data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (state.filters.search && search.enabled) {
      const searchTerm = state.filters.search.toLowerCase();
      const searchFields = search.fields || ['name', 'title', 'description'];
      
      result = result.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          return value && value.toString().toLowerCase().includes(searchTerm);
        })
      );
    }

    // Apply filters
    filters.forEach(filter => {
      const filterValue = state.filters[filter.id];
      if (filterValue !== undefined && filterValue !== null && filterValue !== '') {
        if (filter.type === 'multiselect') {
          result = result.filter(item => 
            Array.isArray(filterValue) && filterValue.includes(item[filter.name])
          );
        } else if (filter.type === 'daterange') {
          const [start, end] = filterValue;
          result = result.filter(item => {
            const itemDate = new Date(item[filter.name]);
            return itemDate >= start && itemDate <= end;
          });
        } else {
          result = result.filter(item => item[filter.name] === filterValue);
        }
      }
    });

    // Apply sorting
    if (state.sorting.field) {
      result.sort((a, b) => {
        const aVal = a[state.sorting.field!];
        const bVal = b[state.sorting.field!];
        const direction = state.sorting.direction === 'asc' ? 1 : -1;
        
        if (aVal < bVal) return -1 * direction;
        if (aVal > bVal) return 1 * direction;
        return 0;
      });
    }

    return result;
  }, [data, state.filters, state.sorting, filters, search]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination.enabled) return filteredData;
    
    const start = (state.pagination.currentPage - 1) * state.pagination.pageSize;
    const end = start + state.pagination.pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, state.pagination, pagination.enabled]);

  // Update state when props change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      data,
      loading,
      error,
      pagination: {
        ...prev.pagination,
        totalPages: Math.ceil(filteredData.length / prev.pagination.pageSize),
        totalItems: filteredData.length,
      },
    }));
  }, [data, loading, error, filteredData.length]);

  // Auto-refresh
  useEffect(() => {
    if (behavior.autoRefresh?.enabled && onRefresh) {
      const interval = setInterval(onRefresh, behavior.autoRefresh.interval);
      return () => clearInterval(interval);
    }
  }, [behavior.autoRefresh, onRefresh]);

  // Event handlers
  const handleFilterChange = useCallback((newFilters: DataDisplayFilters) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      pagination: { ...prev.pagination, currentPage: 1 },
    }));
    onFilterChange?.(newFilters);
  }, [onFilterChange]);

  const handleSearch = useCallback((searchTerm: string) => {
    if (search.enabled) {
      debouncedSearch(searchTerm);
    }
  }, [debouncedSearch, search.enabled]);

  const handleViewChange = useCallback((view: any) => {
    setState(prev => ({ ...prev, currentView: view }));
    onViewChange?.(view);
  }, [onViewChange]);

  const handlePageChange = useCallback((page: number) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, currentPage: page },
    }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, pageSize, currentPage: 1 },
    }));
  }, []);

  const handleItemClick = useCallback((item: any) => {
    // Handle item click logic
    console.log('Item clicked:', item);
  }, []);

  const handleItemAction = useCallback((action: string, item: any) => {
    // Handle item action logic
    console.log('Item action:', action, item);
  }, []);

  // Render states
  if (loading && data.length === 0) {
    return <DataDisplayLoadingState />;
  }

  if (error) {
    return <DataDisplayErrorState error={error} onRetry={onRefresh} />;
  }

  if (data.length === 0) {
    return <DataDisplayEmptyState actions={actions} onAction={onAddNew} />;
  }

  const wrapperClasses = cn(
    'data-display-wrapper',
    styling.variant === 'minimal' && 'minimal',
    styling.variant === 'elevated' && 'elevated',
    styling.variant === 'outlined' && 'outlined',
    styling.rounded && 'rounded-lg',
    styling.shadow && `shadow-${styling.shadow}`,
    styling.border && 'border',
    className
  );

  return (
    <div className={wrapperClasses} {...props}>
      {/* Header */}
      {layout?.header?.show && (
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              {layout?.header?.title && (
                <h2 className="text-2xl font-bold text-gray-900">
                  {layout.header.title}
                </h2>
              )}
              {layout?.header?.description && (
                <p className="text-gray-600 mt-1">
                  {layout.header.description}
                </p>
              )}
            </div>
            {layout?.header?.actions && (
              <div className="flex items-center space-x-2">
                {layout.header.actions.map((actionId: string) => {
                  const action = actions.find(a => a.id === actionId);
                  return action ? (
                    <button
                      key={action.id}
                      onClick={action.onClick}
                      className={cn(
                        'px-4 py-2 rounded-md font-medium transition-colors',
                        action.variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
                        action.variant === 'secondary' && 'bg-gray-200 text-gray-900 hover:bg-gray-300',
                        action.variant === 'ghost' && 'bg-transparent text-gray-700 hover:bg-gray-100',
                        action.variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
                        action.disabled && 'opacity-50 cursor-not-allowed'
                      )}
                      disabled={action.disabled}
                    >
                      {action.icon && <span className="me-2">{action.icon}</span>}
                      {action.label}
                    </button>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter Pane */}
      {layout?.filterPane?.show && (
        <DataDisplayFilterPane
          config={config}
          filters={state.filters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
          onAddNew={onAddNew || (() => {})}
          onRefresh={onRefresh || (() => {})}
          loading={loading}
        />
      )}

      {/* View Switch */}
      {layout?.viewSwitch?.show && views.length > 1 && (
        <DataDisplayViewSwitch
          views={views}
          currentView={state.currentView}
          onViewChange={handleViewChange}
          config={config}
        />
      )}

      {/* Content */}
      <div className={cn(
        'data-display-content',
        layout?.content?.padding && `p-${layout?.content?.padding}`,
        layout?.content?.gap && `gap-${layout?.content?.gap}`
      )}>
        <DataDisplayContainer
          data={paginatedData}
          view={state.currentView}
          loading={loading}
          error={error}
          onItemClick={handleItemClick}
          onItemAction={handleItemAction}
          config={config}
          state={state}
        />
      </div>

      {/* Pagination */}
      {pagination.enabled && (
        <DataDisplayPagination
          config={pagination}
          pagination={state.pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
};

DataDisplayWrapper.displayName = 'DataDisplayWrapper';
