/**
 * AI Builder Wrapper Component
 * Reusable wrapper for AI builder functionality that can be used in pages or dialogs
 */

'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  AiBuilderForm,
  AiBuilderResponse,
  MessageDisplay,
  useAiAgents,
  useAiBuilder,
} from '@/domains/ai-builder';
import type { AiAgent, AnnotationItem, SchemaAnnotation } from '@/domains/ai-builder/types';
import { Modal } from '@/gradian-ui/data-display/components/Modal';
import { SchemaFormWrapper } from '@/gradian-ui/form-builder/components/FormLifecycleManager';
import { ListInput } from '@/gradian-ui/form-builder/form-elements';
import { ConfirmationMessage } from '@/gradian-ui/form-builder/form-elements/components/ConfirmationMessage';
import type { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { DEMO_MODE } from '@/gradian-ui/shared/configs/env-config';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AiBuilderLoadingIndicator } from './AiBuilderLoadingIndicator';
import { extractParametersBySectionId } from '../utils/ai-shared-utils';

export interface AiBuilderWrapperProps {
  initialAgentId?: string;
  initialUserPrompt?: string;
  onClose?: () => void;
  mode?: 'page' | 'dialog';
  additionalSystemPrompt?: string;
  customPreloadRoutes?: Array<{
    route: string;
    title: string;
    description: string;
    method?: 'GET' | 'POST';
    jsonPath?: string;
    body?: any;
    queryParameters?: Record<string, string>;
    outputFormat?: 'json' | 'string' | 'toon';
    includedFields?: string[];
  }>;
  showResetButton?: boolean;
  className?: string;
  displayType?: 'default' | 'hideForm' | 'showFooter';
  runType?: 'manual' | 'automatic';
  agent?: AiAgent | null; // Optional: If provided, use this agent directly without fetching
  initialBody?: Record<string, any>; // Preset body parameters for AI agent (with context replacement applied)
  initialExtraBody?: Record<string, any>; // Preset extra_body parameters for AI agent (with context replacement applied)
  onOpenPreviewRequest?: (callback: () => void) => void; // Callback to register a function that opens the preview sheet
  hideAgentSelector?: boolean; // Hide agent dropdown selector
  hideSearchConfig?: boolean; // Hide search type and summarization controls
  hideImageConfig?: boolean; // Hide image type selector
  hideEditAgent?: boolean; // Hide Edit Agent button
  hidePromptHistory?: boolean; // Hide Prompt History button
  hideLanguageSelector?: boolean; // Hide language selector from form (use in footer instead)
  initialSelectedLanguage?: string; // Initial language value
  onLanguageChange?: (language: string) => void; // Callback when language changes
  hideNextActionButton?: boolean; // Hide the nextAction "Apply" button (e.g. form-filler uses footer Fill Form only)
}

export function AiBuilderWrapper({
  initialAgentId = '',
  initialUserPrompt = '',
  onClose,
  mode = 'page',
  additionalSystemPrompt = '',
  customPreloadRoutes,
  showResetButton = true,
  className = '',
  displayType = 'default',
  runType = 'manual',
  agent: providedAgent,
  initialBody,
  initialExtraBody,
  onOpenPreviewRequest,
  hideAgentSelector = false,
  hideSearchConfig = false,
  hideImageConfig = false,
  hideEditAgent = false,
  hidePromptHistory = false,
  hideLanguageSelector = false,
  initialSelectedLanguage,
  onLanguageChange,
  hideNextActionButton = false,
}: AiBuilderWrapperProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(initialAgentId);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [previewSchema, setPreviewSchema] = useState<{ schema: FormSchema; schemaId: string } | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(initialSelectedLanguage || 'fa'); // Default language for string output agents
  
  // Sync language with external changes
  useEffect(() => {
    if (initialSelectedLanguage !== undefined && initialSelectedLanguage !== selectedLanguage) {
      setSelectedLanguage(initialSelectedLanguage);
    }
  }, [initialSelectedLanguage]);
  
  // Notify parent when language changes
  const handleLanguageChange = useCallback((language: string) => {
    setSelectedLanguage(language);
    onLanguageChange?.(language);
  }, [onLanguageChange]);
  const [annotations, setAnnotations] = useState<Map<string, SchemaAnnotation>>(new Map());
  const [lastPromptId, setLastPromptId] = useState<string | null>(null);
  const [firstPromptId, setFirstPromptId] = useState<string | null>(null);
  const [previousUserPrompt, setPreviousUserPrompt] = useState<string>('');
  const [previousAiResponse, setPreviousAiResponse] = useState<string>('');
  const loadingIndicatorRef = useRef<HTMLDivElement>(null);
  const [isApplyingAnnotations, setIsApplyingAnnotations] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const hasAutoGeneratedRef = useRef(false);
  const [formValues, setFormValues] = useState<Record<string, any>>(() => {
    // Initialize formValues with preset body/extra_body values
    const initial: Record<string, any> = {};
    if (initialBody) {
      Object.assign(initial, initialBody);
    }
    if (initialExtraBody) {
      Object.assign(initial, initialExtraBody);
    }
    // Include language in formValues if selectedLanguage is set (for unified prompt building)
    if (initialSelectedLanguage && initialSelectedLanguage !== 'text') {
      initial['output-language'] = initialSelectedLanguage;
    }
    return initial;
  });
  const [currentImageType, setCurrentImageType] = useState<string | undefined>(undefined);
  
  // Ensure formValues includes output-language when selectedLanguage changes
  // This is critical for unified prompt building to append language instructions
  useEffect(() => {
    if (selectedLanguage && selectedLanguage !== 'text') {
      setFormValues((prev) => {
        // Only update if language actually changed
        if (prev['output-language'] === selectedLanguage) {
          return prev; // No change needed
        }
        return {
          ...prev,
          'output-language': selectedLanguage,
        };
      });
    } else {
      // Remove language if set to 'text' or empty
      setFormValues((prev) => {
        if (prev['output-language']) {
          const { 'output-language': _, ...rest } = prev;
          return rest;
        }
        return prev;
      });
    }
  }, [selectedLanguage]);

  // If agent is provided, use it directly without fetching. Otherwise, fetch agents
  // For dialog mode with initialAgentId, fetch only that specific agent
  const agentIdToFetch = !providedAgent && mode === 'dialog' && initialAgentId 
    ? initialAgentId 
    : undefined;
  
  const { agents: fetchedAgents, loading: isLoadingAgents } = useAiAgents(
    providedAgent 
      ? { enabled: false } 
      : (agentIdToFetch ? { agentId: agentIdToFetch } : undefined)
  );
  
  // Use provided agent if available, otherwise use fetched agents
  const agents = providedAgent ? [providedAgent] : fetchedAgents;
  const isLoadingAgentsState = providedAgent ? false : isLoadingAgents;
  const {
    userPrompt,
    setUserPrompt,
    aiResponse,
    tokenUsage,
    videoUsage,
    duration,
    isLoading,
    isMainLoading,
    isImageLoading,
    isSearchLoading,
    isApproving,
    error,
    successMessage,
    preloadedContext,
    isLoadingPreload,
    imageResponse,
    imageError,
    graphWarnings,
    searchResults,
    searchError,
    searchDuration,
    searchUsage,
    summarizedPrompt,
    isSummarizing,
    lastPromptId: hookLastPromptId,
    generateResponse,
    stopGeneration,
    approveResponse,
    loadPreloadRoutes,
    clearResponse,
  } = useAiBuilder(agents);

  // Initialize user prompt if provided (only on mount or when initialUserPrompt changes)
  const [hasInitializedPrompt, setHasInitializedPrompt] = useState(false);
  useEffect(() => {
    if (initialUserPrompt && !hasInitializedPrompt) {
      setUserPrompt(initialUserPrompt);
      setHasInitializedPrompt(true);
    }
  }, [initialUserPrompt, hasInitializedPrompt, setUserPrompt]);

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

  // Expose function to open preview sheet via callback
  // Use useCallback to ensure stable reference
  const openPreview = useCallback(() => {
    setIsSheetOpen(true);
  }, []);

  useEffect(() => {
    if (onOpenPreviewRequest && openPreview) {
      // Register the callback to open the preview sheet
      onOpenPreviewRequest(openPreview);
    }
  }, [onOpenPreviewRequest, openPreview]);

  // Get selected agent
  const selectedAgent = agents.find(agent => agent.id === selectedAgentId) || null;
  
  // Get image-generator agent for its model
  const imageGeneratorAgent = agents.find(agent => agent.id === 'image-generator') || null;
  const imageModel = imageGeneratorAgent?.model;

  // Set initial agent or first agent as default when agents load
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      if (initialAgentId && agents.find(a => a.id === initialAgentId)) {
        setSelectedAgentId(initialAgentId);
      } else {
        setSelectedAgentId(agents[0].id);
      }
    }
  }, [agents, selectedAgentId, initialAgentId]);

  // Clear response when agent changes
  useEffect(() => {
    clearResponse();
    setAnnotations(new Map());
    setFirstPromptId(null);
    setLastPromptId(null);
    setPreviousUserPrompt('');
    setPreviousAiResponse('');
    setCurrentImageType(undefined);
  }, [selectedAgentId, clearResponse]);

  // Dedupe: avoid loading the same preload routes twice (e.g. React Strict Mode or new array refs)
  const lastPreloadKeyRef = useRef<string | null>(null);
  const prevAgentIdRef = useRef<string | undefined>(undefined);

  // Load preload routes when agent or sheet opens, or when custom routes are provided
  useEffect(() => {
    if (!selectedAgent) return;

    // Reset dedupe key when agent changes so we do load for the new agent
    if (prevAgentIdRef.current !== selectedAgent.id) {
      prevAgentIdRef.current = selectedAgent.id;
      lastPreloadKeyRef.current = null;
    }

    // When customPreloadRoutes prop is passed (e.g. form-filler), use only those and never agent.preloadRoutes, so we never fetch unresolved URLs like /api/schemas/{{formSchema.id}}
    const routes =
      customPreloadRoutes !== undefined
        ? (customPreloadRoutes || [])
        : selectedAgent.preloadRoutes || [];

    if (routes.length === 0) {
      if (customPreloadRoutes === undefined && (isSheetOpen || mode === 'dialog')) {
        loadPreloadRoutes(selectedAgent);
      }
      return;
    }

    const routeKey = routes.map((r: { route?: string }) => r.route || '').sort().join('\0');
    const preloadKey = `${selectedAgent.id}\0${routeKey}`;
    if (lastPreloadKeyRef.current === preloadKey) return;
    lastPreloadKeyRef.current = preloadKey;

    const agentToLoad =
      routes === (selectedAgent.preloadRoutes || [])
        ? selectedAgent
        : { ...selectedAgent, preloadRoutes: routes };
    loadPreloadRoutes(agentToLoad);
  }, [isSheetOpen, selectedAgent, loadPreloadRoutes, customPreloadRoutes, mode]);

  // Convert annotations map to array for ResponseAnnotationViewer
  const annotationsArray = Array.from(annotations.values());

  // Get the prompt that would be sent to LLM
  const getPromptForLLM = () => {
    if (!selectedAgent || !userPrompt.trim()) {
      return null;
    }

    // Combine system prompt with preloaded context and additional system prompt
    let systemPrompt = selectedAgent.systemPrompt || '';
    if (additionalSystemPrompt) {
      systemPrompt += (systemPrompt ? '\n\n' : '') + additionalSystemPrompt;
    }
    systemPrompt += (preloadedContext || '');

    // Format user prompt - if annotations are present, include modification request
    const basePrompt = (annotationsArray.length > 0 && previousUserPrompt) ? previousUserPrompt : userPrompt;
    let finalUserPrompt = basePrompt.trim();
    
    if (annotationsArray.length > 0 && previousAiResponse) {
      const annotationSections = annotationsArray.map(ann => {
        const changes = ann.annotations.map(a => `- ${a.label}`).join('\n');
        return `${ann.schemaLabel}\n\n${changes}`;
      }).join('\n\n');
      
      const modificationRequest = `\n\n---\n\n## MODIFY EXISTING SCHEMA(S)\n\nPlease update the following schema(s) based on the requested modifications. Apply ONLY the specified changes while keeping everything else exactly the same.\n\nRequested Modifications:\n\n${annotationSections}\n\nPrevious Schema(s):\n\`\`\`json\n${previousAiResponse}\n\`\`\`\n\n---\n\nIMPORTANT: You are the world's best schema editor. Apply these modifications precisely while preserving all other aspects of the schema(s). Output the complete updated schema(s) in the same format (single object or array).`;
      
      finalUserPrompt = basePrompt.trim() + modificationRequest;
    }

    return {
      systemPrompt,
      userPrompt: finalUserPrompt,
    };
  };

  // Scroll to loading indicator smoothly
  const scrollToLoadingIndicator = useCallback(() => {
    if (loadingIndicatorRef.current) {
      loadingIndicatorRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, []);

  const handleGenerate = useCallback(() => {
    if (!selectedAgentId) return;
    
    // Start with preset body/extra_body values (highest priority)
    // Initialize as empty objects to ensure we can always add properties
    let body: Record<string, any> = initialBody ? { ...initialBody } : {};
    let extra_body: Record<string, any> = initialExtraBody ? { ...initialExtraBody } : {};
    
    // Calculate body and extra_body from formValues and merge with preset values
    // Preset values take precedence, but formValues can add additional parameters
    if (selectedAgent && Object.keys(formValues).length > 0) {
      const params = extractParametersBySectionId(selectedAgent, formValues);
      const formBody = Object.keys(params.body).length > 0 ? params.body : {};
      const formExtraBody = Object.keys(params.extra).length > 0 ? params.extra : {};
      
      // Merge form values with preset values (preset takes precedence)
      body = {
        ...formBody,
        ...body, // Preset values override form values
      };
      extra_body = {
        ...formExtraBody,
        ...extra_body, // Preset values override form values
      };
    }
    
    // Ensure imageType is always included in body if it exists in formValues or preset body and is not "none"
    // This handles cases where imageType might not be in the agent's renderComponents
    const imageType = formValues.imageType || (initialBody?.imageType as string | undefined);
    if (imageType && imageType !== 'none') {
      body.imageType = imageType;
      // Store the imageType for display in the response
      setCurrentImageType(imageType);
    } else {
      setCurrentImageType(undefined);
    }
    
    // Ensure search configuration is always included in body if it exists in formValues
    // These fields don't have sectionId, so they need to be manually added
    if (formValues.searchType !== undefined) {
      body.searchType = formValues.searchType;
      // Always include max_results with default value when search is enabled
      if (formValues.searchType && formValues.searchType !== 'no-search') {
        body.max_results = formValues.max_results ?? 5;
      }
    }
    
    // Ensure language from footer selector is included in body for professional-writing agent
    // The footer uses 'output-language' but the agent expects 'language' in body
    if (selectedAgentId === 'professional-writing' && selectedLanguage && selectedLanguage !== 'text') {
      body.language = selectedLanguage;
    }
    
    // Extract summarization flag from formValues (default: true)
    const summarizeBeforeSearchImage = formValues.summarizeBeforeSearchImage !== undefined 
      ? formValues.summarizeBeforeSearchImage 
      : true;
    
    generateResponse({
      userPrompt,
      agentId: selectedAgentId,
      body,
      extra_body,
      formValues, // Pass formValues so the API can build the full prompt with metadata
      imageType: imageType && imageType !== 'none' ? imageType : undefined,
      summarizeBeforeSearchImage,
    });

    // Scroll to loading indicator after a short delay to ensure it's rendered
    setTimeout(() => {
      scrollToLoadingIndicator();
    }, 100);
  }, [selectedAgentId, userPrompt, generateResponse, selectedAgent, formValues, initialBody, initialExtraBody, scrollToLoadingIndicator, selectedLanguage]);

  // Reset auto-generated flag when agent or prompt changes
  useEffect(() => {
    hasAutoGeneratedRef.current = false;
  }, [selectedAgentId, initialUserPrompt]);

  // Auto-generate when runType is automatic and conditions are met (only once)
  useEffect(() => {
    if (
      runType === 'automatic' && 
      !hasAutoGeneratedRef.current &&
      selectedAgentId && 
      userPrompt.trim() && 
      !isLoading && 
      !aiResponse && 
      !isLoadingPreload
    ) {
      // Wait a bit for preload routes to finish loading
      const timer = setTimeout(() => {
        hasAutoGeneratedRef.current = true;
        handleGenerate();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [runType, selectedAgentId, userPrompt, isLoading, aiResponse, isLoadingPreload, handleGenerate]);

  const handleReset = useCallback(() => {
    setShowResetConfirm(true);
  }, []);

  // Clear imageType on reset
  useEffect(() => {
    if (!isLoading && !aiResponse) {
      // If there's no active response and not loading, clear imageType
      // This happens after reset or when starting fresh
      if (formValues.imageType === undefined || formValues.imageType === 'none') {
        setCurrentImageType(undefined);
      }
    }
  }, [isLoading, aiResponse, formValues.imageType]);

  const handleResetConfirm = useCallback(() => {
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
      loggingCustom(LogType.CLIENT_LOG, 'error', 'No agent selected');
      return;
    }
    
    const responseToUse = previousAiResponse || aiResponse;
    const promptToUse = previousUserPrompt || userPrompt;
    
    if (!responseToUse) {
      alert('No AI response available. Please generate a response first.');
      return;
    }
    
    if (!promptToUse) {
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
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error generating response with annotations: ${error instanceof Error ? error.message : String(error)}`);
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
    const formSchema: FormSchema = schemaData;
    const previewSchemaId = `preview-${cardData.id}`;
    
    setPreviewSchema({
      schema: formSchema,
      schemaId: previewSchemaId,
    });

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

  const handleFormModalClose = useCallback(() => {
    setPreviewSchema(null);
  }, []);

  const currentSchemaAnnotation = previewSchema 
    ? annotations.get(previewSchema.schema.id) 
    : null;

  const handleModalAnnotationChange = useCallback((items: AnnotationItem[]) => {
    if (previewSchema) {
      const schemaId = previewSchema.schema.id;
      handleAnnotationChange(schemaId, items);
    }
  }, [previewSchema, handleAnnotationChange]);

  const promptForLLM = getPromptForLLM();

  // Skeleton component for loading state
  if (isLoadingAgentsState) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="space-y-2 flex flex-col items-center">
          <div className="flex flex-row justify-between items-center flex-wrap gap-2 w-full max-w-3xl">
            <Skeleton className="h-5 w-48 rounded-md bg-gray-300 dark:bg-gray-700" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-48 rounded-lg bg-gray-300 dark:bg-gray-700" />
              <Skeleton className="h-9 w-32 rounded-md bg-gray-300 dark:bg-gray-700" />
            </div>
          </div>
          
          <div className="relative w-full max-w-3xl">
            <Skeleton className="h-32 w-full rounded-2xl bg-gray-300 dark:bg-gray-700" />
            <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-violet-50/50 via-transparent to-purple-50/50 dark:from-violet-950/20 dark:via-transparent dark:to-purple-950/20" />
          </div>
          
          <div className="flex justify-between items-center w-full max-w-3xl">
            <Skeleton className="h-6 w-28 rounded-full bg-violet-200 dark:bg-violet-900/60" />
            
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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-40 rounded-md bg-gray-300 dark:bg-gray-700" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-64 rounded-md bg-gray-300 dark:bg-gray-700 opacity-80" />
              <Skeleton className="h-10 w-28 rounded-md bg-gray-300 dark:bg-gray-700" />
            </div>
          </div>
          
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-linear-to-br from-gray-50 to-gray-100/50 dark:from-gray-900/50 dark:to-gray-800/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/50">
              <Skeleton className="h-4 w-48 rounded-md bg-gray-300 dark:bg-gray-700" />
            </div>
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-full rounded-md bg-gray-300 dark:bg-gray-700" />
              <Skeleton className="h-4 w-5/6 rounded-md bg-gray-300 dark:bg-gray-700 opacity-80" />
              <Skeleton className="h-4 w-4/6 rounded-md bg-gray-300 dark:bg-gray-700 opacity-60" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {(displayType !== 'hideForm' || (displayType === 'hideForm' && runType === 'manual')) && (
        <AiBuilderForm
          userPrompt={userPrompt}
          onPromptChange={setUserPrompt}
          agents={agents}
          selectedAgentId={selectedAgentId}
          onAgentChange={setSelectedAgentId}
          isLoading={isLoading || isSummarizing}
          onGenerate={handleGenerate}
          onStop={stopGeneration}
          systemPrompt={promptForLLM?.systemPrompt || ''}
          isLoadingPreload={isLoadingPreload}
          isSheetOpen={isSheetOpen}
          onSheetOpenChange={setIsSheetOpen}
          onReset={showResetButton ? handleReset : undefined}
          displayType={displayType}
          runType={runType}
          selectedLanguage={selectedLanguage}
          onLanguageChange={handleLanguageChange}
          hidePreviewButton={mode === 'dialog'}
          onFormValuesChange={setFormValues}
          hideAgentSelector={hideAgentSelector}
          hideSearchConfig={hideSearchConfig}
          hideImageConfig={hideImageConfig}
          hideEditAgent={hideEditAgent}
          hidePromptHistory={hidePromptHistory}
          hideLanguageSelector={hideLanguageSelector}
          summarizedPrompt={summarizedPrompt || undefined}
          isSummarizing={isSummarizing}
        />
      )}

      <MessageDisplay error={error} successMessage={successMessage} />
      {imageError && (
        <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-4">
          <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">Image Generation Warning</p>
          <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">{imageError}</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {(aiResponse || isMainLoading || imageResponse || isImageLoading || searchResults || searchError || isSearchLoading || (error && selectedAgent && (selectedAgent.id === 'graph-generator' || selectedAgent.requiredOutputFormat === 'graph'))) && selectedAgent ? (
          <motion.div
            key="ai-response"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <AiBuilderResponse
              response={aiResponse || ''}
              agent={selectedAgent}
              tokenUsage={tokenUsage}
              videoUsage={videoUsage}
              duration={duration}
              isApproving={isApproving}
              isLoading={isMainLoading}
              isImageLoading={isImageLoading}
              isSearchLoading={isSearchLoading}
              onApprove={handleApprove}
              onCardClick={handleCardClick}
              annotations={annotationsArray}
              onAnnotationsChange={handleAnnotationChange}
              onRemoveSchema={handleRemoveSchema}
              onApplyAnnotations={handleApplyAnnotations}
              selectedLanguage={selectedLanguage}
              imageResponse={imageResponse}
              imageError={imageError}
              imageType={currentImageType}
              imageModel={imageModel}
              graphWarnings={graphWarnings}
              searchResults={searchResults}
              searchError={searchError}
              searchDuration={searchDuration}
              searchUsage={searchUsage}
              summarizedPrompt={summarizedPrompt}
              hideNextActionButton={hideNextActionButton}
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
            <SchemaFormWrapper
              schema={previewSchema.schema}
              onSubmit={async () => {
                loggingCustom(LogType.CLIENT_LOG, 'log', 'Preview mode - form submission disabled');
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
      {showResetButton && (
        <ConfirmationMessage
          isOpen={showResetConfirm}
          onOpenChange={setShowResetConfirm}
          title={[{ en: 'Reset Everything' }, { fa: 'بازنشانی همه' }, { ar: 'إعادة تعيين الكل' }, { es: 'Restablecer todo' }, { fr: 'Tout réinitialiser' }, { de: 'Alles zurücksetzen' }, { it: 'Reimposta tutto' }, { ru: 'Сбросить всё' }]}
          message={[{ en: 'Are you sure you want to reset everything? This will clear your prompt, selected agent, AI response, annotations, and all related data. This action cannot be undone.' }, { fa: 'آیا مطمئن هستید که می‌خواهید همه را بازنشانی کنید؟ پرامپت، عامل انتخاب‌شده، پاسخ هوش مصنوعی، حاشیه‌نویسی‌ها و تمام داده‌های مرتبط پاک خواهند شد. این عمل قابل بازگشت نیست.' }, { ar: 'هل أنت متأكد أنك تريد إعادة تعيين كل شيء؟ سيؤدي ذلك إلى مسح المطالبة والوكيل المحدد واستجابة الذكاء الاصطناعي والتعليقات التوضيحية وجميع البيانات ذات الصلة. لا يمكن التراجع عن هذا الإجراء.' }, { es: '¿Está seguro de que desea restablecer todo? Se borrarán su solicitud, el agente seleccionado, la respuesta de IA, las anotaciones y todos los datos relacionados. Esta acción no se puede deshacer.' }, { fr: 'Voulez-vous vraiment tout réinitialiser ? Votre invite, l\'agent sélectionné, la réponse IA, les annotations et toutes les données associées seront effacés. Cette action est irréversible.' }, { de: 'Möchten Sie wirklich alles zurücksetzen? Ihre Eingabeaufforderung, der ausgewählte Agent, die KI-Antwort, Anmerkungen und alle zugehörigen Daten werden gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.' }, { it: 'Sei sicuro di voler reimpostare tutto? Verranno cancellati prompt, agente selezionato, risposta AI, annotazioni e tutti i dati correlati. Questa azione non può essere annullata.' }, { ru: 'Вы уверены, что хотите сбросить всё? Будут удалены ваш запрос, выбранный агент, ответ ИИ, аннотации и все связанные данные. Это действие нельзя отменить.' }]}
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
              className: 'dark:bg-red-500 dark:text-white dark:hover:bg-red-600 dark:font-bold',
            },
          ]}
        />
      )}

      {/* Loading Indicator - Voice Powered Orb */}
      <div ref={loadingIndicatorRef}>
      <AiBuilderLoadingIndicator
        isLoading={(isLoading || isSummarizing) && !aiResponse}
        agent={selectedAgent}
        className={mode === 'page' ? 'mt-6' : ''}
      />
      </div>
    </div>
  );
}

