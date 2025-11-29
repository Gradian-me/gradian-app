'use client';

import React from 'react';
import { ChevronsDown, ChevronsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface HierarchyExpandCollapseControlsProps {
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

export const HierarchyExpandCollapseControls: React.FC<HierarchyExpandCollapseControlsProps> = ({
  onExpandAll,
  onCollapseAll,
}) => {
  if (!onExpandAll || !onCollapseAll) {
    return null;
  }

  return (
    <div className="flex items-center h-full border-l border-gray-300 dark:border-gray-600 pl-1.5 sm:pl-2 ml-1.5 sm:ml-2 space-x-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-full w-10 p-0 rounded-md text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-gray-800"
        onClick={onExpandAll}
        title="Expand all"
      >
        <ChevronsDown className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-full w-10 p-0 rounded-md text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-gray-800"
        onClick={onCollapseAll}
        title="Collapse all"
      >
        <ChevronsUp className="h-4 w-4" />
      </Button>
    </div>
  );
};

HierarchyExpandCollapseControls.displayName = 'HierarchyExpandCollapseControls';


