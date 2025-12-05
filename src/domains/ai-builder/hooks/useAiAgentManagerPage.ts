'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AiAgent } from '../types';

interface DeleteDialogState {
  open: boolean;
  agent: AiAgent | null;
}

interface MessagesResponse {
  success: boolean;
  message?: string;
  error?: string;
  messages?: any[];
}

async function fetchAiAgents(): Promise<AiAgent[]> {
  const response = await fetch('/api/ai-agents', {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to fetch AI agents');
  }

  return result.data || [];
}

export const useAiAgentManagerPage = () => {
  const queryClient = useQueryClient();
  const { data: agents = [], isLoading, error: agentsError, refetch: refetchAgents } = useQuery<AiAgent[]>({
    queryKey: ['ai-agents'],
    queryFn: fetchAiAgents,
    staleTime: 0,
    gcTime: 0,
  });

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({ open: false, agent: null });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [messages, setMessages] = useState<MessagesResponse | null>(null);

  const loading = isLoading || refreshing;

  // Handle error messages from React Query
  useEffect(() => {
    if (agentsError) {
      const errorMessage = agentsError instanceof Error ? agentsError.message : 'Error fetching AI agents';
      setMessages({
        success: false,
        error: errorMessage,
      });
    }
  }, [agentsError]);

  // Filter agents based on search query
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) {
      return agents;
    }

    const query = searchQuery.toLowerCase();
    return agents.filter((agent) => {
      return (
        agent.id.toLowerCase().includes(query) ||
        agent.label.toLowerCase().includes(query) ||
        (agent.description && agent.description.toLowerCase().includes(query)) ||
        (agent.model && agent.model.toLowerCase().includes(query))
      );
    });
  }, [agents, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchAgents();
      toast.success('AI agents refreshed');
    } catch (error) {
      toast.error('Failed to refresh AI agents');
    } finally {
      setRefreshing(false);
    }
  };

  const openDeleteDialog = (agent: AiAgent) => {
    setDeleteDialog({ open: true, agent });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, agent: null });
  };

  const handleDelete = async () => {
    if (!deleteDialog.agent) return;

    const agentId = deleteDialog.agent.id;
    const agentLabel = deleteDialog.agent.label;

    try {
      const response = await fetch(`/api/ai-agents/${agentId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Invalidate and refetch
        await queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
        toast.success(`AI agent "${agentLabel}" deleted successfully`);
        setMessages({
          success: true,
          message: `AI agent "${agentLabel}" deleted successfully`,
        });
      } else {
        toast.error(result.error || 'Failed to delete AI agent');
        setMessages({
          success: false,
          error: result.error || 'Failed to delete AI agent',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete AI agent';
      toast.error(errorMessage);
      setMessages({
        success: false,
        error: errorMessage,
      });
    }
  };

  const openCreateDialog = () => {
    setCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  const handleCreate = async (agentData: Omit<AiAgent, 'id'> & { id: string }): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const response = await fetch('/api/ai-agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      });

      const result = await response.json();

      if (result.success) {
        // Invalidate and refetch
        await queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
        toast.success(`AI agent "${agentData.label}" created successfully`);
        return {
          success: true,
          message: `AI agent "${agentData.label}" created successfully`,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to create AI agent',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create AI agent';
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const clearMessages = () => {
    setMessages(null);
  };

  return {
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
  };
};

