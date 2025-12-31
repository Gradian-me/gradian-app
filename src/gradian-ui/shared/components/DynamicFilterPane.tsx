'use client';

import { motion } from 'framer-motion';
import { Filter, Plus, RefreshCw, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/gradian-ui/data-display/components/SearchBar';
import { ViewSwitcher } from '@/gradian-ui/data-display/components/ViewSwitcher';
import { HierarchyExpandCollapseControls } from '@/gradian-ui/data-display/components/HierarchyExpandCollapseControls';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DataSort } from '@/gradian-ui/data-display/components/DataSort';
import { SortConfig } from '@/gradian-ui/shared/utils/sort-utils';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useState, useMemo } from 'react';

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
  sortConfig?: SortConfig[]; // Current sort configuration
  onSortChange?: (sortConfig: SortConfig[]) => void; // Callback when sort changes
  schema?: FormSchema | null; // Schema for available columns
  excludedFieldIds?: Set<string>; // Field IDs to exclude from sort options
  showIds?: boolean; // Show IDs switch
  onShowIdsChange?: (showIds: boolean) => void; // Callback when show IDs changes
  showOnlyViews?: ('grid' | 'list' | 'table' | 'hierarchy')[]; // Only show specified views in ViewSwitcher
  showAddButton?: boolean; // Show/hide the Add button
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
  sortConfig = [],
  onSortChange,
  schema,
  excludedFieldIds,
  showIds,
  onShowIdsChange,
  showOnlyViews,
  showAddButton = true, // Default to showing the button
}: DynamicFilterPaneProps) => {
  const [isSortDialogOpen, setIsSortDialogOpen] = useState(false);

  // Generate tooltip text for sort configuration
  const sortTooltipText = useMemo(() => {
    if (!sortConfig || sortConfig.length === 0 || !schema) {
      return 'No sort applied';
    }
    
    // System field labels
    const systemFieldLabels: Record<string, string> = {
      status: 'Status',
      entityType: 'Type',
      updatedBy: 'Updated By',
      updatedAt: 'Updated At',
      createdBy: 'Created By',
      createdAt: 'Created At',
      companyId: 'Company',
    };
    
    return sortConfig.map((sort, index) => {
      const direction = sort.isAscending ? '↑' : '↓';
      // Try to get label from schema field, otherwise use system field label or column id
      const field = schema.fields?.find((f: any) => f.id === sort.column);
      const label = field?.label || field?.name || systemFieldLabels[sort.column] || sort.column;
      return `${index + 1}. ${label} ${direction}`;
    }).join('\n');
  }, [sortConfig, schema]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex flex-col gap-2 sm:gap-3 mb-2 ${className}`}
      >
        <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 w-full flex gap-2">
            <SearchBar
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={onSearchChange}
              className="h-9 sm:h-10 flex-1"
            />
            {schema && onSortChange && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 sm:h-10 w-9 sm:w-10 p-0 justify-center shrink-0"
                      onClick={() => setIsSortDialogOpen(true)}
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="text-sm">
                      <div className="font-semibold mb-1">Sort</div>
                      {sortConfig.length > 0 ? (
                        <div className="space-y-0.5">
                          {sortConfig.map((sort, index) => {
                            const direction = sort.isAscending ? '↑' : '↓';
                            // Get proper label from schema or system fields
                            const field = schema?.fields?.find((f: any) => f.id === sort.column);
                            const systemFieldLabels: Record<string, string> = {
                              status: 'Status',
                              entityType: 'Type',
                              updatedBy: 'Updated By',
                              updatedAt: 'Updated At',
                              createdBy: 'Created By',
                              createdAt: 'Created At',
                              companyId: 'Company',
                            };
                            const label = field?.label || field?.name || systemFieldLabels[sort.column] || sort.column;
                            return (
                              <div key={index} className="text-xs">
                                {index + 1}. {label} {direction}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">No sort applied</div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        <div className="flex flex-row gap-1.5 sm:gap-2 items-center w-full lg:w-auto flex-wrap">
          <Button variant="outline" size="sm" className="hidden h-9 sm:h-10 px-2 sm:px-3 flex-1 sm:flex-initial whitespace-nowrap">
            <Filter className="h-4 w-4 sm:me-2" />
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
              showOnly={showOnlyViews}
              onExpandAll={onExpandAllHierarchy}
              onCollapseAll={onCollapseAllHierarchy}
              showExpandCollapse={viewMode === 'hierarchy' && !!onExpandAllHierarchy && !!onCollapseAllHierarchy}
            />
          </div>
          {customActions && (
            <div className="flex items-center border-l border-gray-300 dark:border-gray-500 ps-2">
              {customActions}
            </div>
          )}
          {showIds !== undefined && onShowIdsChange && (
            <div className="flex items-center gap-2 border-l border-gray-300 dark:border-gray-500 ps-2">
              <Label htmlFor="show-ids-switch-filter" className="text-sm cursor-pointer whitespace-nowrap">
                Show IDs
              </Label>
              <Switch
                id="show-ids-switch-filter"
                checked={showIds}
                onCheckedChange={onShowIdsChange}
              />
            </div>
          )}
          {showAddButton && (
            <Button 
              variant="default" 
              size="sm" 
              className="h-9 sm:h-10 px-2 sm:px-3 flex-1 sm:flex-initial whitespace-nowrap text-xs sm:text-sm shadow-sm bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              onClick={onAddNew}
            >
              <Plus className="h-4 w-4 sm:me-2" />
              <span className="hidden sm:inline">{addButtonText}</span>
              <span className="sm:hidden">Add</span>
            </Button>
          )}
        </div>
      </div>
    </motion.div>

    {/* Sort Dialog */}
    {schema && onSortChange && (
      <Dialog open={isSortDialogOpen} onOpenChange={setIsSortDialogOpen}>
        <DialogContent className="max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-3">
            <DialogTitle>Sort Data</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1">
            <DataSort
              schema={schema}
              value={sortConfig}
              onChange={(newSortConfig) => {
                onSortChange(newSortConfig);
              }}
              excludedFieldIds={excludedFieldIds}
              className="border-0"
              showHeader={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
};

