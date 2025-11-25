// Data Display Loading State Component

import React from 'react';
import { DataDisplayLoadingStateProps } from '../types';
import { cn } from '../../shared/utils';
import { Loader2 } from 'lucide-react';
import { LoadingSkeleton } from '@/gradian-ui/layout/components';

export const DataDisplayLoadingState: React.FC<DataDisplayLoadingStateProps> = ({
  message = 'Loading...',
  skeleton = false,
  count = 6,
  className,
  ...props
}) => {
  const loadingClasses = cn(
    'data-display-loading-state',
    'flex flex-col items-center justify-center py-12 px-4 text-center',
    className
  );

  if (skeleton) {
    return (
      <div className={loadingClasses} {...props}>
        <LoadingSkeleton
          variant="card"
          count={count}
          columns={{ default: 1, md: 2, lg: 3 }}
          gap={6}
          className="w-full"
        />
      </div>
    );
  }

  return (
    <div className={loadingClasses} {...props}>
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
      <p className="text-gray-600 text-lg">{message}</p>
    </div>
  );
};

DataDisplayLoadingState.displayName = 'DataDisplayLoadingState';
