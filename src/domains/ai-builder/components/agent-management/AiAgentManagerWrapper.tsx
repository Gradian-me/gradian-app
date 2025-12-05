'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Plus, RefreshCw, Bot } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { AiAgentCardGrid, AiAgentCardSkeletonGrid } from './AiAgentCardGrid';
import { AiAgentListView } from './AiAgentListView';
import { AiAgentTableView } from './AiAgentTableView';
import { CreateAiAgentDialog } from './CreateAiAgentDialog';
import { AiAgentDeleteConfirmDialog } from './AiAgentDeleteConfirmDialog';
import {
  SearchInput,
  FormTabs,
  FormTabsList,
  FormTabsTrigger,
  FormTabsContent,
} from '@/gradian-ui/form-builder/form-elements';
import { MessageBox } from '@/gradian-ui/layout/message-box';
import { ViewSwitcher } from '@/gradian-ui/data-display/components/ViewSwitcher';
import { useAiAgentManagerPage } from '../../hooks/useAiAgentManagerPage';
import { AiAgent } from '../../types';

export function AiAgentManagerWrapper() {
  const router = useRouter();
  const {
    loading,
    refreshing,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    filteredAgents,
    agents,
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
  } = useAiAgentManagerPage();

  const handleViewAgent = (agent: AiAgent) => router.push(`/builder/ai-agents/${agent.id}`);
  const handleEditAgent = (agent: AiAgent) => router.push(`/builder/ai-agents/${agent.id}`);

  const handleCreateAgent = async (agentData: Omit<AiAgent, 'id'> & { id: string }) => {
    const result = await handleCreate(agentData);
    if (result.success) {
      router.push(`/builder/ai-agents/${agentData.id}`);
    }
    return result;
  };

  const handleViewChange = (view: 'grid' | 'list' | 'table' | 'hierarchy') => {
    // Only accept valid view modes, ignore hierarchy
    if (view !== 'hierarchy') {
      setViewMode(view);
    }
  };

  const emptyState = useMemo(() => {
    if (filteredAgents.length > 0 || loading) {
      return null;
    }

    const isSearching = searchQuery.trim().length > 0;

    return (
      <div className="text-center py-20">
        <Bot className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {isSearching ? 'No AI agents found' : 'No AI agents yet'}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          {isSearching ? 'Try adjusting your search query' : 'Get started by creating your first AI agent'}
        </p>
        {!isSearching && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First AI Agent
          </Button>
        )}
      </div>
    );
  }, [filteredAgents.length, loading, openCreateDialog, searchQuery]);

  return (
    <MainLayout 
      title="AI Agents Builder"
      icon="Bot" 
      subtitle="Create and manage AI agents for intelligent automation">
      <div className="space-y-6">
        {messages && (messages.message || messages.error) && !createDialogOpen && (
          <MessageBox
            message={messages.message || messages.error}
            variant={messages.success ? 'success' : 'error'}
            dismissible
            onDismiss={clearMessages}
          />
        )}

        <div className="flex items-center justify-between gap-2 mb-2">
          <Button variant="outline" onClick={() => router.push('/builder')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Builder
          </Button>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Agent
            </Button>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <SearchInput
              config={{ name: 'search', placeholder: 'Search AI agents...' }}
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              className="[&_input]:h-10"
            />
          </div>
          <div className="border border-gray-300 dark:border-gray-500 rounded-md h-10 flex items-center shrink-0">
            <ViewSwitcher
              currentView={viewMode}
              onViewChange={handleViewChange}
              className="h-full"
              showHierarchy={false}
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

        <div className="mt-4">
          {loading ? (
            viewMode === 'table' ? (
              <div className="w-full">
                <AiAgentTableView
                  agents={[]}
                  onEdit={handleEditAgent}
                  onView={handleViewAgent}
                  onDelete={openDeleteDialog}
                  isLoading={true}
                />
              </div>
            ) : (
              <AiAgentCardSkeletonGrid />
            )
          ) : filteredAgents.length > 0 ? (
            viewMode === 'table' ? (
              <AiAgentTableView
                agents={filteredAgents}
                onEdit={handleEditAgent}
                onView={handleViewAgent}
                onDelete={openDeleteDialog}
                isLoading={false}
              />
            ) : viewMode === 'list' ? (
              <AiAgentListView
                agents={filteredAgents}
                onEdit={handleEditAgent}
                onView={handleViewAgent}
                onDelete={openDeleteDialog}
              />
            ) : (
              <AiAgentCardGrid
                agents={filteredAgents}
                onEdit={handleEditAgent}
                onView={handleViewAgent}
                onDelete={openDeleteDialog}
              />
            )
          ) : (
            emptyState
          )}
        </div>
      </div>

      <CreateAiAgentDialog
        open={createDialogOpen}
        onOpenChange={(open) => (open ? openCreateDialog() : closeCreateDialog())}
        onSubmit={handleCreateAgent}
      />

      <AiAgentDeleteConfirmDialog
        isOpen={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteDialog();
          }
        }}
        agentName={deleteDialog.agent?.label || deleteDialog.agent?.id || 'this agent'}
        onConfirm={handleDelete}
      />
    </MainLayout>
  );
}

