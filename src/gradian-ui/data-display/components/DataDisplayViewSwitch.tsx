// Data Display View Switch Component

import React, { useCallback } from 'react';
import { DataDisplayViewSwitchProps } from '../types';
import { cn } from '../../shared/utils';
import { Grid3X3, List, Table, Calendar, Layout } from 'lucide-react';

export const DataDisplayViewSwitch: React.FC<DataDisplayViewSwitchProps> = ({
  views,
  currentView,
  onViewChange,
  config,
  className,
  ...props
}) => {
  const layout = config?.layout;

  const handleViewChange = useCallback((view: any) => {
    onViewChange(view);
  }, [onViewChange]);

  const getViewIcon = (component: string) => {
    switch (component) {
      case 'card':
      case 'grid':
        return <Grid3X3 className="h-4 w-4" />;
      case 'list':
        return <List className="h-4 w-4" />;
      case 'table':
        return <Table className="h-4 w-4" />;
      case 'timeline':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Layout className="h-4 w-4" />;
    }
  };

  const getAlignmentClasses = () => {
    switch (layout?.viewSwitch?.alignment) {
      case 'start':
        return 'justify-start';
      case 'center':
        return 'justify-center';
      case 'end':
        return 'justify-end';
      default:
        return 'justify-start';
    }
  };

  const getPositionClasses = () => {
    switch (layout?.viewSwitch?.position) {
      case 'top':
        return 'mb-4';
      case 'bottom':
        return 'mt-4';
      case 'left':
        return 'me-4';
      case 'right':
        return 'ms-4';
      default:
        return 'mb-4';
    }
  };

  const containerClasses = cn(
    'data-display-view-switch',
    'flex items-center space-x-1',
    getAlignmentClasses(),
    getPositionClasses(),
    className
  );

  if (views.length <= 1) {
    return null;
  }

  return (
    <div className={containerClasses} {...props}>
      <div className="flex items-center bg-gray-100 rounded-lg p-1">
        {views.map((view) => {
          const isActive = currentView.id === view.id;
          const isDisabled = view.responsive?.hideOn?.some(breakpoint => {
            // This would need to be implemented with a responsive hook
            return false;
          });

          if (isDisabled) {
            return null;
          }

          return (
            <button
              key={view.id}
              onClick={() => handleViewChange(view)}
              className={cn(
                'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
              )}
              title={view.label}
            >
              {view.icon || getViewIcon(view.component)}
              <span className="hidden sm:inline">{view.label}</span>
            </button>
          );
        })}
      </div>

      {/* View Info */}
      <div className="ms-4 text-sm text-gray-500">
        {currentView.label} View
      </div>
    </div>
  );
};

DataDisplayViewSwitch.displayName = 'DataDisplayViewSwitch';
