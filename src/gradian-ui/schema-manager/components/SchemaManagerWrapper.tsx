'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from '@/components/ui/sonner';
import { Plus, RefreshCw, Settings, Building2, FileText, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { useBackIcon } from '@/gradian-ui/shared/hooks';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SchemaCardGrid, SchemaCardSkeletonGrid } from './SchemaCardGrid';
import { SchemaListView } from './SchemaListView';
import { SchemaTableView } from './SchemaTableView';
import { CreateSchemaDialog } from './CreateSchemaDialog';
import { SchemaDeleteConfirmDialog } from './SchemaDeleteConfirmDialog';
import {
  SearchInput,
  Switch,
  FormTabs,
  FormTabsList,
  FormTabsTrigger,
  FormTabsContent,
  Select,
} from '@/gradian-ui/form-builder/form-elements';
import { MessageBox } from '@/gradian-ui/layout/message-box';
import { DynamicFilterPane } from '@/gradian-ui/shared/components';
import { ViewSwitcher } from '@/gradian-ui/data-display/components/ViewSwitcher';
import { ExpandCollapseControls } from '@/gradian-ui/data-display/components/HierarchyExpandCollapseControls';
import { DynamicPagination } from '@/gradian-ui/data-display/components/DynamicPagination';
import { useSchemaManagerPage } from '../hooks/useSchemaManagerPage';
import { FormSchema } from '../types';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { clearClientSchemaCache } from '../utils/client-schema-cache';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppGroup {
  id: string;
  name: string;
  icon?: string;
  schemas: FormSchema[];
}

interface ApplicationGroupedViewProps {
  schemas: FormSchema[];
  language: string | null | undefined;
  viewMode: 'grid' | 'list' | 'table' | 'hierarchy';
  showStatistics: boolean;
  onEdit: (schema: FormSchema) => void;
  onView: (schema: FormSchema) => void;
  onDelete: (schema: FormSchema) => void;
  collapsedGroups: Set<string>;
  onToggleGroup: (id: string) => void;
  searchQuery?: string;
}

/** Resolve the display name of an application given the current language. */
function resolveAppName(
  name: string | Array<Record<string, string>>,
  language: string | null | undefined,
): string {
  if (typeof name === 'string') return name;
  if (!Array.isArray(name)) return '';
  const lang = language || 'en';
  for (const entry of name) {
    if (entry && lang in entry) return entry[lang];
  }
  // Fallback to English
  for (const entry of name) {
    if (entry && 'en' in entry) return entry.en;
  }
  return '';
}

/** Group schemas by their applications. Schemas without an application go into an "Other" bucket. */
function groupSchemasByApplication(
  schemas: FormSchema[],
  language: string | null | undefined,
): AppGroup[] {
  const groupMap = new Map<string, AppGroup>();

  for (const schema of schemas) {
    const apps = schema.applications;
    if (apps && apps.length > 0) {
      for (const app of apps) {
        if (!groupMap.has(app.id)) {
          groupMap.set(app.id, {
            id: app.id,
            name: resolveAppName(app.name, language),
            icon: app.icon,
            schemas: [],
          });
        }
        groupMap.get(app.id)!.schemas.push(schema);
      }
    } else {
      const ungroupedId = '__ungrouped__';
      if (!groupMap.has(ungroupedId)) {
        groupMap.set(ungroupedId, { id: ungroupedId, name: 'Other', schemas: [] });
      }
      groupMap.get(ungroupedId)!.schemas.push(schema);
    }
  }

  // Sort: named groups alphabetically, "Other" at the end
  const groups = Array.from(groupMap.values());
  groups.sort((a, b) => {
    if (a.id === '__ungrouped__') return 1;
    if (b.id === '__ungrouped__') return -1;
    return a.name.localeCompare(b.name);
  });

  return groups;
}

function ApplicationGroupedView({
  schemas,
  language,
  viewMode,
  showStatistics,
  onEdit,
  onView,
  onDelete,
  collapsedGroups,
  onToggleGroup,
  searchQuery,
}: ApplicationGroupedViewProps) {
  const groups = useMemo(
    () => groupSchemasByApplication(schemas, language),
    [schemas, language],
  );

  if (groups.length <= 1 && groups[0]?.id === '__ungrouped__') {
    // No meaningful grouping — render without headers
    return renderSchemas(groups[0]?.schemas ?? [], viewMode, showStatistics, onEdit, onView, onDelete, searchQuery);
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isCollapsed = collapsedGroups.has(group.id);
        return (
          <div key={group.id} className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => onToggleGroup(group.id)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-slate-800/60 hover:bg-violet-50 dark:hover:bg-slate-800 transition-colors text-left"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
              )}
              {group.icon && group.id !== '__ungrouped__' && (
                <IconRenderer
                  iconName={group.icon}
                  className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300"
                />
              )}
              <span className="font-semibold text-sm text-gray-800 dark:text-gray-100 flex-1 truncate">
                {group.name}
              </span>
              <Badge
                variant="secondary"
                className="shrink-0 bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
              >
                {group.schemas.length}
              </Badge>
            </button>

            {!isCollapsed && (
              <div className="p-4">
                {renderSchemas(group.schemas, viewMode, showStatistics, onEdit, onView, onDelete, searchQuery)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function renderSchemas(
  schemas: FormSchema[],
  viewMode: 'grid' | 'list' | 'table' | 'hierarchy',
  showStatistics: boolean,
  onEdit: (schema: FormSchema) => void,
  onView: (schema: FormSchema) => void,
  onDelete: (schema: FormSchema) => void,
  searchQuery?: string,
) {
  if (viewMode === 'table') {
    return (
      <SchemaTableView
        schemas={schemas}
        onEdit={onEdit}
        onView={onView}
        onDelete={onDelete}
        isLoading={false}
        showStatistics={showStatistics}
        searchQuery={searchQuery}
      />
    );
  }
  if (viewMode === 'list') {
    return <SchemaListView schemas={schemas} onEdit={onEdit} onView={onView} onDelete={onDelete} searchQuery={searchQuery} />;
  }
  return <SchemaCardGrid schemas={schemas} onEdit={onEdit} onView={onView} onDelete={onDelete} searchQuery={searchQuery} />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SchemaManagerWrapper() {
  const router = useRouter();
  const BackIcon = useBackIcon();
  const language = useLanguageStore((s) => s.language);
  const defaultLang = getDefaultLanguage();
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Accordion expand/collapse state for ApplicationGroupedView
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const handleToggleGroup = (id: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const {
    loading,
    refreshing,
    searchQuery,
    setSearchQuery,
    tenantFilter,
    setTenantFilter,
    syncStrategyFilter,
    setSyncStrategyFilter,
    tenantOptions,
    syncStrategyOptions,
    activeTab,
    setActiveTab,
    showInactive,
    setShowInactive,
    viewMode,
    setViewMode,
    filteredSchemas,
    paginatedSchemas,
    currentPage,
    pageSize,
    totalPages,
    handlePageChange,
    handlePageSizeChange,
    schemas,
    systemSchemas,
    businessSchemas,
    systemSchemasCount,
    businessSchemasCount,
    actionFormSchemasCount,
    handleRefresh,
    deleteDialog,
    openDeleteDialog,
    closeDeleteDialog,
    handleDelete,
    createDialogOpen,
    openCreateDialog,
    closeCreateDialog,
    handleCreate,
    messages,
    clearMessages,
    showStatistics,
    setShowStatistics,
  } = useSchemaManagerPage();

  const handleViewSchema = (schema: FormSchema) => router.push(`/page/${schema.id}`);
  const handleEditSchema = (schema: FormSchema) => router.push(`/builder/schemas/${schema.id}`);

  const currentGroupIds = useMemo(
    () => groupSchemasByApplication(paginatedSchemas, language).map((g) => g.id),
    [paginatedSchemas, language],
  );

  const hasMultipleGroups =
    currentGroupIds.length > 1 ||
    (currentGroupIds.length === 1 && currentGroupIds[0] !== '__ungrouped__');

  const handleExpandAll = () => setCollapsedGroups(new Set());
  const handleCollapseAll = () => setCollapsedGroups(new Set(currentGroupIds));

  const handleClearCache = async () => {
    setIsClearingCache(true);

    const toastId = toast.loading('Clearing schema cache...');

    try {
      // Call server-side clear-cache route
      const response = await fetch('/api/schemas/clear-cache', {
        method: 'POST',
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = { success: response.ok };
      }

      // Always clear client-side IndexedDB schema cache as well
      await clearClientSchemaCache();

      if (data.success) {
        const reactQueryKeys: string[] = Array.isArray(data.reactQueryKeys) && data.reactQueryKeys.length > 0
          ? data.reactQueryKeys
          : ['schemas', 'companies'];
        // Clear React Query caches client-side
        if (typeof window !== 'undefined' && data.clearReactQueryCache) {
          // Dispatch event to clear React Query caches
          window.dispatchEvent(new CustomEvent('react-query-cache-clear', { 
            detail: { queryKeys: reactQueryKeys } 
          }));
          
          // Also trigger storage event for other tabs
          window.localStorage.setItem('react-query-cache-cleared', JSON.stringify(reactQueryKeys));
          window.localStorage.removeItem('react-query-cache-cleared');
        }
        
        toast.success(getT(TRANSLATION_KEYS.TOAST_CACHE_CLEARED_SUCCESS, language ?? undefined, defaultLang), { id: toastId });
      } else {
        toast.error(data.error || 'Failed to clear cache', { id: toastId });
      }
    } catch (error) {
      // On network error, still clear client-side cache to avoid stale data
      await clearClientSchemaCache();
      toast.error(
        error instanceof Error ? error.message : 'Failed to clear cache',
        { id: toastId }
      );
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleCreateSchema = async (payload: Parameters<typeof handleCreate>[0]) => {
    const result = await handleCreate(payload);
    if (result.success) {
      router.push(`/builder/schemas/${payload.schemaId}`);
    }
    return result;
  };

  const emptyState = useMemo(() => {
    if (filteredSchemas.length > 0 || loading) {
      return null;
    }

    const isSearching = searchQuery.trim().length > 0;

    return (
      <div className="text-center py-20">
        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          {isSearching ? 'No schemas found' : 'No schemas yet'}
        </h3>
        <p className="text-gray-500 mb-6">
          {isSearching ? 'Try adjusting your search query' : 'Get started by creating your first schema'}
        </p>
        {!isSearching && (
          <Button onClick={openCreateDialog} className="text-xs">
            <Plus className="h-4 w-4 me-2" />
            Create Your First Schema
          </Button>
        )}
      </div>
    );
  }, [filteredSchemas.length, loading, openCreateDialog, searchQuery]);

  useSetLayoutProps({
    title: 'Schema Builder',
    icon: 'Brackets',
    subtitle: 'Create and manage dynamic form schemas',
  });

  return (
    <>
      <div className="space-y-6">
        {messages && ((messages.messages && messages.messages.length > 0) || messages.message) && !createDialogOpen && (
          <MessageBox
            messages={messages.messages}
            message={messages.message}
            variant={(messages as any).success ? 'success' : 'error'}
            dismissible
            onDismiss={clearMessages}
          />
        )}

        <div className="flex items-center justify-between gap-2 mb-2">
          <Button variant="outline" onClick={() => router.push('/builder')} className="text-xs">
            <BackIcon className="h-4 w-4 me-2" />
            Back to Builder
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              disabled={isClearingCache}
              className="whitespace-nowrap text-xs"
            >
              {isClearingCache ? (
                <>
                  <RefreshCw className="h-4 w-4 me-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 me-2" />
                  Clear Cache
                </>
              )}
            </Button>
            <Button size="sm" onClick={openCreateDialog} className="text-xs">
              <Plus className="h-4 w-4 me-2" />
              New Schema
            </Button>
          </div>
        </div>

        <FormTabs
          value={activeTab}
          onValueChange={value => setActiveTab(value as 'system' | 'business' | 'action-form')}
        >
          <FormTabsList className="inline-grid! w-full grid-cols-3 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-900/40 select-none overflow-hidden h-auto! items-stretch">
            <FormTabsTrigger
              value="system"
              className="flex items-center gap-2 flex-1 rounded-lg py-2 px-3 text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white min-w-0"
            >
              <Settings className="h-4 w-4" />
              <span className="truncate">System Schemas</span>
              <Badge variant="secondary" className="ms-1 shrink-0 bg-violet-200 text-violet-800 hover:bg-violet-300 dark:bg-violet-500/20 dark:text-violet-100 dark:hover:bg-violet-500/30 transition-colors">
                {systemSchemasCount}
              </Badge>
            </FormTabsTrigger>
            <FormTabsTrigger
              value="business"
              className="flex items-center gap-2 flex-1 rounded-lg py-2 px-3 text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white min-w-0"
            >
              <Building2 className="h-4 w-4" />
              <span className="truncate">Business Schemas</span>
              <Badge variant="secondary" className="ms-1 shrink-0 bg-violet-200 text-violet-800 hover:bg-violet-300 dark:bg-violet-500/20 dark:text-violet-100 dark:hover:bg-violet-500/30 transition-colors">
                {businessSchemasCount}
              </Badge>
            </FormTabsTrigger>
            <FormTabsTrigger
              value="action-form"
              className="flex items-center gap-2 flex-1 rounded-lg py-2 px-3 text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white min-w-0"
            >
              <Zap className="h-4 w-4" />
              <span className="truncate">Action Forms</span>
              <Badge variant="secondary" className="ms-1 shrink-0 bg-violet-200 text-violet-800 hover:bg-violet-300 dark:bg-violet-500/20 dark:text-violet-100 dark:hover:bg-violet-500/30 transition-colors">
                {actionFormSchemasCount}
              </Badge>
            </FormTabsTrigger>
          </FormTabsList>

          <div className="flex gap-2 mt-4 items-center flex-wrap lg:flex-nowrap">
            <div className="flex-1 min-w-[200px] max-w-[400px]">
              <SearchInput
                config={{ name: 'search', placeholder: 'Search schemas...' }}
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
                className="[&_input]:h-10"
              />
            </div>
            <div className="w-[150px] shrink-0 [&>div]:w-full [&>div]:m-0">
              <Select
                config={{
                  name: 'tenant-filter',
                  placeholder: 'All Tenants',
                }}
                options={[
                  { id: '', label: 'All Tenants' },
                  { id: 'all-tenants', label: 'Apply to all tenants' },
                  ...tenantOptions,
                ]}
                value={tenantFilter ?? ''}
                onValueChange={(val: string) => setTenantFilter(val || undefined)}
                size="md"
                className="w-full m-0"
              />
            </div>
            <div className="w-[150px] shrink-0 [&>div]:w-full [&>div]:m-0">
              <Select
                config={{
                  name: 'sync-strategy-filter',
                  placeholder: 'Any sync',
                }}
                options={[
                  { id: '', label: 'Any' },
                  ...syncStrategyOptions,
                ]}
                value={syncStrategyFilter ?? ''}
                onValueChange={(val: 'schema-only' | 'schema-and-data' | '') =>
                  setSyncStrategyFilter(val || undefined)
                }
                size="md"
                className="w-full m-0"
              />
            </div>
            <div className="flex items-center rounded-lg px-3 h-10 shrink-0 whitespace-nowrap">
              <Switch
                config={{ 
                  name: 'show-statistics', 
                  label: 'Statistics'
                }}
                checked={showStatistics}
                onChange={setShowStatistics}
              />
            </div>
            {hasMultipleGroups && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl h-10 shadow-sm flex items-center px-1 shrink-0">
                <ExpandCollapseControls
                  onExpandAll={handleExpandAll}
                  onCollapseAll={handleCollapseAll}
                  expandDisabled={collapsedGroups.size === 0}
                  collapseDisabled={collapsedGroups.size === currentGroupIds.length}
                  variant="nobackground"
                  size="icon"
                />
              </div>
            )}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl h-10 shadow-sm flex items-center shrink-0">
              <ViewSwitcher
                currentView={viewMode}
                onViewChange={(v) => { if (v !== 'kanban') setViewMode(v); }}
                showOnly={['table', 'list', 'grid']}
                className="h-full"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="h-10 w-10 shrink-0"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            {schemas.some(s => s.inactive) && (
              <div className="flex items-center border border-gray-300 dark:border-gray-500 rounded-lg px-3 h-10 shrink-0 whitespace-nowrap">
                <Switch
                  config={{ 
                    name: 'show-inactive', 
                    label: 'Show Inactive Schemas'
                  }}
                  checked={showInactive}
                  onChange={setShowInactive}
                />
              </div>
            )}
          </div>

          {filteredSchemas.length > 0 && (
            <div className="mt-4 border-b border-gray-200 dark:border-gray-700">
              <DynamicPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredSchemas.length}
                pageSize={pageSize}
                pageSizeOptions={[10, 25, 50, 100, 500, 'all']}
                showPageSizeSelector={true}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}

          {(['system', 'business', 'action-form'] as const).map((tab) => (
            <FormTabsContent key={tab} value={tab} className="mt-4">
              {loading ? (
                viewMode === 'table' ? (
                  <div className="w-full">
                    <SchemaTableView
                      schemas={[]}
                      onEdit={handleEditSchema}
                      onView={handleViewSchema}
                      onDelete={openDeleteDialog}
                      isLoading={true}
                    />
                  </div>
                ) : (
                  <SchemaCardSkeletonGrid />
                )
              ) : paginatedSchemas.length > 0 ? (
                <ApplicationGroupedView
                  schemas={paginatedSchemas}
                  language={language}
                  viewMode={viewMode}
                  showStatistics={showStatistics}
                  onEdit={handleEditSchema}
                  onView={handleViewSchema}
                  onDelete={openDeleteDialog}
                  collapsedGroups={collapsedGroups}
                  onToggleGroup={handleToggleGroup}
                  searchQuery={searchQuery}
                />
              ) : (
                emptyState
              )}
            </FormTabsContent>
          ))}
        </FormTabs>
      </div>

      <CreateSchemaDialog
        open={createDialogOpen}
        onOpenChange={(open) => (open ? openCreateDialog() : closeCreateDialog())}
        onSubmit={handleCreateSchema}
      />

      <SchemaDeleteConfirmDialog
        isOpen={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteDialog();
          }
        }}
        schemaName={deleteDialog.schema?.plural_name || deleteDialog.schema?.singular_name || deleteDialog.schema?.id || 'this schema'}
        onConfirm={handleDelete}
      />
    </>
  );
}
