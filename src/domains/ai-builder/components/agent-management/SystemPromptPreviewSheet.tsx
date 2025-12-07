/**
 * System Prompt Preview Sheet Component
 * Sheet for previewing the system prompt as markdown
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
import { MarkdownViewer } from '@/gradian-ui/data-display/markdown';

interface SystemPromptPreviewSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  systemPrompt: string;
}

export function SystemPromptPreviewSheet({
  isOpen,
  onOpenChange,
  systemPrompt,
}: SystemPromptPreviewSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0 h-full [&>button]:z-20">
        <SheetHeader className="px-6 pt-6 pb-4 pe-12 border-b border-gray-200 dark:border-gray-700 shrink-0 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <SheetTitle>System Prompt Preview</SheetTitle>
          <SheetDescription>
            Preview how the system prompt will be rendered as markdown.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
          {systemPrompt ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <MarkdownViewer 
                content={systemPrompt}
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

