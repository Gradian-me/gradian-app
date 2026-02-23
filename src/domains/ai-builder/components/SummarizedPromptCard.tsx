/**
 * Summarized Prompt Card
 * Displays the prompt used for search and image generation (summarized or original) with translations
 */

'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';

export interface SummarizedPromptCardProps {
  /** The prompt text to display (summarized or original used for search/image) */
  content: string;
  className?: string;
}

export function SummarizedPromptCard({ content, className }: SummarizedPromptCardProps) {
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();

  const title = getT(TRANSLATION_KEYS.AI_BUILDER_SUMMARIZED_PROMPT_TITLE, language, defaultLang);
  const description = getT(TRANSLATION_KEYS.AI_BUILDER_SUMMARIZED_PROMPT_DESCRIPTION, language, defaultLang);

  if (!content || !content.trim()) {
    return null;
  }

  const trimmed = content.trim();

  return (
    <div
      className={className}
      role="region"
      aria-label={title}
    >
      <div className="relative overflow-hidden rounded-xl border border-violet-200 dark:border-violet-400 bg-gradient-to-br from-violet-50/50 via-purple-50/50 to-indigo-50/50 dark:from-violet-950/20 dark:via-purple-950/20 dark:to-indigo-950/20 backdrop-blur-sm shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-100/20 to-transparent dark:from-violet-900/10" />
        <div className="relative p-5 md:p-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="shrink-0 mt-0.5">
              <div className="rounded-lg bg-violet-100 dark:bg-violet-900/30 p-2">
                <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-violet-900 dark:text-violet-200 uppercase tracking-wide mb-1">
                    {title}
                  </h3>
                  <p className="text-xs text-violet-700/70 dark:text-violet-300/70">
                    {description}
                  </p>
                </div>
                <CopyContent content={trimmed} />
              </div>
            </div>
          </div>
          <div className="mt-4 pl-11">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap wrap-break-word" dir="auto">
                {trimmed}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
