// View Switcher Component

import React from 'react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../shared/utils';
import { Grid3X3, List, ListTree, Table2 } from 'lucide-react';
import { HierarchyExpandCollapseControls } from './HierarchyExpandCollapseControls';

export interface ViewSwitcherProps {
  currentView: 'grid' | 'list' | 'table' | 'hierarchy';
  onViewChange: (view: 'grid' | 'list' | 'table' | 'hierarchy') => void;
  className?: string;
  showHierarchy?: boolean; // Only show hierarchy view if enabled
  showOnly?: ('grid' | 'list' | 'table' | 'hierarchy')[]; // Only show specified views
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  showExpandCollapse?: boolean; // Show expand/collapse controls
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  currentView,
  onViewChange,
  className,
  showHierarchy = false,
  showOnly,
  onExpandAll,
  onCollapseAll,
  showExpandCollapse = false,
}) => {
  // Determine which views to show
  const shouldShowView = (view: 'grid' | 'list' | 'table' | 'hierarchy') => {
    if (showOnly) {
      return showOnly.includes(view);
    }
    // Default behavior
    if (view === 'hierarchy') {
      return showHierarchy;
    }
    return true;
  };

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      {shouldShowView('hierarchy') && (
        <Button
          variant={currentView === 'hierarchy' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('hierarchy')}
          className={cn(
            'h-full w-10 p-0 rounded-md',
            currentView === 'hierarchy'
              ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
              : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50'
          )}
        >
          <ListTree className="h-4 w-4" />
        </Button>
      )}
      {shouldShowView('table') && (
        <Button
          variant={currentView === 'table' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('table')}
          className={cn(
            'h-full w-10 p-0 rounded-md',
            currentView === 'table' 
              ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm' 
              : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50'
          )}
        >
          <Table2 className="h-4 w-4" />
        </Button>
      )}
      {shouldShowView('list') && (
        <Button
          variant={currentView === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('list')}
          className={cn(
            'h-full w-10 p-0 rounded-md',
            currentView === 'list' 
              ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm' 
              : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50'
          )}
        >
          <List className="h-4 w-4" />
        </Button>
      )}
      {shouldShowView('grid') && (
        <Button
          variant={currentView === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('grid')}
          className={cn(
            'h-full w-10 p-0 rounded-md',
            currentView === 'grid' 
              ? 'bg-violet-500 hover:bg-violet-600 text-white shadow-sm' 
              : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50'
          )}
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>
      )}
      {showExpandCollapse && onExpandAll && onCollapseAll && (
        <div className="border-s border-gray-300 dark:border-gray-500 ms-1 ps-1">
          <HierarchyExpandCollapseControls
            onExpandAll={onExpandAll}
            onCollapseAll={onCollapseAll}
            variant="nobackground"
            showBorder={false}
          />
        </div>
      )}
    </div>
  );
};

ViewSwitcher.displayName = 'ViewSwitcher';
