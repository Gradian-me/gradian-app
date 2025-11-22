/**
 * Prompt Preview Sheet Component
 * Sheet for previewing the prompt that will be sent to LLM
 */

'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Loader2, Eye } from 'lucide-react';

interface PromptPreviewSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  systemPrompt: string;
  userPrompt: string;
  isLoadingPreload: boolean;
  disabled?: boolean;
}

export function PromptPreviewSheet({
  isOpen,
  onOpenChange,
  systemPrompt,
  userPrompt,
  isLoadingPreload,
  disabled = false,
}: PromptPreviewSheetProps) {
  const hasPrompt = systemPrompt || userPrompt.trim();

  return (
    <>
      <Button
        variant="outline"
        size="default"
        disabled={!userPrompt.trim() || disabled}
        className="h-10"
        onClick={() => onOpenChange(true)}
      >
        <Eye className="h-4 w-4 mr-2" />
        Preview
      </Button>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0 h-full [&>button]:z-20">
          <SheetHeader className="px-6 pt-6 pb-4 pr-12 border-b border-gray-200 dark:border-gray-700 shrink-0 sticky top-0 bg-white dark:bg-gray-900 z-10">
            <SheetTitle>Prompt Sent to LLM</SheetTitle>
            <SheetDescription>
              This is the prompt that is being sent (or was sent) to the Language Model. You can preview it at any time, including during generation.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
            {hasPrompt ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
                    User Prompt:
                  </h3>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                    <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap wrap-break-word">
                      {userPrompt.trim()}
                    </pre>
                  </div>
                </div>
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
                  ) : (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                      <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap wrap-break-word">
                        {systemPrompt || '(No system prompt configured)'}
                      </pre>
                    </div>
                  )}
                </div>
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

