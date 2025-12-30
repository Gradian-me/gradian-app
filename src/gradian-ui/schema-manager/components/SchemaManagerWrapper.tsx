'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Plus, RefreshCw, Settings, Building2, FileText, Zap } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
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
import { DynamicPagination } from '@/gradian-ui/data-display/components/DynamicPagination';
import { useSchemaManagerPage } from '../hooks/useSchemaManagerPage';
import { FormSchema } from '../types';

export function SchemaManagerWrapper() {
  const router = useRouter();
  const [isClearingCache, setIsClearingCache] = useState(false);
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

  const handleClearCache = async () => {
    setIsClearingCache(true);

    const toastId = toast.loading('Clearing schema cache...');

    try {
      const response = await fetch('/api/schemas/clear-cache', {
        method: 'POST',
      });

      const data = await response.json();

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
        
        toast.success('Cache cleared successfully!', { id: toastId });
      } else {
        toast.error(data.error || 'Failed to clear cache', { id: toastId });
      }
    } catch (error) {
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
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 me-2" />
            Create Your First Schema
          </Button>
        )}
      </div>
    );
  }, [filteredSchemas.length, loading, openCreateDialog, searchQuery]);

  return (
    <MainLayout 
      title="Schema Builder"
      icon="Brackets" subtitle="Create and manage dynamic form schemas">
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
          <Button variant="outline" onClick={() => router.push('/builder')}>
            <ArrowLeft className="h-4 w-4 me-2" />
            Back to Builder
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              disabled={isClearingCache}
              className="whitespace-nowrap"
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
            <Button size="sm" onClick={openCreateDialog}>
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
            <div className="flex items-center border border-gray-300 dark:border-gray-500 rounded-lg px-3 h-10 shrink-0 whitespace-nowrap">
              <Switch
                config={{ 
                  name: 'show-statistics', 
                  label: 'Statistics'
                }}
                checked={showStatistics}
                onChange={setShowStatistics}
              />
            </div>
            <div className="border border-gray-300 dark:border-gray-500 rounded-md h-10 flex items-center shrink-0">
              <ViewSwitcher
                currentView={viewMode}
                onViewChange={setViewMode}
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

          <FormTabsContent value="system" className="mt-4">
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
              viewMode === 'table' ? (
                <SchemaTableView
                  schemas={paginatedSchemas}
                  onEdit={handleEditSchema}
                  onView={handleViewSchema}
                  onDelete={openDeleteDialog}
                  isLoading={false}
                  showStatistics={showStatistics}
                />
              ) : viewMode === 'list' ? (
                <SchemaListView
                  schemas={paginatedSchemas}
                  onEdit={handleEditSchema}
                  onView={handleViewSchema}
                  onDelete={openDeleteDialog}
                />
              ) : (
                <SchemaCardGrid
                  schemas={paginatedSchemas}
                  onEdit={handleEditSchema}
                  onView={handleViewSchema}
                  onDelete={openDeleteDialog}
                />
              )
            ) : (
              emptyState
            )}
          </FormTabsContent>

          <FormTabsContent value="business" className="mt-4">
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
              viewMode === 'table' ? (
                <SchemaTableView
                  schemas={paginatedSchemas}
                  onEdit={handleEditSchema}
                  onView={handleViewSchema}
                  onDelete={openDeleteDialog}
                  isLoading={false}
                  showStatistics={showStatistics}
                />
              ) : viewMode === 'list' ? (
                <SchemaListView
                  schemas={paginatedSchemas}
                  onEdit={handleEditSchema}
                  onView={handleViewSchema}
                  onDelete={openDeleteDialog}
                />
              ) : (
                <SchemaCardGrid
                  schemas={paginatedSchemas}
                  onEdit={handleEditSchema}
                  onView={handleViewSchema}
                  onDelete={openDeleteDialog}
                />
              )
            ) : (
              emptyState
            )}
          </FormTabsContent>
          <FormTabsContent value="action-form" className="mt-4">
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
              viewMode === 'table' ? (
                <SchemaTableView
                  schemas={paginatedSchemas}
                  onEdit={handleEditSchema}
                  onView={handleViewSchema}
                  onDelete={openDeleteDialog}
                  isLoading={false}
                  showStatistics={showStatistics}
                />
              ) : viewMode === 'list' ? (
                <SchemaListView
                  schemas={paginatedSchemas}
                  onEdit={handleEditSchema}
                  onView={handleViewSchema}
                  onDelete={openDeleteDialog}
                />
              ) : (
                <SchemaCardGrid
                  schemas={paginatedSchemas}
                  onEdit={handleEditSchema}
                  onView={handleViewSchema}
                  onDelete={openDeleteDialog}
                />
              )
            ) : (
              emptyState
            )}
          </FormTabsContent>
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
    </MainLayout>
  );
}
