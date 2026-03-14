'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from '@/components/ui/sonner';
import { Plus, RefreshCw, Bot, ChevronDown, ChevronRight } from 'lucide-react';
import { useBackIcon } from '@/gradian-ui/shared/hooks';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
import { HierarchyExpandCollapseControls } from '@/gradian-ui/data-display/components/HierarchyExpandCollapseControls';
import { useAiAgentManagerPage } from '../../hooks/useAiAgentManagerPage';
import { AiAgent } from '../../types';
import { AiPromptHistory } from '@/domains/ai-prompts';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';

export function AiAgentManagerWrapper() {
  const router = useRouter();
  const BackIcon = useBackIcon();
  const [activeTab, setActiveTab] = useState('agents');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const {
    loading,
    refreshing,
    searchQuery,
    setSearchQuery,
    selectedEntityTypeId,
    setSelectedEntityTypeId,
    availableEntityTypes,
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

  const handleViewAgent = (agent: AiAgent) => router.push(`/ai-builder?agentId=${encodeURIComponent(agent.id)}`);
  const handleEditAgent = (agent: AiAgent) => router.push(`/builder/ai-agents/${agent.id}`);

  const handleCreateAgent = async (agentData: Omit<AiAgent, 'id'> & { id: string }) => {
    const result = await handleCreate(agentData);
    if (result.success) {
      router.push(`/builder/ai-agents/${agentData.id}`);
    }
    return result;
  };
  const entityTypeMetaById = useMemo(
    () =>
      new Map(
        availableEntityTypes.map((t: any) => [
          t.id,
          { id: t.id, label: t.label, icon: t.icon, color: t.color },
        ]),
      ),
    [availableEntityTypes],
  );

  // Group agents by entity type label (fallback to "Other")
  const groupedAgents = useMemo(() => {
    const groups = new Map<
      string,
      { id: string; label: string; icon?: string; color?: string; agents: AiAgent[] }
    >();
    filteredAgents.forEach((agent) => {
      const typeId = agent.entityType?.id;
      const meta = typeId ? entityTypeMetaById.get(typeId) : undefined;
      const label = meta?.label || agent.entityType?.label || 'Other';
      const id = meta?.id || typeId || `__${label.replace(/\s+/g, '_').toLowerCase()}__`;
      if (!groups.has(id)) {
        groups.set(id, {
          id,
          label,
          icon: meta?.icon,
          color: meta?.color,
          agents: [],
        });
      }
      groups.get(id)!.agents.push(agent);
    });
    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredAgents, entityTypeMetaById]);

  const currentGroupIds = useMemo(
    () => groupedAgents.map((g) => g.id),
    [groupedAgents],
  );

  const hasMultipleGroups =
    currentGroupIds.length > 1 ||
    (currentGroupIds.length === 1 && currentGroupIds[0] !== '__other__');

  const handleToggleGroup = (id: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const handleExpandAllGroups = () => setCollapsedGroups(new Set());
  const handleCollapseAllGroups = () => setCollapsedGroups(new Set(currentGroupIds));


  const handleViewChange = (view: 'grid' | 'list' | 'table' | 'hierarchy' | 'kanban') => {
    // Only accept valid view modes, ignore hierarchy
    if (view !== 'hierarchy' && view !== 'kanban') {
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
            <Plus className="h-4 w-4 me-2" />
            Create Your First AI Agent
          </Button>
        )}
      </div>
    );
  }, [filteredAgents.length, loading, openCreateDialog, searchQuery]);

  useSetLayoutProps({
    title: 'AI Agents Builder',
    icon: 'Bot',
    subtitle: (
      <div className="flex items-center gap-2">
        <span>Create and manage AI agents for intelligent automation</span>
        {!loading && agents.length > 0 && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {agents.length}
          </Badge>
        )}
      </div>
    ),
  });

  return (
    <>
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
            <BackIcon className="h-4 w-4 me-2" />
            Back to Builder
          </Button>
          <div className="flex items-center gap-2">
            {activeTab === 'agents' && (
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 me-2" />
                New Agent
              </Button>
            )}
          </div>
        </div>

        <FormTabs value={activeTab} onValueChange={setActiveTab}>
          <FormTabsList>
            <FormTabsTrigger value="agents">
              <Bot className="h-4 w-4 me-2" />
              AI Agents
            </FormTabsTrigger>
            <FormTabsTrigger value="history">
              <RefreshCw className="h-4 w-4 me-2" />
              Prompt History
            </FormTabsTrigger>
          </FormTabsList>

          <FormTabsContent value="agents" className="space-y-4 mt-4">
            <div className="flex gap-2 items-center flex-wrap">
              <div className="flex-1">
                <SearchInput
                  config={{ name: 'search', placeholder: 'Search AI agents...' }}
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onClear={() => setSearchQuery('')}
                  className="h-10"
                />
              </div>
              <div className="w-full sm:w-56">
                <Select
                  value={selectedEntityTypeId}
                  onValueChange={(value) => setSelectedEntityTypeId(value as typeof selectedEntityTypeId)}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {availableEntityTypes.map((type: any) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          {type.icon && (
                            <IconRenderer
                              iconName={type.icon}
                              className="h-4 w-4"
                            />
                          )}
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasMultipleGroups && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl h-9 shadow-sm sm:h-10 flex items-center px-1 shrink-0">
                  <HierarchyExpandCollapseControls
                    onExpandAll={handleExpandAllGroups}
                    onCollapseAll={handleCollapseAllGroups}
                    expandDisabled={collapsedGroups.size === 0}
                    collapseDisabled={collapsedGroups.size === currentGroupIds.length}
                    variant="nobackground"
                    size="icon"
                  />
                </div>
              )}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl h-9 shadow-sm sm:h-10 flex items-center shrink-0">
                <ViewSwitcher
                  currentView={viewMode}
                  onViewChange={handleViewChange}
                  className="h-full"
                  showHierarchy={false}
                  showOnly={['grid', 'list', 'table']}
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
                <div className="space-y-4">
                  {groupedAgents.map((group) => {
                    const isCollapsed = collapsedGroups.has(group.id);
                    return (
                      <div
                        key={group.id}
                        className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900/60 shadow-sm"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleGroup(group.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-slate-100 dark:bg-slate-800/60 hover:bg-violet-50 dark:hover:bg-slate-800 transition-colors text-left"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                          )}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {group.icon && (
                              <IconRenderer
                                iconName={group.icon}
                                className="h-4 w-4"
                                style={group.color ? { color: group.color } : undefined}
                              />
                            )}
                            <span className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">
                              {group.label}
                            </span>
                          </div>
                          <Badge
                            variant="secondary"
                            className="shrink-0 bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                          >
                            {group.agents.length}
                          </Badge>
                        </button>
                        {!isCollapsed && (
                          <div className="p-4">
                            {viewMode === 'table' ? (
                              <AiAgentTableView
                                agents={group.agents}
                                onEdit={handleEditAgent}
                                onView={handleViewAgent}
                                onDelete={openDeleteDialog}
                                isLoading={false}
                              />
                            ) : viewMode === 'list' ? (
                              <AiAgentListView
                                agents={group.agents}
                                onEdit={handleEditAgent}
                                onView={handleViewAgent}
                                onDelete={openDeleteDialog}
                              />
                            ) : (
                              <AiAgentCardGrid
                                agents={group.agents}
                                onEdit={handleEditAgent}
                                onView={handleViewAgent}
                                onDelete={openDeleteDialog}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                emptyState
              )}
            </div>
          </FormTabsContent>

          <FormTabsContent value="history" className="mt-4">
            <AiPromptHistory showFilters={true} />
          </FormTabsContent>
        </FormTabs>
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
    </>
  );
}

