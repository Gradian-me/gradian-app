/**
 * Prompt Preview Sheet Component
 * Sheet for previewing the prompt that will be sent to LLM
 */

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Modal } from '@/gradian-ui/data-display/components/Modal';
import { Button } from '@/components/ui/button';
import { Loader2, Eye } from 'lucide-react';
import { MarkdownViewer } from '@/gradian-ui/data-display/markdown';
import { buildSystemPrompt } from '../utils/prompt-concatenation-utils';
import { buildStandardizedPrompt } from '../utils/prompt-builder';
import { formatJsonForMarkdown } from '@/gradian-ui/shared/utils/text-utils';
import { VoicePoweredOrb } from '@/components/ui/voice-powered-orb';
import { TextSwitcher } from '@/components/ui/text-switcher';
import { motion, AnimatePresence } from 'framer-motion';

interface PromptPreviewSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  systemPrompt?: string; // Legacy prop, will be built from agent if not provided
  userPrompt: string;
  isLoadingPreload?: boolean; // Legacy prop, will be determined by buildSystemPrompt
  disabled?: boolean;
  extraBody?: Record<string, any>;
  bodyParams?: Record<string, any>;
  requiredOutputFormat?: string;
  // New props for centralized prompt building
  agent?: any;
  formValues?: Record<string, any>;
  baseUrl?: string;
  summarizedPrompt?: string; // Summarized version of the prompt (for search/image)
  isSummarizing?: boolean; // Whether summarization is in progress
  hideButton?: boolean; // Hide the preview button (useful when button is rendered elsewhere, e.g., in dialog footer)
  /** When true, render as a Modal dialog instead of Sheet (e.g. when used inside AiAgentDialog to avoid z-index issues) */
  asDialog?: boolean;
}

export function PromptPreviewSheet({
  isOpen,
  onOpenChange,
  systemPrompt: legacySystemPrompt,
  userPrompt,
  isLoadingPreload: legacyIsLoadingPreload,
  disabled = false,
  extraBody,
  bodyParams,
  requiredOutputFormat,
  agent,
  formValues,
  baseUrl,
  summarizedPrompt,
  isSummarizing = false,
  hideButton = false,
  asDialog = false,
}: PromptPreviewSheetProps) {
  const [builtSystemPrompt, setBuiltSystemPrompt] = useState<string>(legacySystemPrompt || '');
  const [isLoadingPreload, setIsLoadingPreload] = useState<boolean>(legacyIsLoadingPreload || false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure we're mounted before building prompt to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Build system prompt using centralized utility if agent is provided
  // Only run after mount to ensure server/client consistency
  useEffect(() => {
    if (!isMounted) return;
    
    if (agent) {
      setIsLoadingPreload(true);
      buildSystemPrompt({
        agent,
        formValues,
        bodyParams,
        baseUrl: baseUrl || (typeof window !== 'undefined' ? window.location.origin : ''),
      })
        .then((result) => {
          // buildSystemPrompt returns { systemPrompt: string, isLoadingPreload: boolean }
          setBuiltSystemPrompt(result.systemPrompt || '');
          setIsLoadingPreload(result.isLoadingPreload || false);
        })
        .catch((error) => {
          console.error('Error building system prompt:', error);
          setBuiltSystemPrompt(legacySystemPrompt || '');
          setIsLoadingPreload(false);
        });
    } else {
      // Fallback to legacy systemPrompt if agent is not provided
      setBuiltSystemPrompt(legacySystemPrompt || '');
      setIsLoadingPreload(legacyIsLoadingPreload || false);
    }
  }, [isMounted, agent, formValues, bodyParams, baseUrl, legacySystemPrompt, legacyIsLoadingPreload]);

  const effectiveSystemPrompt = builtSystemPrompt;
  
  // Build unified prompt from formValues using buildStandardizedPrompt (same logic as useAiBuilder)
  const effectiveUserPrompt = useMemo(() => {
    // Use buildStandardizedPrompt to build the unified prompt (same as useAiBuilder hook)
    if (formValues && agent && agent.renderComponents) {
      const builtPrompt = buildStandardizedPrompt(agent, formValues);
      if (builtPrompt && builtPrompt.trim()) {
        return builtPrompt;
      }
    }
    // Fallback to userPrompt if building from formValues didn't work
    return userPrompt;
  }, [userPrompt, formValues, agent]);
  
  const hasPrompt = effectiveSystemPrompt || effectiveUserPrompt.trim();
  const hasExtraBody = extraBody && Object.keys(extraBody).length > 0;
  const hasBodyParams = bodyParams && Object.keys(bodyParams).length > 0;
  // Enable preview if there's a prompt OR if there are body/extra params (for image generation, etc.)
  const canPreview = hasPrompt || hasBodyParams || hasExtraBody;

  const previewDescription =
    'This is the prompt that is being sent (or was sent) to the Language Model. You can preview it at any time, including during generation.' +
    (requiredOutputFormat === 'string'
      ? ' Note: General markdown output rules are automatically appended for string format agents.'
      : '');

  const previewBodyContent = (
    <div className={asDialog ? 'flex-1 overflow-y-auto min-h-0' : 'flex-1 overflow-y-auto px-6 py-6 min-h-0'}>
      {(hasPrompt || hasBodyParams || hasExtraBody) ? (
              <div className="space-y-4">
                {/* Show prompt from bodyParams if userPrompt is empty but bodyParams has prompt */}
                {(!effectiveUserPrompt.trim() && bodyParams?.prompt) ? (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
                      Prompt (from body parameters):
                    </h3>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                      <MarkdownViewer 
                        content={String(bodyParams.prompt)}
                        showToggle={false}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
                        User Prompt:
                      </h3>
                      {effectiveUserPrompt.trim() ? (
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                          <MarkdownViewer 
                            content={effectiveUserPrompt.trim()}
                            showToggle={false}
                          />
                        </div>
                      ) : (
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            (No user prompt - prompt will be built from form fields)
                          </p>
                        </div>
                      )}
                    </div>
                    {/* Show summarized prompt if available and different from original */}
                    {(summarizedPrompt || isSummarizing) && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
                          Summarized Prompt (for search/image):
                          {isSummarizing && (
                            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                              <Loader2 className="h-3 w-3 inline animate-spin me-1" />
                              Summarizing...
                            </span>
                          )}
                        </h3>
                        {isSummarizing ? (
                          <AnimatePresence>
                            <motion.div
                              key="summarizing-orb"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                              className="w-full h-96 relative rounded-xl overflow-hidden"
                            >
                              <VoicePoweredOrb
                                enableVoiceControl={false}
                                className="rounded-xl overflow-hidden"
                              />
                              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none px-4" dir="ltr">
                                <div className="max-w-[85%]">
                                  <TextSwitcher
                                    texts={['Summarizing prompt...', 'Preparing summary...', 'Analyzing content...']}
                                    className="text-violet-900 dark:text-white font-medium text-xs px-4 py-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg"
                                    switchInterval={2000}
                                    transitionDuration={0.5}
                                    shimmerDuration={1}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          </AnimatePresence>
                        ) : summarizedPrompt && summarizedPrompt.trim() && summarizedPrompt !== effectiveUserPrompt.trim() ? (
                          <div className="rounded-lg border border-violet-200 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20 p-4">
                            <MarkdownViewer 
                              content={summarizedPrompt.trim()}
                              showToggle={false}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              This summarized version will be used for search queries and image generation.
                            </p>
                          </div>
                        ) : summarizedPrompt && summarizedPrompt.trim() === effectiveUserPrompt.trim() ? (
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Summary is the same as original prompt.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
                    System Prompt:
                  </h3>
                  {isLoadingPreload ? (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading preloaded context...
                      </div>
                    </div>
                  ) : effectiveSystemPrompt ? (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                      <MarkdownViewer 
                        content={typeof effectiveSystemPrompt === 'string' ? effectiveSystemPrompt : String(effectiveSystemPrompt || '')}
                        showToggle={false}
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        (No system prompt configured)
                      </p>
                    </div>
                  )}
                </div>
                {(hasBodyParams || hasExtraBody) && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
                      Request Parameters:
                    </h3>
                    <div className="space-y-3">
                      {hasBodyParams && (
                        <div>
                          <h4 className="text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Body Parameters (sectionId: "body"):
                          </h4>
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-mono">
                              {formatJsonForMarkdown(bodyParams)}
                            </pre>
                          </div>
                        </div>
                      )}
                      {hasExtraBody && (
                        <div>
                          <h4 className="text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Extra Body Parameters (sectionId: "extra"):
                          </h4>
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-mono">
                              {formatJsonForMarkdown(extraBody)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>Please enter a prompt and select an AI agent to view the prompt.</p>
              </div>
            )}
    </div>
  );

  return (
    <>
      {!hideButton && (
        <Button
          variant="outline"
          size="default"
          disabled={!canPreview || disabled}
          className="h-10"
          onClick={() => onOpenChange(true)}
        >
          <Eye className="h-4 w-4 me-2" />
          Preview
        </Button>
      )}
      {asDialog ? (
        <Modal
          isOpen={isOpen}
          onClose={() => onOpenChange(false)}
          title="Prompt Sent to LLM"
          description={previewDescription}
          size="lg"
          showCloseButton={true}
        >
          {previewBodyContent}
        </Modal>
      ) : (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
          <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0 h-full [&>button]:z-20 !z-[100]" overlayClassName="!z-[95]">
            <SheetHeader className="px-6 pt-6 pb-4 pe-12 border-b border-gray-200 dark:border-gray-700 shrink-0 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <SheetTitle>Prompt Sent to LLM</SheetTitle>
              <SheetDescription>{previewDescription}</SheetDescription>
            </SheetHeader>
            {previewBodyContent}
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

