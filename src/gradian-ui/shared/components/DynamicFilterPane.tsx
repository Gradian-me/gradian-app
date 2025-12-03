'use client';

import { motion } from 'framer-motion';
import { Filter, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/gradian-ui/data-display/components/SearchBar';
import { ViewSwitcher } from '@/gradian-ui/data-display/components/ViewSwitcher';
import { HierarchyExpandCollapseControls } from '@/gradian-ui/data-display/components/HierarchyExpandCollapseControls';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface DynamicFilterPaneProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: 'grid' | 'list' | 'table' | 'hierarchy';
  onViewModeChange: (mode: 'grid' | 'list' | 'table' | 'hierarchy') => void;
  onAddNew: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  searchPlaceholder?: string;
  addButtonText?: string;
  className?: string;
  onExpandAllHierarchy?: () => void;
  onCollapseAllHierarchy?: () => void;
  showHierarchy?: boolean; // Only show hierarchy view if enabled
  customActions?: React.ReactNode; // Custom actions/content to display in the filter pane
}

export const DynamicFilterPane = ({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onAddNew,
  onRefresh,
  isRefreshing = false,
  searchPlaceholder = "Search...",
  addButtonText = "Add New",
  className = "",
  onExpandAllHierarchy,
  onCollapseAllHierarchy,
  showHierarchy = false,
  customActions,
}: DynamicFilterPaneProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center lg:justify-between mb-4 sm:mb-6 ${className}`}
    >
      <div className="flex-1 w-full">
        <SearchBar
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={onSearchChange}
          className="h-9 sm:h-10 w-full"
        />
      </div>
      <div className="flex flex-row gap-1.5 sm:gap-2 items-center w-full lg:w-auto">
        <Button variant="outline" size="sm" className="h-9 sm:h-10 px-2 sm:px-3 flex-1 sm:flex-initial whitespace-nowrap">
          <Filter className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Filters</span>
        </Button>
        {onRefresh && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 sm:h-10 w-9 sm:w-10 p-0 justify-center shrink-0"
            onClick={onRefresh}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
        <div className="border border-gray-300 dark:border-gray-500 rounded-md h-9 sm:h-10 flex items-center shrink-0">
          <ViewSwitcher
            currentView={viewMode}
            onViewChange={onViewModeChange}
            className="h-full"
            showHierarchy={showHierarchy}
          />
          {viewMode === 'hierarchy' && onExpandAllHierarchy && onCollapseAllHierarchy && (
            <HierarchyExpandCollapseControls
              onExpandAll={onExpandAllHierarchy}
              onCollapseAll={onCollapseAllHierarchy}
            />
          )}
        </div>
        {customActions && (
          <div className="flex items-center border-l border-gray-300 dark:border-gray-500 pl-2">
            {customActions}
          </div>
        )}
        <Button 
          variant="default" 
          size="sm" 
          className="h-9 sm:h-10 px-2 sm:px-3 flex-1 sm:flex-initial whitespace-nowrap text-xs sm:text-sm"
          onClick={onAddNew}
        >
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{addButtonText}</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
    </motion.div>
  );
};

