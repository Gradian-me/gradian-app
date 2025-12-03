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
  // 'nobackground' is a semantic alias we can map to a ghost-style button
  variant?: 'default' | 'outline' | 'ghost' | 'nobackground';
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
    'flex h-full items-center',
    orientation === 'horizontal' ? 'flex-row space-x-1' : 'flex-col space-y-1',
    showBorder && 'border-s border-gray-300 dark:border-gray-600 ps-1.5 sm:ps-2 ml-1.5 sm:ms-2',
    className
  );

  const buttonSize = size === 'icon' ? 'icon' : size;
  const buttonVariant = variant === 'nobackground' ? 'ghost' : variant;

  // Match ViewSwitcher button dimensions/roundness when using "nobackground"
  const buttonClassName =
    size === 'icon' && variant === 'nobackground'
      ? 'h-full w-10 p-0 rounded-md'
      : size === 'icon'
        ? 'h-10 w-10 rounded-md'
        : size === 'sm'
          ? 'h-8 rounded-md'
          : size === 'lg'
            ? 'h-12 rounded-md'
            : 'h-10 rounded-md';

  return (
    <div className={containerClasses}>
      {onExpandAll && (
        <Button
          type="button"
          variant={buttonVariant}
          size={buttonSize}
          className={cn(
            buttonClassName,
            variant === 'ghost' &&
              'text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-gray-800',
            variant === 'nobackground' &&
              'text-gray-500 hover:text-violet-600 hover:bg-violet-50',
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
          variant={buttonVariant}
          size={buttonSize}
          className={cn(
            buttonClassName,
            variant === 'ghost' &&
              'text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-gray-800',
            variant === 'nobackground' &&
              'text-gray-500 hover:text-violet-600 hover:bg-violet-50',
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


