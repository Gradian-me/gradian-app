'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DraggableCheckboxDialog } from '@/gradian-ui/data-display/components/DraggableCheckboxDialog';
import { DataFilterDialog } from '@/gradian-ui/data-display/components/DataFilterDialog';
import type { FilterItem } from '@/gradian-ui/data-display/types';
import { SearchBar } from '@/gradian-ui/data-display/components/SearchBar';
import { ViewSwitcher } from '@/gradian-ui/data-display/components/ViewSwitcher';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { SortConfig } from '@/gradian-ui/shared/utils/sort-utils';
import { getDefaultLanguage, getT } from '@/gradian-ui/shared/utils/translation-utils';
import { getFieldLabel } from '@/gradian-ui/shared/utils/field-label';
import { useLanguageStore } from '@/stores/language.store';
import { motion } from 'framer-motion';
import { ArrowUpDown, Filter, Layers, Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

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
  /** When true, show expand/collapse all for schema-grouped accordions (and use onExpandAllGroups/onCollapseAllGroups) */
  showGroupExpandCollapse?: boolean;
  onExpandAllGroups?: () => void;
  onCollapseAllGroups?: () => void;
  customActions?: React.ReactNode; // Custom actions/content to display in the filter pane
  sortConfig?: SortConfig[]; // Current sort configuration
  onSortChange?: (sortConfig: SortConfig[]) => void; // Callback when sort changes
  groupConfig?: { column: string }[]; // Current grouping columns (order = group level)
  onGroupChange?: (columns: { column: string }[]) => void; // Callback when grouping changes
  schema?: FormSchema | null; // Schema for available columns
  excludedFieldIds?: Set<string>; // Field IDs to exclude from sort options
  /** Filter conditions (column, operator, value). When set with onFilterChange, shows Filter button. */
  filterConfig?: FilterItem[];
  onFilterChange?: (filters: FilterItem[]) => void;
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
  searchPlaceholder: searchPlaceholderProp,
  addButtonText = "Add New",
  className = "",
  onExpandAllHierarchy,
  onCollapseAllHierarchy,
  showHierarchy = false,
  showGroupExpandCollapse = false,
  onExpandAllGroups,
  onCollapseAllGroups,
  customActions,
  sortConfig = [],
  onSortChange,
  groupConfig = [],
  onGroupChange,
  schema,
  excludedFieldIds,
  filterConfig = [],
  onFilterChange,
  showIds,
  onShowIdsChange,
  showOnlyViews,
  showAddButton = true, // Default to showing the button
}: DynamicFilterPaneProps) => {
  const [isSortDialogOpen, setIsSortDialogOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const language = useLanguageStore((s) => s.language);
  const defaultLang = getDefaultLanguage();
  const defaultSearchPlaceholder = getT(TRANSLATION_KEYS.PLACEHOLDER_SEARCH, language ?? defaultLang, defaultLang);
  const searchPlaceholder = searchPlaceholderProp ?? defaultSearchPlaceholder;

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

  const groupTooltipText = useMemo(() => {
    if (!groupConfig?.length || !schema) return 'No grouping';
    return 'Group by: ' + groupConfig.map((g) => getFieldLabel(schema, g.column, language ?? undefined, defaultLang)).join(', ');
  }, [groupConfig, schema, language, defaultLang]);

  const filterTooltipText = useMemo(() => {
    if (!filterConfig?.length || !schema) return getT(TRANSLATION_KEYS.LABEL_FILTERS, language ?? defaultLang, defaultLang);
    return `${getT(TRANSLATION_KEYS.LABEL_ACTIVE_FILTERS, language ?? defaultLang, defaultLang)} ${filterConfig.length}`;
  }, [filterConfig, schema, language, defaultLang]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex flex-col gap-2 sm:gap-3 mb-2 ${className}`}
      >
        <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 w-full min-w-0">
            <SearchBar
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={onSearchChange}
              className="h-9 sm:h-10 w-full"
            />
          </div>
          <div className="flex flex-row gap-1.5 sm:gap-2 items-center w-full lg:w-auto flex-wrap shrink-0">
            {schema && (onSortChange || onGroupChange || onFilterChange) && (
              <div className="flex items-center gap-1 shrink-0 flex-nowrap">
                {onFilterChange && (
                  <span className="relative inline-flex shrink-0">
                    <Button
                      variant="square"
                      size="sm"
                      onClick={() => setIsFilterDialogOpen(true)}
                      title={filterTooltipText}
                      className="h-9 sm:h-10"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                    {filterConfig?.length > 0 && (
                      <span
                        className="absolute -top-0.5 -end-0.5 h-2 w-2 min-w-[8px] rounded-full bg-violet-500 ring-2 ring-white dark:ring-gray-900"
                        aria-hidden
                      />
                    )}
                  </span>
                )}
                {onSortChange && (
                  <span className="relative inline-flex shrink-0">
                    <Button
                      variant="square"
                      size="sm"
                      onClick={() => setIsSortDialogOpen(true)}
                      title={sortTooltipText}
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                    {sortConfig?.length > 0 && (
                      <span
                        className="absolute -top-0.5 -end-0.5 h-2 w-2 min-w-[8px] rounded-full bg-violet-500 ring-2 ring-white dark:ring-gray-900"
                        aria-hidden
                      />
                    )}
                  </span>
                )}
                <span className="relative inline-flex shrink-0">
                  <Button
                    variant="square"
                    size="sm"
                    onClick={() => onGroupChange && setIsGroupDialogOpen(true)}
                    title={groupTooltipText}
                    disabled={!onGroupChange}
                    className="shrink-0"
                  >
                    <Layers className="h-4 w-4" />
                  </Button>
                  {groupConfig?.length > 0 && (
                    <span
                      className="absolute -top-0.5 -end-0.5 h-2 w-2 min-w-[8px] rounded-full bg-violet-500 ring-2 ring-white dark:ring-gray-900"
                      aria-hidden
                    />
                  )}
                </span>
              </div>
            )}
            {onRefresh && (
              <Button
                type="button"
                variant="square"
                size="sm"
                onClick={onRefresh}
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl h-9 shadow-sm sm:h-10 flex items-center shrink-0">
              <ViewSwitcher
                currentView={viewMode}
                onViewChange={onViewModeChange}
                className="h-full"
                showHierarchy={showHierarchy}
                showOnly={showOnlyViews}
                onExpandAll={showGroupExpandCollapse && onExpandAllGroups ? onExpandAllGroups : onExpandAllHierarchy}
                onCollapseAll={showGroupExpandCollapse && onCollapseAllGroups ? onCollapseAllGroups : onCollapseAllHierarchy}
                showExpandCollapse={(viewMode === 'hierarchy' && !!onExpandAllHierarchy && !!onCollapseAllHierarchy) || (showGroupExpandCollapse && !!onExpandAllGroups && !!onCollapseAllGroups)}
              />
            </div>
            {customActions && (
              <div className="flex items-center border-s border-gray-300 dark:border-gray-500 ps-2">
                {customActions}
              </div>
            )}
            {showIds !== undefined && onShowIdsChange && (
              <div className="flex items-center gap-2 border-s border-gray-300 dark:border-gray-500 ps-2">
                <Label htmlFor="show-ids-switch-filter" className="text-xs cursor-pointer whitespace-nowrap">
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
                variant="gradient"
                size="sm"
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
        <DraggableCheckboxDialog
          open={isSortDialogOpen}
          onOpenChange={setIsSortDialogOpen}
          componentType="sorting"
          schema={schema}
          value={sortConfig}
          onChange={onSortChange}
          excludedFieldIds={excludedFieldIds}
          requireApply
          onApply={() => setIsSortDialogOpen(false)}
          title={getT(TRANSLATION_KEYS.TITLE_SORT_DATA, language ?? defaultLang, defaultLang)}
        />
      )}
      {/* Group Dialog */}
      {schema && onGroupChange && (
        <DraggableCheckboxDialog
          open={isGroupDialogOpen}
          onOpenChange={setIsGroupDialogOpen}
          componentType="grouping"
          schema={schema}
          value={groupConfig}
          onChange={onGroupChange}
          excludedFieldIds={excludedFieldIds}
          requireApply
          onApply={() => setIsGroupDialogOpen(false)}
          title="Group by"
        />
      )}
      {/* Filter Dialog */}
      {schema && onFilterChange && (
        <DataFilterDialog
          open={isFilterDialogOpen}
          onOpenChange={setIsFilterDialogOpen}
          schema={schema}
          value={filterConfig}
          onChange={onFilterChange}
          excludedFieldIds={excludedFieldIds}
          onApply={() => setIsFilterDialogOpen(false)}
          title={getT(TRANSLATION_KEYS.LABEL_FILTERS, language ?? defaultLang, defaultLang)}
        />
      )}
    </>
  );
};

