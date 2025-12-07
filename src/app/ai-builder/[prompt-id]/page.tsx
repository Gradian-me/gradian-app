'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { DEMO_MODE } from '@/gradian-ui/shared/constants/application-variables';
import { Modal } from '@/gradian-ui/data-display/components/Modal';
import { SchemaFormWrapper } from '@/gradian-ui/form-builder/components/FormLifecycleManager';
import { ListInput } from '@/gradian-ui/form-builder/form-elements';
import { Spinner } from '@/components/ui/spinner';
import {
  useAiAgents,
  useAiBuilder,
  AiBuilderForm,
  AiBuilderResponse,
  MessageDisplay,
} from '@/domains/ai-builder';
import { ResponseAnnotationViewer } from '@/domains/ai-builder/components/ResponseAnnotationViewer';
import type { SchemaAnnotation, AnnotationItem } from '@/domains/ai-builder/types';
import type { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { useAiPrompts } from '@/domains/ai-prompts';
import { ModifiedPromptsList } from '@/domains/ai-prompts/components/ModifiedPromptsList';
import type { AiPrompt } from '@/domains/ai-prompts/types';
import { useUserStore } from '@/stores/user.store';
import { config } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ConfirmationMessage } from '@/gradian-ui/form-builder/form-elements/components/ConfirmationMessage';

export default function AiBuilderPromptPage() {
  const params = useParams();
  const router = useRouter();
  const promptId = params['prompt-id'] as string;
  
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [previewSchema, setPreviewSchema] = useState<{ schema: FormSchema; schemaId: string } | null>(null);
  const [annotations, setAnnotations] = useState<Map<string, SchemaAnnotation>>(new Map());
  const [lastPromptId, setLastPromptId] = useState<string | null>(null);
  const [firstPromptId, setFirstPromptId] = useState<string | null>(null);
  const [previousUserPrompt, setPreviousUserPrompt] = useState<string>('');
  const [previousAiResponse, setPreviousAiResponse] = useState<string>('');
  const [isApplyingAnnotations, setIsApplyingAnnotations] = useState(false);
  const [loadedPrompt, setLoadedPrompt] = useState<AiPrompt | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [modifiedPrompts, setModifiedPrompts] = useState<AiPrompt[]>([]);
  const [agents, setAgents] = useState<Array<{ id: string; label: string; icon?: string; model?: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string; lastname?: string; username?: string }>>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const user = useUserStore((state) => state.user);
  const { createPrompt } = useAiPrompts();

  const { agents: aiAgents, loading: isLoadingAgents } = useAiAgents();
  const {
    userPrompt,
    setUserPrompt,
    aiResponse,
    tokenUsage,
    duration,
    isLoading,
    isApproving,
    error,
    successMessage,
    preloadedContext,
    isLoadingPreload,
    lastPromptId: hookLastPromptId,
    generateResponse,
    stopGeneration,
    approveResponse,
    loadPreloadRoutes,
    clearResponse,
  } = useAiBuilder();

  // Load the prompt by ID
  useEffect(() => {
    const loadPrompt = async () => {
      if (!promptId) return;
      
      setLoadingPrompt(true);
      try {
        const response = await fetch(`/api/ai-prompts/${promptId}`);
        const data = await response.json();
        
        if (data.success && data.data) {
          const prompt = data.data as AiPrompt;
          setLoadedPrompt(prompt);
          setUserPrompt(prompt.userPrompt);
          setSelectedAgentId(prompt.aiAgent);
          setFirstPromptId(prompt.id);
          setLastPromptId(prompt.id);
          setPreviousUserPrompt(prompt.userPrompt);
          setPreviousAiResponse(prompt.agentResponse);
          
          // Load modified prompts (prompts with referenceId === prompt.id)
          const allPromptsResponse = await fetch('/api/ai-prompts');
          const allPromptsData = await allPromptsResponse.json();
          if (allPromptsData.success && allPromptsData.data) {
            const modified = (allPromptsData.data as AiPrompt[]).filter(
              p => p.referenceId === prompt.id
            );
            setModifiedPrompts(modified);
          }
        }
      } catch (err) {
        console.error('Error loading prompt:', err);
      } finally {
        setLoadingPrompt(false);
      }
    };
    
    loadPrompt();
  }, [promptId, setUserPrompt]);

  // Load agents for ModifiedPromptsList
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await fetch('/api/ai-agents');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setAgents(data.data);
          }
        }
      } catch (err) {
        console.error('Failed to load agents:', err);
      }
    };
    loadAgents();
  }, []);

  // Load users for ModifiedPromptsList
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const apiUrl = `${config.dataApi.basePath}/users`;
        const response = await fetch(apiUrl, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setUsers(data.data);
          }
        }
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };
    loadUsers();
  }, []);

  // Create maps for ModifiedPromptsList
  const agentMap = useMemo(() => {
    const map = new Map<string, { id: string; label: string; icon?: string; model?: string }>();
    agents.forEach(agent => {
      map.set(agent.id, agent);
    });
    return map;
  }, [agents]);

  const userMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; lastname?: string; username?: string }>();
    users.forEach(user => {
      map.set(user.id, user);
      if (user.username) {
        map.set(user.username, user);
      }
    });
    return map;
  }, [users]);

  // Sync hook's lastPromptId with local state
  useEffect(() => {
    if (hookLastPromptId) {
      setLastPromptId(hookLastPromptId);
      if (!firstPromptId) {
        setFirstPromptId(hookLastPromptId);
      }
    }
  }, [hookLastPromptId, firstPromptId]);

  // Track previous prompt and response when a new response is successfully generated
  useEffect(() => {
    if (aiResponse && tokenUsage && !isLoading && hookLastPromptId) {
      if (!isApplyingAnnotations) {
        setAnnotations(new Map());
      }
      
      if (userPrompt) {
        setPreviousUserPrompt(userPrompt);
      }
      if (aiResponse) {
        setPreviousAiResponse(aiResponse);
      }
      
      setIsApplyingAnnotations(false);
    }
  }, [aiResponse, tokenUsage, isLoading, userPrompt, hookLastPromptId, isApplyingAnnotations]);

  // Get selected agent
  const selectedAgent = aiAgents.find(agent => agent.id === selectedAgentId) || null;

  // Set agent when loaded
  useEffect(() => {
    if (loadedPrompt && !selectedAgentId) {
      setSelectedAgentId(loadedPrompt.aiAgent);
    }
  }, [loadedPrompt, selectedAgentId]);

  const annotationsArray = Array.from(annotations.values());

  const getPromptForLLM = () => {
    if (!selectedAgent || !userPrompt.trim()) {
      return null;
    }

    // Combine system prompt with preloaded context
    // preloadedContext already includes proper formatting with newlines
    const systemPrompt = (selectedAgent.systemPrompt || '') + (preloadedContext || '');

    // Format user prompt - if annotations are present, include modification request
    // This matches what the API route does
    // When annotations are applied, use the prompt that would be sent (previousUserPrompt if available, otherwise userPrompt)
    const basePrompt = (annotationsArray.length > 0 && previousUserPrompt) ? previousUserPrompt : userPrompt;
    let finalUserPrompt = basePrompt.trim();
    
    if (annotationsArray.length > 0 && previousAiResponse) {
      // Format annotations in TOON-like structure (matching API route logic)
      const annotationSections = annotationsArray.map(ann => {
        const changes = ann.annotations.map(a => `- ${a.label}`).join('\n');
        return `${ann.schemaLabel}\n\n${changes}`;
      }).join('\n\n');
      
      // Build the modification request in user prompt (matching API route)
      const modificationRequest = `\n\n---\n\n## MODIFY EXISTING SCHEMA(S)\n\nPlease update the following schema(s) based on the requested modifications. Apply ONLY the specified changes while keeping everything else exactly the same.\n\nRequested Modifications:\n\n${annotationSections}\n\nPrevious Schema(s):\n\`\`\`json\n${previousAiResponse}\n\`\`\`\n\n---\n\nIMPORTANT: You are the world's best schema editor. Apply these modifications precisely while preserving all other aspects of the schema(s). Output the complete updated schema(s) in the same format (single object or array).`;
      
      finalUserPrompt = basePrompt.trim() + modificationRequest;
    }

    return {
      systemPrompt,
      userPrompt: finalUserPrompt,
    };
  };

  const handleGenerate = () => {
    if (!selectedAgentId) return;
    if (!isApplyingAnnotations) {
      setAnnotations(new Map());
      setFirstPromptId(null);
    }
    setIsApplyingAnnotations(false);
    generateResponse({
      userPrompt,
      agentId: selectedAgentId,
    });
  };

  const handleReset = useCallback(() => {
    setShowResetConfirm(true);
  }, []);

  const handleResetConfirm = useCallback(() => {
    // Clear everything
    setUserPrompt('');
    setSelectedAgentId('');
    setAnnotations(new Map());
    setPreviousUserPrompt('');
    setPreviousAiResponse('');
    setLastPromptId(null);
    setFirstPromptId(null);
    setPreviewSchema(null);
    setIsApplyingAnnotations(false);
    clearResponse();
    setShowResetConfirm(false);
    // Navigate back to main AI builder page
    router.push('/ai-builder');
  }, [setUserPrompt, clearResponse, router]);

  const handleApplyAnnotations = useCallback(async (annotationsList: SchemaAnnotation[]) => {
    if (!selectedAgentId) {
      console.error('No agent selected');
      alert('No AI agent selected. Please select an agent first.');
      return;
    }

    const responseToUse = previousAiResponse || aiResponse;
    const promptToUse = previousUserPrompt || userPrompt;

    if (!responseToUse) {
      console.error('Missing AI response');
      alert('No AI response available. Please generate a response first.');
      return;
    }

    if (!promptToUse) {
      console.error('Missing user prompt');
      alert('No user prompt available. Please enter a prompt first.');
      return;
    }

    const annotationsForSave = annotationsList.map(ann => ({
      schemaId: ann.schemaId,
      schemaName: ann.schemaLabel,
      annotations: ann.annotations,
    }));

    setIsApplyingAnnotations(true);

    try {
      await generateResponse({
        userPrompt: promptToUse,
        agentId: selectedAgentId,
        referenceId: firstPromptId || undefined,
        annotations: annotationsForSave,
        previousAiResponse: responseToUse,
        previousUserPrompt: promptToUse,
      });
    } catch (error) {
      console.error('Error generating response with annotations:', error);
      setIsApplyingAnnotations(false);
      alert('Failed to generate response. Please try again.');
    }
  }, [selectedAgentId, previousUserPrompt, previousAiResponse, firstPromptId, generateResponse, aiResponse, userPrompt]);

  const handleApprove = (editedContent?: string) => {
    if (!selectedAgent || !aiResponse) return;
    // Use edited content if provided, otherwise use original response
    const contentToApprove = editedContent || aiResponse;
    approveResponse(contentToApprove, selectedAgent);
  };

  const handleCardClick = useCallback((cardData: { id: string; label: string; icon?: string }, schemaData: any) => {
    const schema: FormSchema = {
      id: schemaData.id || cardData.id,
      name: schemaData.singular_name || cardData.label,
      singular_name: schemaData.singular_name || cardData.label,
      plural_name: schemaData.plural_name || `${cardData.label}s`,
      fields: schemaData.fields || [],
      sections: schemaData.sections || [],
    };

    setPreviewSchema({ schema, schemaId: schema.id });
    setIsSheetOpen(true);

    // Initialize annotations for this schema if not exists
    if (!annotations.has(schema.id)) {
      const newAnnotation: SchemaAnnotation = {
        schemaId: schema.id,
        schemaLabel: schema.name || schema.singular_name || cardData.label,
        schemaIcon: schemaData.icon || cardData.icon || undefined,
        annotations: [],
      };
      setAnnotations(prev => new Map(prev).set(schema.id, newAnnotation));
    }
  }, [annotations]);

  const handleAnnotationChange = useCallback((schemaId: string, items: AnnotationItem[]) => {
    setAnnotations(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(schemaId);
      if (existing) {
        newMap.set(schemaId, { ...existing, annotations: items });
      }
      return newMap;
    });
  }, []);

  const handleRemoveSchema = useCallback((schemaId: string) => {
    setAnnotations(prev => {
      const newMap = new Map(prev);
      newMap.delete(schemaId);
      return newMap;
    });
  }, []);

  const handleFormModalClose = () => {
    setIsSheetOpen(false);
    setPreviewSchema(null);
  };

  if (loadingPrompt || isLoadingAgents) {
    return (
      <MainLayout
        title="AI Builder"
        subtitle="Loading prompt..."
        icon="Sparkles"
      >
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Back Button Skeleton */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-32 rounded-md bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Form Skeleton */}
          <div className="space-y-4 p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            {/* Agent Selector */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-md bg-gray-200 dark:bg-gray-700" />
              <Skeleton className="h-10 w-full rounded-md bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Prompt Textarea */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded-md bg-gray-200 dark:bg-gray-700" />
              <Skeleton className="h-32 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-32 rounded-md bg-gray-200 dark:bg-gray-700" />
              <Skeleton className="h-10 w-28 rounded-md bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>

          {/* Response Area Skeleton */}
          <div className="space-y-4 p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="space-y-3">
              <Skeleton className="h-6 w-48 rounded-md bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded-md bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-4 w-5/6 rounded-md bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-4 w-4/6 rounded-md bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          </div>

          {/* Modified Prompts Skeleton */}
          <div className="space-y-4 p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <Skeleton className="h-5 w-40 rounded-md bg-gray-200 dark:bg-gray-700" />
            <div className="ms-6 ps-4 border-l-2 border-violet-200 dark:border-violet-800 space-y-3">
              <Skeleton className="h-12 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
              <Skeleton className="h-12 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!loadedPrompt) {
    return (
      <MainLayout
        title="AI Builder"
        subtitle="Prompt not found"
        icon="Sparkles"
      >
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">Prompt not found</p>
            <Button onClick={() => router.push('/ai-builder')} variant="outline">
              <ArrowLeft className="h-4 w-4 me-2" />
              Back to AI Builder
            </Button>
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
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <Button onClick={() => router.push('/ai-builder')} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 me-2" />
            Back to AI Builder
          </Button>
        </div>

        <AiBuilderForm
          userPrompt={userPrompt}
          onPromptChange={setUserPrompt}
          agents={aiAgents}
          selectedAgentId={selectedAgentId}
          onAgentChange={setSelectedAgentId}
          onGenerate={handleGenerate}
          onStop={stopGeneration}
          isLoading={isLoading}
          isLoadingPreload={isLoadingPreload}
          systemPrompt={promptForLLM?.systemPrompt}
          onReset={handleReset}
        />

        <MessageDisplay
          error={error}
          successMessage={successMessage}
        />

        {aiResponse && selectedAgent && (
          <AiBuilderResponse
            response={aiResponse}
            agent={selectedAgent}
            tokenUsage={tokenUsage}
            duration={duration}
            isApproving={isApproving}
            isLoading={isLoading}
            onApprove={handleApprove}
            onCardClick={handleCardClick}
            annotations={annotationsArray}
            onAnnotationsChange={handleAnnotationChange}
            onRemoveSchema={handleRemoveSchema}
            onApplyAnnotations={handleApplyAnnotations}
          />
        )}

        {/* Modified Prompts List */}
        {loadedPrompt && modifiedPrompts.length > 0 && (
          <div className="mt-6">
            <ModifiedPromptsList
              parentPromptId={loadedPrompt.id}
              modifiedPrompts={modifiedPrompts}
              agentMap={agentMap}
              userMap={userMap}
            />
          </div>
        )}

        {previewSchema && (
          <Modal
            isOpen={isSheetOpen}
            onClose={handleFormModalClose}
            title={`Preview: ${previewSchema.schema.name}`}
            description="Preview the generated schema form"
            size="xl"
          >
            <div className="space-y-6">
              {/* Form */}
              <SchemaFormWrapper
                schema={previewSchema.schema}
                onSubmit={async () => {
                  console.log('Preview mode - form submission disabled');
                }}
                onReset={() => {}}
                onCancel={handleFormModalClose}
                initialValues={{}}
                hideActions={true}
                disabled={false}
                hideCollapseExpandButtons={true}
                forceExpandedSections={true}
                hideGoToTopButton={true}
              />

              {/* Annotations Section */}
              {annotations.has(previewSchema.schemaId) && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                    Add Annotations
                  </h3>
                  <ListInput
                    value={annotations.get(previewSchema.schemaId)?.annotations || []}
                    onChange={(items) => handleAnnotationChange(previewSchema.schemaId, items)}
                    placeholder="Enter annotation..."
                    addButtonText="Add Annotation"
                    enableReordering={true}
                  />
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Reset Confirmation Dialog */}
        <ConfirmationMessage
          isOpen={showResetConfirm}
          onOpenChange={setShowResetConfirm}
          title="Reset Everything"
          message="Are you sure you want to reset everything? This will clear your prompt, selected agent, AI response, annotations, and all related data. This action cannot be undone."
          variant="warning"
          buttons={[
            {
              label: 'Cancel',
              variant: 'outline',
              action: () => setShowResetConfirm(false),
            },
            {
              label: 'Reset',
              variant: 'destructive',
              icon: 'RotateCcw',
              action: handleResetConfirm,
            },
          ]}
        />
      </div>
    </MainLayout>
  );
}

