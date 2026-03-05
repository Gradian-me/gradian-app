// View Switcher Component

import React from 'react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../shared/utils';
import { Columns3, Grid3X3, List, ListTree, Table2 } from 'lucide-react';
import { HierarchyExpandCollapseControls } from './HierarchyExpandCollapseControls';

export interface ViewSwitcherProps {
  currentView: 'grid' | 'list' | 'table' | 'hierarchy' | 'kanban';
  onViewChange: (view: 'grid' | 'list' | 'table' | 'hierarchy' | 'kanban') => void;
  className?: string;
  showHierarchy?: boolean; // Only show hierarchy view if enabled
  showOnly?: ('grid' | 'list' | 'table' | 'hierarchy' | 'kanban')[]; // Only show specified views
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
  const shouldShowView = (view: 'grid' | 'list' | 'table' | 'hierarchy' | 'kanban') => {
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
          type="button"
          variant={currentView === 'hierarchy' ? 'default' : 'ghost'}
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onViewChange('hierarchy');
            (e.currentTarget as HTMLElement).blur();
          }}
          className={cn(
            'h-10 w-10 shrink-0 p-0 rounded-xl',
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
          type="button"
          variant={currentView === 'table' ? 'default' : 'ghost'}
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onViewChange('table');
            (e.currentTarget as HTMLElement).blur();
          }}
          className={cn(
            'h-10 w-10 shrink-0 p-0 rounded-xl',
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
          type="button"
          variant={currentView === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onViewChange('list');
            (e.currentTarget as HTMLElement).blur();
          }}
          className={cn(
            'h-10 w-10 shrink-0 p-0 rounded-xl',
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
          type="button"
          variant={currentView === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onViewChange('grid');
            (e.currentTarget as HTMLElement).blur();
          }}
          className={cn(
            'h-10 w-10 shrink-0 p-0 rounded-xl',
            currentView === 'grid' 
              ? 'bg-violet-500 hover:bg-violet-600 text-white shadow-sm' 
              : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50'
          )}
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>
      )}
      {shouldShowView('kanban') && (
        <Button
          type="button"
          variant={currentView === 'kanban' ? 'default' : 'ghost'}
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onViewChange('kanban');
            (e.currentTarget as HTMLElement).blur();
          }}
          className={cn(
            'h-10 w-10 shrink-0 p-0 rounded-xl',
            currentView === 'kanban'
              ? 'bg-violet-500 hover:bg-violet-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50'
          )}
        >
          <Columns3 className="h-4 w-4" />
        </Button>
      )}
      {showExpandCollapse && onExpandAll && onCollapseAll && (
        <div className="h-full border-s border-gray-300 dark:border-gray-500 ms-1 ps-1">
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
