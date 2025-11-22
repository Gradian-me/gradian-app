/**
 * AI Builder Form Component
 * Main form for entering prompts and selecting agents
 */

'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Select } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { Textarea } from '@/gradian-ui/form-builder/form-elements/components/Textarea';
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
  // Auto-resize textarea with max 8 lines
  useEffect(() => {
    const textarea = document.getElementById('user-prompt') as HTMLTextAreaElement;
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
      {/* Modern Gradient Card Container */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-indigo-950/30 border border-violet-200/50 dark:border-violet-800/50 shadow-sm">
        <div className="relative p-6 space-y-4">
          {/* Header Section */}
          <div className="flex flex-row justify-between items-center flex-wrap gap-4">
            <label
              htmlFor="user-prompt"
              className="text-sm font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide"
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

          {/* Textarea with modern styling */}
          <div className="relative">
            <Textarea
              config={{
                name: 'user-prompt',
                label: '',
              }}
              value={userPrompt}
              onChange={onPromptChange}
              disabled={isLoading || disabled}
              rows={1}
              className={cn(
                'min-h-[140px] px-5 py-4 rounded-xl border',
                'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm',
                'border-violet-200/50 dark:border-violet-700/50',
                'text-gray-900 dark:text-gray-100',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:border-violet-400',
                'shadow-sm',
                'transition-all duration-200'
              )}
              placeholder="Describe your vision... Let AI bring your ideas to life with intelligent automation and creative solutions."
              aiAgentId="professional-writing"
            />
          </div>
          
          {/* Footer Section with Model Badge and Buttons */}
          <div className="flex justify-between items-center pt-2 border-t border-violet-200/50 dark:border-violet-800/50">
            {/* Model Badge on Left */}
            {selectedAgent?.model && (
              <Badge 
                className={cn(
                  'shrink-0',
                  'bg-violet-100 text-violet-700 border-violet-200',
                  'dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-800',
                  'font-medium shadow-sm'
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
                    className="h-10 shadow-sm"
                  >
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating
                  </Button>
                  <Button
                    onClick={onStop}
                    variant="outline"
                    size="default"
                    className="h-10 shadow-sm"
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
                  className="h-10 shadow-sm bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Do the Magic
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

