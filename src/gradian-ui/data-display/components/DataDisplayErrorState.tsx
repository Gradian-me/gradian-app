// Data Display Error State Component

import React from 'react';
import { DataDisplayErrorStateProps } from '../types';
import { cn } from '../../shared/utils';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

export const DataDisplayErrorState: React.FC<DataDisplayErrorStateProps> = ({
  error,
  onRetry,
  onDismiss,
  className,
  ...props
}) => {
  const errorClasses = cn(
    'data-display-error-state',
    'flex flex-col items-center justify-center py-12 px-4 text-center',
    className
  );

  return (
    <div className={errorClasses} {...props}>
      {/* Error Icon */}
      <div className="mb-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
      </div>

      {/* Error Message */}
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300 mb-2">
        Something went wrong
      </h3>
      
      <p className="text-gray-500 mb-6 max-w-sm">
        {error || 'An unexpected error occurred while loading the data.'}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4 me-2" />
            Try Again
          </button>
        )}
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-900 rounded-md font-medium hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <X className="h-4 w-4 me-2" />
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};

DataDisplayErrorState.displayName = 'DataDisplayErrorState';
