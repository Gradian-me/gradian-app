'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkSlug from 'remark-slug';
import remarkAutolinkHeadings from 'remark-autolink-headings';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { EndLine } from '@/gradian-ui/layout/end-line/components/EndLine';
import { createMarkdownComponents } from './MarkdownComponents';
import { MarkdownToolbox } from './MarkdownToolbox';
import { MarkdownNavigation } from './MarkdownNavigation';
import { extractHeadings } from '../utils/headingExtractor';
import { useMarkdownScrollSpy } from '../hooks/useMarkdownScrollSpy';
import { MarkdownViewerProps } from '../types';

export function MarkdownViewer({ 
  content, 
  showToggle = true, 
  stickyHeadings = [],
  navigationHeadingLevels = [],
  onNavigationData
}: MarkdownViewerProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [headings, setHeadings] = useState<Array<{ id: string; text: string; level: number }>>([]);
  
  // Extract headings for navigation using remark parser
  useEffect(() => {
    if (!navigationHeadingLevels || navigationHeadingLevels.length === 0) {
      setHeadings([]);
      return;
    }
    
    if (!content || typeof content !== 'string') {
      setHeadings([]);
      return;
    }
    
    let cancelled = false;
    
    // Extract headings asynchronously using remark
    extractHeadings(content, navigationHeadingLevels)
      .then((extracted) => {
        if (!cancelled) {
          console.log('✅ Extracted headings:', extracted.length, 'headings');
          console.log('Extracted heading IDs:', extracted.map(h => `#${h.id}`));
          setHeadings(extracted);
          
          // Verify headings exist in DOM after a delay
          setTimeout(() => {
            const found = extracted.map(({ id }) => {
              const element = document.getElementById(id);
              return { id, found: !!element };
            });
            const missing = found.filter(f => !f.found);
            if (missing.length > 0) {
              console.warn('⚠️ Some heading IDs not found in DOM:', missing.map(m => `#${m.id}`));
            } else {
              console.log('✅ All heading IDs found in DOM');
            }
          }, 1000);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('❌ Error extracting headings:', error);
          setHeadings([]);
        }
      });
    
    return () => {
      cancelled = true;
    };
  }, [content, navigationHeadingLevels]);
  
  // Track active heading using scroll spy hook
  const activeHeadingId = useMarkdownScrollSpy(headings);
  
  // Use ref to track previous values and avoid unnecessary updates
  const prevHeadingsRef = useRef<string>('');
  const prevActiveIdRef = useRef<string | undefined>(undefined);
  
  // Notify parent of navigation data
  useEffect(() => {
    if (!onNavigationData) return;
    
    // Create a stable key to compare headings
    const headingsKey = JSON.stringify(headings.map(h => h.id));
    const headingsChanged = headingsKey !== prevHeadingsRef.current;
    const activeIdChanged = activeHeadingId !== prevActiveIdRef.current;
    
    // Only update if something actually changed
    if (headingsChanged || activeIdChanged) {
      prevHeadingsRef.current = headingsKey;
      prevActiveIdRef.current = activeHeadingId;
      
      onNavigationData({ headings, activeHeadingId });
    }
  }, [headings, activeHeadingId, onNavigationData]);
  
  // Create components with sticky headings configuration
  const markdownComponents = createMarkdownComponents(stickyHeadings);

  return (
    <div className="space-y-4">
      {showToggle && (
        <MarkdownToolbox showRaw={showRaw} onToggleRaw={setShowRaw} />
      )}

      {showRaw ? (
        <div className="my-4">
          <CodeViewer
            code={content}
            programmingLanguage="markdown"
            title="Raw Markdown"
          />
          <EndLine />
        </div>
      ) : (
        <article className="prose prose-lg dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[
              remarkGfm,
              remarkSlug as any, // Type compatibility workaround
              remarkAutolinkHeadings as any // Type compatibility workaround
            ]}
            components={markdownComponents}
          >
            {content}
          </ReactMarkdown>
          <EndLine />
        </article>
      )}
    </div>
  );
}

MarkdownViewer.displayName = 'MarkdownViewer';

