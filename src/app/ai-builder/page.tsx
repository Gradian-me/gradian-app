'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/main-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { VoicePoweredOrb } from '@/components/ui/voice-powered-orb';
import { TextSwitcher } from '@/components/ui/text-switcher';
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
import { useUserStore } from '@/stores/user.store';
import { ConfirmationMessage } from '@/gradian-ui/form-builder/form-elements/components/ConfirmationMessage';

export default function AiBuilderPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [previewSchema, setPreviewSchema] = useState<{ schema: FormSchema; schemaId: string } | null>(null);
  const [annotations, setAnnotations] = useState<Map<string, SchemaAnnotation>>(new Map());
  const [lastPromptId, setLastPromptId] = useState<string | null>(null);
  const [firstPromptId, setFirstPromptId] = useState<string | null>(null); // Track the first/original prompt ID
  const [previousUserPrompt, setPreviousUserPrompt] = useState<string>('');
  const [previousAiResponse, setPreviousAiResponse] = useState<string>('');
  const [isApplyingAnnotations, setIsApplyingAnnotations] = useState(false); // Track if current generation is from Apply
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const user = useUserStore((state) => state.user);
  const { createPrompt } = useAiPrompts();

  const { agents, loading: isLoadingAgents } = useAiAgents();
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
  
  // Sync hook's lastPromptId with local state
  useEffect(() => {
    if (hookLastPromptId) {
      setLastPromptId(hookLastPromptId);
      // Set first prompt ID only if it's not already set (first generation)
      if (!firstPromptId) {
        setFirstPromptId(hookLastPromptId);
      }
    }
  }, [hookLastPromptId, firstPromptId]);

  // Track previous prompt and response when a new response is successfully generated
  // This happens after the response is complete and saved
  // Also clear annotations for fresh generations (not from Apply)
  useEffect(() => {
    if (aiResponse && tokenUsage && !isLoading && hookLastPromptId) {
      // If this is NOT from Apply, clear annotations (fresh generation)
      if (!isApplyingAnnotations) {
        // This is a fresh generation - clear previous annotations
        setAnnotations(new Map());
      }
      
      // Always update previous values for future Apply operations
      if (userPrompt) {
        setPreviousUserPrompt(userPrompt);
      }
      if (aiResponse) {
        setPreviousAiResponse(aiResponse);
      }
      
      // Reset the flag after processing
      setIsApplyingAnnotations(false);
    }
  }, [aiResponse, tokenUsage, isLoading, userPrompt, hookLastPromptId, isApplyingAnnotations]);

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
    // Clear annotations when agent changes
    setAnnotations(new Map());
    setFirstPromptId(null);
    setLastPromptId(null);
    setPreviousUserPrompt('');
    setPreviousAiResponse('');
  }, [selectedAgentId, clearResponse]);

  // Load preload routes when agent or sheet opens
  useEffect(() => {
    if (isSheetOpen && selectedAgent) {
      loadPreloadRoutes(selectedAgent);
    }
  }, [isSheetOpen, selectedAgent?.id, loadPreloadRoutes]);

  // Convert annotations map to array for ResponseAnnotationViewer
  const annotationsArray = Array.from(annotations.values());

  // Get the prompt that would be sent to LLM
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
  }, [setUserPrompt, clearResponse]);

  const handleApplyAnnotations = useCallback(async (annotationsList: SchemaAnnotation[]) => {
    if (!selectedAgentId) {
      console.error('No agent selected');
      return;
    }
    
    // Use current aiResponse if previousAiResponse is not set
    // This ensures we always have values to work with
    const responseToUse = previousAiResponse || aiResponse;
    const promptToUse = previousUserPrompt || userPrompt;
    
    if (!responseToUse) {
      console.error('Missing AI response', { 
        hasPreviousResponse: !!previousAiResponse, 
        hasCurrentResponse: !!aiResponse
      });
      alert('No AI response available. Please generate a response first.');
      return;
    }
    
    if (!promptToUse) {
      console.error('Missing user prompt', {
        hasPreviousPrompt: !!previousUserPrompt,
        hasCurrentPrompt: !!userPrompt 
      });
      alert('No user prompt available. Please enter a prompt first.');
      return;
    }

    // Convert SchemaAnnotation to the format expected by GeneratePromptRequest
    const annotationsForSave = annotationsList.map(ann => ({
      schemaId: ann.schemaId,
      schemaName: ann.schemaLabel,
      annotations: ann.annotations,
    }));

    console.log('Applying annotations and regenerating...', {
      referenceId: firstPromptId,
      annotationsCount: annotationsForSave.length,
      hasReferenceId: !!firstPromptId
    });

    // Keep user prompt clean - don't update it with annotation instructions
    // The annotation instructions will be added to system prompt in the API
    
    // Set flag to indicate this generation is from Apply
    setIsApplyingAnnotations(true);
    
    try {
      await generateResponse({
        userPrompt: promptToUse, // Keep original prompt clean
        agentId: selectedAgentId,
        referenceId: firstPromptId || undefined, // Always reference the first/original prompt
        annotations: annotationsForSave,
        previousAiResponse: responseToUse, // Pass previous response for system prompt
        previousUserPrompt: promptToUse, // Pass previous prompt for system prompt
      });
      console.log('Generation started with annotations');
    } catch (error) {
      console.error('Error generating response with annotations:', error);
      setIsApplyingAnnotations(false); // Reset flag on error
      alert('Failed to generate response. Please try again.');
    }
  }, [selectedAgentId, previousUserPrompt, previousAiResponse, firstPromptId, setUserPrompt, generateResponse, aiResponse, userPrompt]);

  const handleApprove = () => {
    if (!selectedAgent || !aiResponse) return;
    approveResponse(aiResponse, selectedAgent);
  };

  const handleCardClick = useCallback((cardData: { id: string; label: string; icon?: string }, schemaData: any) => {
    // Convert schema data to FormSchema format
    const formSchema: FormSchema = schemaData;
    const previewSchemaId = `preview-${cardData.id}`;
    
    setPreviewSchema({
      schema: formSchema,
      schemaId: previewSchemaId,
    });

    // Initialize annotations for this schema if not exists
    if (!annotations.has(cardData.id)) {
      setAnnotations((prev) => {
        const newMap = new Map(prev);
        newMap.set(cardData.id, {
          schemaId: cardData.id,
          schemaLabel: cardData.label,
          schemaIcon: cardData.icon,
          annotations: [],
        });
        return newMap;
      });
    }
  }, [annotations]);

  const handleAnnotationChange = useCallback((schemaId: string, newAnnotations: AnnotationItem[]) => {
    setAnnotations((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(schemaId);
      if (existing) {
        newMap.set(schemaId, {
          ...existing,
          annotations: newAnnotations,
        });
      }
      return newMap;
    });
  }, []);

  const handleRemoveSchema = useCallback((schemaId: string) => {
    setAnnotations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(schemaId);
      return newMap;
    });
  }, []);

  const getInitialSchema = useCallback((schemaId: string): FormSchema | null => {
    if (previewSchema && previewSchema.schemaId === schemaId) {
      return previewSchema.schema;
    }
    return null;
  }, [previewSchema]);

  const handleFormModalClose = useCallback(() => {
    setPreviewSchema(null);
  }, []);

  // Get current schema annotation for the preview modal
  const currentSchemaAnnotation = previewSchema 
    ? annotations.get(previewSchema.schema.id) 
    : null;

  const handleModalAnnotationChange = useCallback((items: AnnotationItem[]) => {
    if (previewSchema) {
      const schemaId = previewSchema.schema.id;
      handleAnnotationChange(schemaId, items);
    }
  }, [previewSchema, handleAnnotationChange]);

  // Skeleton component for loading state
  if (isLoadingAgents) {
    return (
      <MainLayout
        title="AI Builder"
        subtitle="Transform your ideas into reality with the power of AI"
        icon="Sparkles"
      >
        <div className="space-y-6 max-w-5xl mx-auto">
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
              <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-violet-50/50 via-transparent to-purple-50/50 dark:from-violet-950/20 dark:via-transparent dark:to-purple-950/20" />
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
                  <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent dark:via-white/10 animate-shimmer" />
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
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-linear-to-br from-gray-50 to-gray-100/50 dark:from-gray-900/50 dark:to-gray-800/30 overflow-hidden">
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
      <div className="space-y-6 max-w-5xl mx-auto">
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
          onReset={handleReset}
        />

        <MessageDisplay error={error} successMessage={successMessage} />

        <AnimatePresence mode="wait">
          {aiResponse && selectedAgent ? (
            <motion.div
              key="ai-response"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
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
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Preview Form Modal with Annotations */}
        {previewSchema && (
          <Modal
            isOpen={!!previewSchema}
            onClose={handleFormModalClose}
            title={`Preview: ${previewSchema.schema.singular_name || previewSchema.schema.name}`}
            description="Review the generated schema and add annotations"
            size="xl"
            showCloseButton={true}
          >
            <div className="space-y-6">
              {/* Form */}
              <SchemaFormWrapper
                schema={previewSchema.schema}
                onSubmit={async () => {
                  // Preview mode - don't submit
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
              
              {/* Annotation Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Add Annotations
                </h4>
                <ListInput
                  value={currentSchemaAnnotation?.annotations || []}
                  onChange={handleModalAnnotationChange}
                  placeholder="Enter annotation..."
                  addButtonText="Add Annotation"
                  disabled={isLoading}
                />
              </div>
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

      {/* Loading Indicator - Voice Powered Orb (outside container, at bottom) */}
      {/* Show only while loading and no response yet */}
      <AnimatePresence>
        {isLoading && !aiResponse && (
          <motion.div
            key="loading-orb"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full h-96 relative rounded-xl overflow-hidden mt-6"
          >
            <VoicePoweredOrb
              enableVoiceControl={false}
              className="rounded-xl overflow-hidden"
            />
            {selectedAgent?.loadingTextSwitches && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none px-4">
                <div className="max-w-[85%]">
                  <TextSwitcher
                    texts={selectedAgent.loadingTextSwitches}
                    className="text-gray-900 dark:text-white font-medium text-sm md:text-base px-4 py-2"
                    switchInterval={3000}
                    transitionDuration={0.5}
                    shimmerDuration={1}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}
