/**
 * AI Builder Form Component
 * Main form for entering prompts and selecting agents
 */

'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Select } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/gradian-ui/shared/utils';
import { Sparkles, Loader2, Square, History } from 'lucide-react';
import { DEMO_MODE } from '@/gradian-ui/shared/constants/application-variables';
import { PromptPreviewSheet } from './PromptPreviewSheet';
import type { AiAgent } from '../types';

interface AiBuilderFormProps {
  userPrompt: string;
  onPromptChange: (prompt: string) => void;
  agents: AiAgent[];
  selectedAgentId: string;
  onAgentChange: (agentId: string) => void;
  isLoading: boolean;
  onGenerate: () => void;
  onStop: () => void;
  systemPrompt?: string;
  isLoadingPreload?: boolean;
  isSheetOpen?: boolean;
  onSheetOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}

export function AiBuilderForm({
  userPrompt,
  onPromptChange,
  agents,
  selectedAgentId,
  onAgentChange,
  isLoading,
  onGenerate,
  onStop,
  systemPrompt = '',
  isLoadingPreload = false,
  isSheetOpen = false,
  onSheetOpenChange,
  disabled = false,
}: AiBuilderFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea with max 8 lines
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
      const maxHeight = lineHeight * 8; // 8 lines max
      
      if (scrollHeight <= maxHeight) {
        textarea.style.height = `${scrollHeight}px`;
        textarea.style.overflowY = 'hidden';
      } else {
        textarea.style.height = `${maxHeight}px`;
        textarea.style.overflowY = 'auto';
      }
    }
  }, [userPrompt]);

  // Get selected agent
  const selectedAgent = agents.find(agent => agent.id === selectedAgentId);

  return (
    <div className="space-y-6">
      {/* User Prompt Input */}
      <div className="space-y-2 flex flex-col items-center">
        <div className="flex flex-row justify-between items-center flex-wrap gap-2 w-full max-w-3xl">
          <label
            htmlFor="user-prompt"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            What would you like to create?
          </label>
          <div className="flex items-center gap-2">
            <div className="w-48">
              <Select
                config={{
                  name: 'ai-agent-select',
                  label: '',
                }}
                options={agents.map(agent => ({
                  id: agent.id,
                  label: agent.label,
                  icon: agent.icon,
                }))}
                value={selectedAgentId}
                onValueChange={(value) => onAgentChange(value)}
                placeholder="Select agent"
                size="md"
                className="w-full"
              />
            </div>
            <Link href="/ai-prompts" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2 shrink-0">
                <History className="h-4 w-4" />
                Prompt History
              </Button>
            </Link>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          id="user-prompt"
          value={userPrompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Describe your vision... Let AI bring your ideas to life with intelligent automation and creative solutions."
          className={cn(
            'w-full max-w-3xl min-h-[120px] px-4 py-3 rounded-2xl border',
            'bg-white dark:bg-gray-800',
            'border-gray-300 dark:border-gray-600',
            'text-gray-900 dark:text-gray-100',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent',
            'resize-none shadow-sm',
            'transition-all duration-200'
          )}
          disabled={isLoading || disabled}
          rows={1}
        />
        
        {/* Model Badge and Buttons Row */}
        <div className="flex justify-between items-center w-full max-w-3xl">
          {/* Model Badge on Left */}
          {selectedAgent?.model && (
            <Badge 
              className={cn(
                'shrink-0',
                'bg-violet-100 text-violet-700 border-violet-200',
                'dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-800',
                'font-medium'
              )}
            >
              {selectedAgent.model}
            </Badge>
          )}
          
          {/* Buttons on Right */}
          <div className="flex items-center gap-2">
            {onSheetOpenChange && (
              <PromptPreviewSheet
                isOpen={isSheetOpen}
                onOpenChange={onSheetOpenChange}
                systemPrompt={systemPrompt}
                userPrompt={userPrompt}
                isLoadingPreload={isLoadingPreload}
                disabled={!userPrompt.trim() || disabled}
              />
            )}
            {isLoading ? (
              <>
                <Button
                  onClick={onGenerate}
                  disabled={true}
                  size="default"
                  variant="default"
                  className="h-10"
                >
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating
                </Button>
                <Button
                  onClick={onStop}
                  variant="outline"
                  size="default"
                  className="h-10"
                >
                  <Square className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400 fill-gray-600 dark:fill-gray-400" />
                  Stop
                </Button>
              </>
            ) : (
              <Button
                onClick={onGenerate}
                disabled={!userPrompt.trim() || disabled}
                size="default"
                variant="default"
                className="h-10"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Do the Magic
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

