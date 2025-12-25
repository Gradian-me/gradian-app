/**
 * System Prompt Preview Sheet Component
 * Sheet for previewing the system prompt as markdown
 * Shows the EXACT prompt that will be sent to the AI API, including:
 * - General system prompt (date/time context)
 * - Agent-specific system prompt
 * - Graph generation prompt (for graph agents)
 * - General markdown output rules (for string format agents)
 */

'use client';

import React, { useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MarkdownViewer } from '@/gradian-ui/data-display/markdown';
import { GENERAL_MARKDOWN_OUTPUT_RULES } from '../../utils/ai-chat-utils';
import { getGeneralSystemPrompt } from '../../utils/ai-general-utils';
import { GRAPH_GENERATION_PROMPT } from '../../utils/ai-graph-utils';

interface SystemPromptPreviewSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  systemPrompt: string;
  requiredOutputFormat?: string;
  agentType?: 'chat' | 'image-generation' | 'voice-transcription' | 'video-generation' | 'graph-generation' | 'orchestrator' | 'search';
}

export function SystemPromptPreviewSheet({
  isOpen,
  onOpenChange,
  systemPrompt,
  requiredOutputFormat,
  agentType,
}: SystemPromptPreviewSheetProps) {
  // Build the complete prompt exactly as it will be sent to the API
  const previewPrompt = useMemo(() => {
    // Start with general system prompt (prepended to all agents)
    let fullPrompt = getGeneralSystemPrompt();
    
    // Add agent-specific system prompt
    if (systemPrompt) {
      fullPrompt += systemPrompt;
    }
    
    // For graph-generation agents, append graph generation prompt (same as in processGraphRequest)
    if (agentType === 'graph-generation') {
      fullPrompt += '\n\n' + GRAPH_GENERATION_PROMPT;
    }
    
    // For string format agents, append general markdown output rules (same as in processChatRequest)
    if (requiredOutputFormat === 'string') {
      fullPrompt += GENERAL_MARKDOWN_OUTPUT_RULES;
    }
    
    return fullPrompt;
  }, [systemPrompt, requiredOutputFormat, agentType]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0 h-full [&>button]:z-20">
        <SheetHeader className="px-6 pt-6 pb-4 pe-12 border-b border-gray-200 dark:border-gray-700 shrink-0 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <SheetTitle>System Prompt Preview</SheetTitle>
          <SheetDescription>
            Preview the exact system prompt that will be sent to the AI API, including:
            <ul className="list-disc list-inside mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>General system prompt (date/time context) - prepended to all agents</li>
              <li>Agent-specific system prompt</li>
              {agentType === 'graph-generation' && (
                <li>Graph generation instructions - appended for graph agents</li>
              )}
              {requiredOutputFormat === 'string' && (
                <li>General markdown output rules - appended for string format agents</li>
              )}
            </ul>
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
          {previewPrompt ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <MarkdownViewer 
                content={previewPrompt}
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
      </SheetContent>
    </Sheet>
  );
}

