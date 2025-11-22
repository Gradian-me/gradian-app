/**
 * Modified Prompts List Component
 * Reusable component to display nested modified prompts
 */

'use client';

import React, { useState } from 'react';
import type { AiPrompt } from '../types';
import { Badge } from '@/components/ui/badge';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { ChevronDown, FileText } from 'lucide-react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ModifiedPromptViewer } from './ModifiedPromptViewer';

interface ModifiedPromptsListProps {
  parentPromptId: string;
  modifiedPrompts: AiPrompt[];
  agentMap: Map<string, { id: string; label: string; icon?: string; model?: string }>;
  userMap?: Map<string, { id: string; name: string; lastname?: string; username?: string }>;
}

export function ModifiedPromptsList({
  parentPromptId,
  modifiedPrompts,
  agentMap,
  userMap = new Map(),
}: ModifiedPromptsListProps) {
  const [selectedModifiedPrompt, setSelectedModifiedPrompt] = useState<AiPrompt | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (modifiedPrompts.length === 0) {
    return null;
  }

  return (
    <>
      <div className="ml-6 pl-4 border-l-2 border-violet-200 dark:border-violet-800 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">
          <FileText className="h-4 w-4" />
          Modified Prompts ({modifiedPrompts.length})
        </div>
        {modifiedPrompts.map((modifiedPrompt) => {
          const modifiedAgent = agentMap.get(modifiedPrompt.aiAgent);
          return (
            <div
              key={modifiedPrompt.id}
              className="cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-950/20 rounded-lg p-2 transition-colors"
              onClick={() => {
                setSelectedModifiedPrompt(modifiedPrompt);
                setIsSheetOpen(true);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {modifiedAgent?.icon && (
                    <div className="p-1 rounded bg-violet-100 dark:bg-violet-900/30">
                      <IconRenderer
                        iconName={modifiedAgent.icon}
                        className="h-3 w-3 text-violet-600 dark:text-violet-400"
                      />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {format(new Date(modifiedPrompt.timestamp), 'PPpp')}
                  </span>
                  {modifiedPrompt.annotations && modifiedPrompt.annotations.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {modifiedPrompt.annotations.length} annotation{modifiedPrompt.annotations.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modified Prompt Sheet */}
      {selectedModifiedPrompt && (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="w-full sm:max-w-3xl flex flex-col p-0 h-full overflow-y-auto">
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <SheetTitle>Modified Prompt Details</SheetTitle>
              <SheetDescription>
                View details of the modified prompt with annotations
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <ModifiedPromptViewer 
                prompt={selectedModifiedPrompt} 
                agentMap={agentMap} 
                userMap={userMap}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

