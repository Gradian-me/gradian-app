/**
 * Prompt Preview Sheet Component
 * Sheet for previewing the prompt that will be sent to LLM
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Loader2, Eye } from 'lucide-react';
import { MarkdownViewer } from '@/gradian-ui/data-display/markdown';
import { buildSystemPrompt } from '../utils/prompt-concatenation-utils';
import { formatJsonForMarkdown } from '@/gradian-ui/shared/utils/text-utils';

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
  const hasPrompt = effectiveSystemPrompt || userPrompt.trim();
  const hasExtraBody = extraBody && Object.keys(extraBody).length > 0;
  const hasBodyParams = bodyParams && Object.keys(bodyParams).length > 0;
  // Enable preview if there's a prompt OR if there are body/extra params (for image generation, etc.)
  const canPreview = hasPrompt || hasBodyParams || hasExtraBody;

  return (
    <>
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
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0 h-full [&>button]:z-20">
          <SheetHeader className="px-6 pt-6 pb-4 pe-12 border-b border-gray-200 dark:border-gray-700 shrink-0 sticky top-0 bg-white dark:bg-gray-900 z-10">
            <SheetTitle>Prompt Sent to LLM</SheetTitle>
            <SheetDescription>
              This is the prompt that is being sent (or was sent) to the Language Model. You can preview it at any time, including during generation.
              {requiredOutputFormat === 'string' && (
                <span className="block mt-1 text-xs text-blue-600 dark:text-blue-400">
                  Note: General markdown output rules are automatically appended for string format agents.
                </span>
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
            {(hasPrompt || hasBodyParams || hasExtraBody) ? (
              <div className="space-y-4">
                {/* Show prompt from bodyParams if userPrompt is empty but bodyParams has prompt */}
                {(!userPrompt.trim() && bodyParams?.prompt) ? (
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
                      {userPrompt.trim() ? (
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                          <MarkdownViewer 
                            content={userPrompt.trim()}
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
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Generating summary...
                            </div>
                          </div>
                        ) : summarizedPrompt && summarizedPrompt.trim() && summarizedPrompt !== userPrompt.trim() ? (
                          <div className="rounded-lg border border-violet-200 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20 p-4">
                            <MarkdownViewer 
                              content={summarizedPrompt.trim()}
                              showToggle={false}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              This summarized version will be used for search queries and image generation.
                            </p>
                          </div>
                        ) : summarizedPrompt && summarizedPrompt.trim() === userPrompt.trim() ? (
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
        </SheetContent>
      </Sheet>
    </>
  );
}

