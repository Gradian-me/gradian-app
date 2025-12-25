/**
 * AI Search Results Component
 * Displays search results as cards with avatars, source extraction, and micro animations
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import { MarkdownViewer } from '@/gradian-ui/data-display/markdown/components/MarkdownViewer';
import { cn } from '@/gradian-ui/shared/utils';
import { getInitials } from '@/gradian-ui/form-builder/form-elements/utils/avatar-utils';
import type { SearchResult } from '../utils/ai-search-utils';

interface AISearchResultsProps {
  results: SearchResult[];
  className?: string;
}

/**
 * Extract host from URL (e.g., "https://nature.com/article" -> "nature.com")
 */
function extractHost(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    // If URL parsing fails, try to extract manually
    const match = url.match(/https?:\/\/(?:www\.)?([^\/]+)/);
    return match ? match[1] : 'source';
  }
}

/**
 * Format date for display
 */
function formatDate(dateString?: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Truncate text to a maximum number of characters
 */
function truncateText(text: string, maxChars: number = 200): string {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + '...';
}

export function AISearchResults({ results, className }: AISearchResultsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<{ title: string; snippet: string; url: string } | null>(null);

  if (!results || results.length === 0) {
    return null;
  }

  const handleShowMore = (result: SearchResult, e: React.MouseEvent) => {
    e.stopPropagation();
    setDialogContent({
      title: result.title,
      snippet: result.snippet,
      url: result.url,
    });
    setDialogOpen(true);
  };

  return (
    <>
      <div className={cn('space-y-4', className)}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Search Results
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </p>
        </motion.div>

        <div className="space-y-2">
          {results.map((result, index) => {
            const host = extractHost(result.url);
            const initials = getInitials(host);
            const formattedDate = formatDate(result.date);
            const truncatedSnippet = truncateText(result.snippet, 150);
            const shouldShowMore = result.snippet.length > 150;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.05,
                }}
                whileHover={{ y: -1 }}
                className={cn(
                  'group relative rounded-md border border-gray-200 dark:border-gray-700',
                  'bg-white dark:bg-gray-800',
                  'p-3 shadow-sm hover:shadow',
                  'transition-all duration-200',
                  'overflow-hidden'
                )}
              >
                {/* Card content */}
                <div className="flex items-start gap-2.5">
                  {/* Avatar with host initials */}
                  <Avatar className="h-8 w-8 border border-gray-200 dark:border-gray-700 shrink-0">
                    <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Top row: Source label and Open button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {host}
                        </span>
                        {formattedDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                            <Calendar className="h-3 w-3" />
                            <span>{formattedDate}</span>
                          </div>
                        )}
                      </div>
                      {/* Link button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 shrink-0"
                        onClick={() => {
                          if (result.url) {
                            window.open(result.url, '_blank', 'noopener,noreferrer');
                          }
                        }}
                      >
                        <ExternalLink className="h-3 w-3 me-1.5" />
                        Open
                      </Button>
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      {result.title}
                    </h4>

                    {/* Snippet with truncate and show more */}
                    <div className="space-y-0.5">
                      <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        <MarkdownViewer
                          content={truncatedSnippet}
                          showToggle={false}
                          isEditable={false}
                          showEndLine={false}
                        />
                      </div>
                      {shouldShowMore && (
                        <button
                          type="button"
                          onClick={(e) => handleShowMore(result, e)}
                          className="text-xs text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300 underline font-medium"
                        >
                          Show more
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hover effect gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-violet-50/0 via-violet-50/0 to-violet-50/0 dark:from-violet-950/0 dark:via-violet-950/0 dark:to-violet-950/0 group-hover:from-violet-50/50 group-hover:via-violet-50/30 group-hover:to-violet-50/50 dark:group-hover:from-violet-950/20 dark:group-hover:via-violet-950/10 dark:group-hover:to-violet-950/20 transition-all duration-300 pointer-events-none rounded-md" />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Dialog for showing full snippet content */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={cn(
          "w-full h-full rounded-none flex flex-col p-0",
          "sm:max-w-2xl sm:max-h-[80vh] sm:rounded-2xl sm:h-auto sm:p-6"
        )}>
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 sm:px-0 sm:pt-0 sm:pb-4 sm:border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="pr-4">{dialogContent?.title || 'Snippet'}</DialogTitle>
              {dialogContent && (
                <div className="flex items-center gap-2">
                  <CopyContent content={dialogContent.snippet} />
                  {dialogContent.url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="me-6"
                      onClick={() => {
                        if (dialogContent?.url) {
                          window.open(dialogContent.url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                    >
                      <ExternalLink className="h-3 w-3 me-1.5" />
                      Open Source
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-0 sm:pb-0 sm:mt-4">
            <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <MarkdownViewer
                content={dialogContent?.snippet || ''}
                showToggle={false}
                isEditable={false}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

