// Data Display Filter Pane Component

import React, { useState, useCallback } from 'react';
import { DataDisplayFilterPaneProps } from '../types';
import { cn } from '../../shared/utils';
import { Search, Filter, Plus, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Checkbox } from '../../../components/ui/checkbox';
import { SearchInput } from '../../form-builder/form-elements/components/SearchInput';

export const DataDisplayFilterPane: React.FC<DataDisplayFilterPaneProps> = ({
  config,
  filters,
  onFilterChange,
  onSearch,
  onAddNew,
  onRefresh,
  loading = false,
  className,
  ...props
}) => {
  const {
    search = { enabled: true },
    filters: filterConfigs = [],
    actions = [],
    layout,
  } = config;

  const [isCollapsed, setIsCollapsed] = useState(layout?.filterPane?.defaultCollapsed || false);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    onSearch(value);
  }, [onSearch]);

  const handleFilterChange = useCallback((filterId: string, value: any) => {
    onFilterChange({
      ...filters,
      [filterId]: value,
    });
  }, [filters, onFilterChange]);

  const handleAddNew = useCallback(() => {
    onAddNew();
  }, [onAddNew]);

  const handleRefresh = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed]);

  const filterPaneClasses = cn(
    'data-display-filter-pane',
    'bg-white border border-gray-200 rounded-lg',
    layout?.filterPane?.position === 'left' && 'w-64',
    layout?.filterPane?.position === 'right' && 'w-64',
    layout?.filterPane?.position === 'top' && 'w-full',
    className
  );

  const renderFilter = (filter: any) => {
    const { id, name, label, type, options = [], placeholder, defaultValue, styling = {} } = filter;
    const value = filters[id] || defaultValue || '';

    const baseClasses = cn(
      'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
      styling.size === 'sm' && 'text-sm',
      styling.size === 'lg' && 'text-lg',
      styling.variant === 'outlined' && 'border-2',
      styling.variant === 'filled' && 'bg-gray-100'
    );

    switch (type) {
      case 'select':
        return (
          <select
            key={id}
            value={value}
            onChange={(e) => handleFilterChange(id, e.target.value)}
            className={baseClasses}
            style={{ width: styling.width }}
          >
            <option value="">{placeholder || `Select ${label}`}</option>
            {options.map((option: any) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div key={id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="space-y-1">
              {options.map((option: any) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={Array.isArray(value) && value.includes(option.value)}
                    onChange={(e) => {
                      const currentValues = Array.isArray(value) ? value : [];
                      const newValues = e.target.checked
                        ? [...currentValues, option.value]
                        : currentValues.filter((v: any) => v !== option.value);
                      handleFilterChange(id, newValues);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ms-2 text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'date':
        return (
          <input
            key={id}
            type="date"
            value={value}
            onChange={(e) => handleFilterChange(id, e.target.value)}
            className={baseClasses}
            style={{ width: styling.width }}
          />
        );

      case 'daterange':
        return (
          <div key={id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={Array.isArray(value) ? value[0] || '' : ''}
                onChange={(e) => {
                  const currentRange = Array.isArray(value) ? value : ['', ''];
                  handleFilterChange(id, [e.target.value, currentRange[1]]);
                }}
                className={baseClasses}
                placeholder="Start date"
              />
              <input
                type="date"
                value={Array.isArray(value) ? value[1] || '' : ''}
                onChange={(e) => {
                  const currentRange = Array.isArray(value) ? value : ['', ''];
                  handleFilterChange(id, [currentRange[0], e.target.value]);
                }}
                className={baseClasses}
                placeholder="End date"
              />
            </div>
          </div>
        );

      case 'number':
        return (
          <input
            key={id}
            type="number"
            value={value}
            onChange={(e) => handleFilterChange(id, e.target.value)}
            placeholder={placeholder}
            className={baseClasses}
            style={{ width: styling.width }}
            min={filter.validation?.min}
            max={filter.validation?.max}
          />
        );

      case 'text':
        return (
          <input
            key={id}
            type="text"
            value={value}
            onChange={(e) => handleFilterChange(id, e.target.value)}
            placeholder={placeholder}
            className={baseClasses}
            style={{ width: styling.width }}
            minLength={filter.validation?.minLength}
            maxLength={filter.validation?.maxLength}
          />
        );

      case 'checkbox':
        return (
          <div key={id} className="flex items-center space-x-2">
            <Checkbox
              id={id}
              checked={Boolean(value)}
              onCheckedChange={(checked) => handleFilterChange(id, checked)}
            />
            <label htmlFor={id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
              {label}
            </label>
          </div>
        );

      case 'radio':
        return (
          <div key={id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="space-y-1">
              {options.map((option: any) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    name={id}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => handleFilterChange(id, e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ms-2 text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={filterPaneClasses} {...props}>
      {/* Filter Pane Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>
        {layout?.filterPane?.collapsible && (
          <button
            onClick={toggleCollapsed}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {/* Search */}
          {search.enabled && (
            <div className="space-y-2">
              <SearchInput
                config={{ 
                  name: 'filter-search', 
                  placeholder: search.placeholder || 'Search...',
                  label: 'Search'
                }}
                value={searchTerm}
                onChange={handleSearchChange}
                onClear={() => handleSearchChange('')}
                className={cn(
                  search.styling?.size === 'sm' && '[&_input]:text-sm',
                  search.styling?.size === 'lg' && '[&_input]:text-lg'
                )}
              />
            </div>
          )}

          {/* Filters */}
          {filterConfigs.map((filter) => (
            <div key={filter.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {filter.label}
                {filter.validation?.required && <span className="text-red-500 ms-1">*</span>}
              </label>
              {renderFilter(filter)}
            </div>
          ))}

          {/* Actions */}
          <div className="flex flex-col space-y-2 pt-4 border-t border-gray-200">
            {actions
              .filter(action => action.position === 'left' || !action.position)
              .map((action) => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  disabled={action.disabled || loading}
                  className={cn(
                    'w-full flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors',
                    action.variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
                    action.variant === 'secondary' && 'bg-gray-200 text-gray-900 hover:bg-gray-300',
                    action.variant === 'ghost' && 'bg-transparent text-gray-700 hover:bg-gray-100',
                    action.variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
                    (action.disabled || loading) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {action.icon && <span className="me-2">{action.icon}</span>}
                  {action.label}
                </button>
              ))}

            {/* Default Actions */}
            <button
              onClick={handleAddNew}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 me-2" />
              Add New
            </button>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-900 rounded-md font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4 me-2', loading && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

DataDisplayFilterPane.displayName = 'DataDisplayFilterPane';
