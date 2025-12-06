// Card Header Component

import React from 'react';
import { CardHeaderProps } from '../types';
import { cn } from '../../../shared/utils';

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  actions,
  avatar,
  className,
  children,
  ...props
}) => {
  const headerClasses = cn(
    'card-header flex items-start justify-between',
    className
  );

  return (
    <div className={headerClasses} {...props}>
      <div className="flex items-start space-x-3 flex-1 min-w-0">
        {avatar && (
          <div className="shrink-0">
            {avatar}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-600 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      {actions && (
        <div className="shrink-0 ms-4">
          {actions}
        </div>
      )}
      
      {children}
    </div>
  );
};

CardHeader.displayName = 'CardHeader';
