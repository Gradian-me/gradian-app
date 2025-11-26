'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { ArrowLeft, Plus, RefreshCw, Settings, Building2, FileText } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SchemaCardGrid, SchemaCardSkeletonGrid } from './SchemaCardGrid';
import { SchemaListView } from './SchemaListView';
import { SchemaTableView } from './SchemaTableView';
import { CreateSchemaDialog } from './CreateSchemaDialog';
import { ConfirmationMessage } from '@/gradian-ui/form-builder';
import {
  SearchInput,
  Switch,
  FormTabs,
  FormTabsList,
  FormTabsTrigger,
  FormTabsContent,
} from '@/gradian-ui/form-builder/form-elements';
import { MessageBox } from '@/gradian-ui/layout/message-box';
import { DynamicFilterPane } from '@/gradian-ui/shared/components';
import { ViewSwitcher } from '@/gradian-ui/data-display/components/ViewSwitcher';
import { useSchemaManagerPage } from '../hooks/useSchemaManagerPage';
import { FormSchema } from '../types';

export function SchemaManagerWrapper() {
  const router = useRouter();
  const {
    loading,
    refreshing,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    showInactive,
    setShowInactive,
    viewMode,
    setViewMode,
    filteredSchemas,
    schemas,
    systemSchemas,
    businessSchemas,
    systemSchemasCount,
    businessSchemasCount,
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
  } = useSchemaManagerPage();

  const handleViewSchema = (schema: FormSchema) => router.push(`/page/${schema.id}`);
  const handleEditSchema = (schema: FormSchema) => router.push(`/builder/schemas/${schema.id}`);

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
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Schema
          </Button>
        )}
      </div>
    );
  }, [filteredSchemas.length, loading, openCreateDialog, searchQuery]);

  return (
    <MainLayout 
      title="Schema Builder"
      icon="PencilRuler" subtitle="Create and manage dynamic form schemas">
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
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Builder
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Schema
          </Button>
        </div>

        <FormTabs
          value={activeTab}
          onValueChange={value => setActiveTab(value as 'system' | 'business')}
        >
          <FormTabsList className="inline-grid! w-full grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-900/40 select-none overflow-hidden h-auto! items-stretch">
            <FormTabsTrigger
              value="system"
              className="flex items-center gap-2 flex-1 rounded-lg py-2 px-3 text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white min-w-0"
            >
              <Settings className="h-4 w-4" />
              <span className="truncate">System Schemas</span>
              <Badge variant="secondary" className="ms-1 shrink-0 bg-violet-200 dark:bg-violet-500/20 dark:text-violet-100">
                {systemSchemasCount}
              </Badge>
            </FormTabsTrigger>
            <FormTabsTrigger
              value="business"
              className="flex items-center gap-2 flex-1 rounded-lg py-2 px-3 text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white min-w-0"
            >
              <Building2 className="h-4 w-4" />
              <span className="truncate">Business Schemas</span>
              <Badge variant="secondary" className="ms-1 shrink-0 bg-violet-200 dark:bg-violet-500/20 dark:text-violet-100">
                {businessSchemasCount}
              </Badge>
            </FormTabsTrigger>
          </FormTabsList>

          <div className="flex gap-2 mt-4 items-center">
            <div className="flex-1">
              <SearchInput
                config={{ name: 'search', placeholder: 'Search schemas...' }}
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
                className="[&_input]:h-10"
              />
            </div>
            {schemas.some(s => s.inactive) && (
              <div className="flex items-center border border-gray-300 rounded-lg px-3 h-10">
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
              className="h-10 w-10"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

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
            ) : filteredSchemas.length > 0 ? (
              viewMode === 'table' ? (
                <SchemaTableView
                  schemas={filteredSchemas}
                  onEdit={handleEditSchema}
                  onView={handleViewSchema}
                  onDelete={openDeleteDialog}
                  isLoading={false}
                />
              ) : viewMode === 'list' ? (
                <SchemaListView
                  schemas={filteredSchemas}
                  onEdit={handleEditSchema}
                  onView={handleViewSchema}
                  onDelete={openDeleteDialog}
                />
              ) : (
                <SchemaCardGrid
                  schemas={filteredSchemas}
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
            ) : filteredSchemas.length > 0 ? (
              viewMode === 'table' ? (
                <SchemaTableView
                  schemas={filteredSchemas}
                  onEdit={handleEditSchema}
                  onView={handleViewSchema}
                  onDelete={openDeleteDialog}
                  isLoading={false}
                />
              ) : viewMode === 'list' ? (
                <SchemaListView
                  schemas={filteredSchemas}
                  onEdit={handleEditSchema}
                  onView={handleViewSchema}
                  onDelete={openDeleteDialog}
                />
              ) : (
                <SchemaCardGrid
                  schemas={filteredSchemas}
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

      <ConfirmationMessage
        isOpen={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteDialog();
          }
        }}
        title="Set Schema Inactive"
        message={
          <>
            Are you sure you want to set "{deleteDialog.schema?.plural_name}" as inactive? It will be hidden from the schema list but can be reactivated later.
          </>
        }
        variant="destructive"
        buttons={[
          {
            label: 'Cancel',
            variant: 'outline',
            action: () => closeDeleteDialog(),
          },
          {
            label: 'Delete',
            variant: 'destructive',
            icon: 'Trash2',
            action: handleDelete,
          },
        ]}
      />
    </MainLayout>
  );
}
