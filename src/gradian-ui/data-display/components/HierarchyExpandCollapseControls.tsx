'use client';

import React from 'react';
import { ChevronsDown, ChevronsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ExpandCollapseControlsProps {
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  expandDisabled?: boolean;
  collapseDisabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showLabels?: boolean;
  orientation?: 'horizontal' | 'vertical';
  showBorder?: boolean;
}

export const ExpandCollapseControls: React.FC<ExpandCollapseControlsProps> = ({
  onExpandAll,
  onCollapseAll,
  expandDisabled = false,
  collapseDisabled = false,
  variant = 'outline',
  size = 'icon',
  className,
  showLabels = false,
  orientation = 'horizontal',
  showBorder = false,
}) => {
  // If neither callback is provided, don't render
  if (!onExpandAll && !onCollapseAll) {
    return null;
  }

  const containerClasses = cn(
    'flex items-center',
    orientation === 'horizontal' ? 'flex-row space-x-1' : 'flex-col space-y-1',
    showBorder && 'border-l border-gray-300 dark:border-gray-600 pl-1.5 sm:pl-2 ml-1.5 sm:ml-2',
    className
  );

  const buttonSize = size === 'icon' ? 'icon' : size;
  const buttonClassName = size === 'icon' 
    ? 'h-10 w-10' 
    : size === 'sm' 
      ? 'h-8' 
      : size === 'lg'
        ? 'h-12'
        : 'h-10';

  return (
    <div className={containerClasses}>
      {onExpandAll && (
        <Button
          type="button"
          variant={variant}
          size={buttonSize}
          className={cn(
            buttonClassName,
            variant === 'ghost' && 'text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-gray-800',
            showLabels && 'gap-2'
          )}
          onClick={onExpandAll}
          disabled={expandDisabled}
          title="Expand all"
        >
          <ChevronsDown className="h-4 w-4" />
          {showLabels && <span className="hidden md:inline">Expand All</span>}
        </Button>
      )}
      {onCollapseAll && (
        <Button
          type="button"
          variant={variant}
          size={buttonSize}
          className={cn(
            buttonClassName,
            variant === 'ghost' && 'text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-gray-800',
            showLabels && 'gap-2'
          )}
          onClick={onCollapseAll}
          disabled={collapseDisabled}
          title="Collapse all"
        >
          <ChevronsUp className="h-4 w-4" />
          {showLabels && <span className="hidden md:inline">Collapse All</span>}
        </Button>
      )}
    </div>
  );
};

ExpandCollapseControls.displayName = 'ExpandCollapseControls';

// Export with old name for backward compatibility
export const HierarchyExpandCollapseControls = ExpandCollapseControls;


