'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { DEMO_MODE } from '@/gradian-ui/shared/constants/application-variables';
import {
  useAiAgents,
  useAiBuilder,
  AiBuilderForm,
  AiBuilderResponse,
  MessageDisplay,
} from '@/domains/ai-builder';

export default function AiBuilderPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { agents, loading: isLoadingAgents } = useAiAgents();
  const {
    userPrompt,
    setUserPrompt,
    aiResponse,
    tokenUsage,
    isLoading,
    isApproving,
    error,
    successMessage,
    preloadedContext,
    isLoadingPreload,
    generateResponse,
    stopGeneration,
    approveResponse,
    loadPreloadRoutes,
    clearResponse,
  } = useAiBuilder();

  // Get selected agent
  const selectedAgent = agents.find(agent => agent.id === selectedAgentId) || null;

  // Set first agent as default when agents load
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  // Clear response when agent changes
  useEffect(() => {
    clearResponse();
  }, [selectedAgentId, clearResponse]);

  // Load preload routes when agent or sheet opens
  useEffect(() => {
    if (isSheetOpen && selectedAgent) {
      loadPreloadRoutes(selectedAgent);
    }
  }, [isSheetOpen, selectedAgent?.id, loadPreloadRoutes]);

  // Get the prompt that would be sent to LLM
  const getPromptForLLM = () => {
    if (!selectedAgent || !userPrompt.trim()) {
      return null;
    }

    const systemPrompt = (selectedAgent.systemPrompt || '') + preloadedContext;

    return {
      systemPrompt,
      userPrompt: userPrompt.trim(),
    };
  };

  const handleGenerate = () => {
    if (!selectedAgentId) return;
    generateResponse({
      userPrompt,
      agentId: selectedAgentId,
    });
  };

  const handleApprove = () => {
    if (!selectedAgent || !aiResponse) return;
    approveResponse(aiResponse, selectedAgent);
  };

  // Skeleton component for loading state
  if (isLoadingAgents) {
    return (
      <MainLayout
        title="AI Builder"
        subtitle="Transform your ideas into reality with the power of AI"
        icon="Sparkles"
      >
        <div className="space-y-6">
          {/* User Prompt Input Skeleton - matches AiBuilderForm structure */}
          <div className="space-y-2 flex flex-col items-center">
            {/* Label and Select Row Skeleton - matches new layout */}
            <div className="flex flex-row justify-between items-center flex-wrap gap-2 w-full max-w-3xl">
              <Skeleton className="h-5 w-48 rounded-md bg-gray-300 dark:bg-gray-700" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-48 rounded-lg bg-gray-300 dark:bg-gray-700" />
                <Skeleton className="h-9 w-32 rounded-md bg-gray-300 dark:bg-gray-700" />
              </div>
            </div>
            
            {/* Textarea Skeleton with gradient effect */}
            <div className="relative w-full max-w-3xl">
              <Skeleton className="h-32 w-full rounded-2xl bg-gray-300 dark:bg-gray-700" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-50/50 via-transparent to-purple-50/50 dark:from-violet-950/20 dark:via-transparent dark:to-purple-950/20" />
            </div>
            
            {/* Model Badge and Buttons Row Skeleton - matches new layout */}
            <div className="flex justify-between items-center w-full max-w-3xl">
              {/* Model Badge on Left */}
              <Skeleton className="h-6 w-28 rounded-full bg-violet-200 dark:bg-violet-900/60" />
              
              {/* Buttons on Right */}
              <div className="flex items-center gap-2">
                {DEMO_MODE && (
                  <Skeleton className="h-10 w-24 rounded-md bg-gray-300 dark:bg-gray-700 opacity-70" />
                )}
                <div className="relative overflow-hidden rounded-md">
                  <Skeleton className="h-10 w-36 rounded-md bg-gray-300 dark:bg-gray-700" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/10 animate-shimmer" />
                </div>
              </div>
            </div>
          </div>

          {/* Response Preview Skeleton - matches AiBuilderResponse structure */}
          <div className="space-y-4">
            {/* Header with title, token info, and approve button */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-7 w-40 rounded-md bg-gray-300 dark:bg-gray-700" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-64 rounded-md bg-gray-300 dark:bg-gray-700 opacity-80" />
                <Skeleton className="h-10 w-28 rounded-md bg-gray-300 dark:bg-gray-700" />
              </div>
            </div>
            
            {/* CodeViewer Skeleton */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900/50 dark:to-gray-800/30 overflow-hidden">
              {/* CodeViewer Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/50">
                <Skeleton className="h-4 w-48 rounded-md bg-gray-300 dark:bg-gray-700" />
              </div>
              {/* CodeViewer Content */}
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-full rounded-md bg-gray-300 dark:bg-gray-700" />
                <Skeleton className="h-4 w-5/6 rounded-md bg-gray-300 dark:bg-gray-700 opacity-80" />
                <Skeleton className="h-4 w-4/6 rounded-md bg-gray-300 dark:bg-gray-700 opacity-60" />
                <Skeleton className="h-4 w-3/4 rounded-md bg-gray-300 dark:bg-gray-700 opacity-50" />
                <Skeleton className="h-4 w-5/6 rounded-md bg-gray-300 dark:bg-gray-700 opacity-40" />
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const promptForLLM = getPromptForLLM();

  return (
    <MainLayout
      title="AI Builder"
      subtitle="Transform your ideas into reality with the power of AI"
      icon="Sparkles"
    >
      <div className="space-y-6">
        <AiBuilderForm
          userPrompt={userPrompt}
          onPromptChange={setUserPrompt}
          agents={agents}
          selectedAgentId={selectedAgentId}
          onAgentChange={setSelectedAgentId}
          isLoading={isLoading}
          onGenerate={handleGenerate}
          onStop={stopGeneration}
          systemPrompt={promptForLLM?.systemPrompt || ''}
          isLoadingPreload={isLoadingPreload}
          isSheetOpen={isSheetOpen}
          onSheetOpenChange={setIsSheetOpen}
        />

        <MessageDisplay error={error} successMessage={successMessage} />

        {aiResponse && selectedAgent && (
          <AiBuilderResponse
            response={aiResponse}
            agent={selectedAgent}
            tokenUsage={tokenUsage}
            isApproving={isApproving}
            onApprove={handleApprove}
          />
        )}
      </div>
    </MainLayout>
  );
}
