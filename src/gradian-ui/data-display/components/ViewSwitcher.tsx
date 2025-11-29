// View Switcher Component

import React from 'react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../shared/utils';
import { Grid3X3, List, ListTree, Table2 } from 'lucide-react';

export interface ViewSwitcherProps {
  currentView: 'grid' | 'list' | 'table' | 'hierarchy';
  onViewChange: (view: 'grid' | 'list' | 'table' | 'hierarchy') => void;
  className?: string;
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  currentView,
  onViewChange,
  className
}) => {
  return (
    <div className={cn('flex items-center space-x-1', className)}>
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
    </div>
  );
};

ViewSwitcher.displayName = 'ViewSwitcher';
