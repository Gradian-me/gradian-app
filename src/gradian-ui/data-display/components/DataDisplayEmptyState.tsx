// Data Display Empty State Component

import React from 'react';
import { DataDisplayEmptyStateProps } from '../types';
import { cn } from '../../shared/utils';
import { Inbox, Plus, RefreshCw } from 'lucide-react';

export const DataDisplayEmptyState: React.FC<DataDisplayEmptyStateProps> = ({
  title = 'No data found',
  description = 'There are no items to display at the moment.',
  icon,
  actions = [],
  onAction,
  className,
  ...props
}) => {
  const defaultIcon = <Inbox className="h-12 w-12 text-gray-400" />;

  const handleAction = (actionId: string) => {
    onAction?.(actionId);
  };

  const emptyStateClasses = cn(
    'data-display-empty-state',
    'flex flex-col items-center justify-center py-12 px-4 text-center',
    className
  );

  return (
    <div className={emptyStateClasses} {...props}>
      {/* Icon */}
      <div className="mb-4">
        {icon || defaultIcon}
      </div>

      {/* Title */}
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300 mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-gray-500 mb-6 max-w-sm">
        {description}
      </p>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              disabled={action.disabled}
              className={cn(
                'inline-flex items-center px-4 py-2 rounded-md font-medium transition-colors',
                action.variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
                action.variant === 'secondary' && 'bg-gray-200 text-gray-900 hover:bg-gray-300',
                action.variant === 'ghost' && 'bg-transparent text-gray-700 hover:bg-gray-100',
                action.variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
                action.disabled && 'opacity-50 cursor-not-allowed',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              )}
            >
              {action.icon && <span className="me-2">{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Default Actions if none provided */}
      {actions.length === 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleAction('add')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 me-2" />
            Add New Item
          </button>
          <button
            onClick={() => handleAction('refresh')}
            className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-900 rounded-md font-medium hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4 me-2" />
            Refresh
          </button>
        </div>
      )}
    </div>
  );
};

DataDisplayEmptyState.displayName = 'DataDisplayEmptyState';
