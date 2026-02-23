'use client';

import React from 'react';
import { MarkdownViewer, MarkdownNavigation } from '@/gradian-ui/data-display/markdown';

interface MarkdownPageClientProps {
  content: string;
  navigationHeadingLevels?: number[];
  stickyHeadings?: string[];
  documentTitle?: string;
  documentNumber?: string;
}

export function MarkdownPageClient({
  content,
  navigationHeadingLevels = [],
  stickyHeadings = [],
  documentTitle,
  documentNumber,
}: MarkdownPageClientProps) {
  const hasContent = typeof content === 'string' && content.trim().length > 0;

  return (
    <div className="flex gap-8 relative">
      {/* Main markdown content */}
      <div className="flex-1 min-w-0">
        <MarkdownViewer
          content={content}
          showToggle={true}
          stickyHeadings={stickyHeadings}
          navigationHeadingLevels={navigationHeadingLevels}
          enablePrint={true}
          printConfig={{
            includeHeader: true,
            documentTitle: documentTitle,
            documentNumber: documentNumber,
          }}
        />
      </div>

      {/* Navigation - markdown-navbar parses source and shows headings (h2+) */}
      {hasContent && (
        <div className="hidden lg:block shrink-0 w-64">
          <MarkdownNavigation source={content} />
        </div>
      )}
    </div>
  );
}

