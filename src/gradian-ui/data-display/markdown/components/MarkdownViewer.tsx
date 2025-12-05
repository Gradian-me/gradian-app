'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  const [headings, setHeadings] = useState<Array<{ id: string; text: string; level: number }>>([]);
  
  // Memoize navigationHeadingLevels array to prevent unnecessary re-renders
  const navigationLevelsKey = useMemo(() => {
    if (!navigationHeadingLevels || navigationHeadingLevels.length === 0) return '';
    return JSON.stringify([...navigationHeadingLevels].sort());
  }, [navigationHeadingLevels]);
  
  // Memoize content key to detect actual content changes
  const contentKey = useMemo(() => {
    return content || '';
  }, [content]);
  
  // Track previous values to prevent unnecessary state updates
  const prevContentKeyRef = useRef<string>('');
  const prevNavigationLevelsKeyRef = useRef<string>('');
  
  // Extract headings for navigation using remark parser
  useEffect(() => {
    // Check if we actually need to extract headings
    if (!navigationLevelsKey) {
      setHeadings((prev) => prev.length > 0 ? [] : prev);
      return;
    }
    
    if (!contentKey) {
      setHeadings((prev) => prev.length > 0 ? [] : prev);
      return;
    }
    
    // Skip if content and navigation levels haven't changed
    if (contentKey === prevContentKeyRef.current && navigationLevelsKey === prevNavigationLevelsKeyRef.current) {
      return;
    }
    
    // Update refs
    prevContentKeyRef.current = contentKey;
    prevNavigationLevelsKeyRef.current = navigationLevelsKey;
    
    let cancelled = false;
    
    // Parse navigationHeadingLevels from the stable key
    const levels = navigationLevelsKey ? JSON.parse(navigationLevelsKey) : [];
    
    // Extract headings asynchronously using remark
    extractHeadings(contentKey, levels)
      .then((extracted) => {
        if (!cancelled) {
          console.log('✅ Extracted headings:', extracted.length, 'headings');
          console.log('Extracted heading IDs:', extracted.map(h => `#${h.id}`));
          
          // Only update if headings actually changed
          setHeadings((prevHeadings) => {
            const prevKey = JSON.stringify(prevHeadings.map(h => h.id));
            const newKey = JSON.stringify(extracted.map(h => h.id));
            if (prevKey === newKey) {
              return prevHeadings;
            }
            return extracted;
          });
          
          // Verify headings exist in DOM after a delay
          setTimeout(() => {
            if (!cancelled) {
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
            }
          }, 1000);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('❌ Error extracting headings:', error);
          setHeadings((prev) => prev.length > 0 ? [] : prev);
        }
      });
    
    return () => {
      cancelled = true;
    };
  }, [contentKey, navigationLevelsKey]);
  
  // Track active heading using scroll spy hook
  const activeHeadingId = useMarkdownScrollSpy(headings);
  
  // Use ref to track previous values and avoid unnecessary updates
  const prevHeadingsRef = useRef<string>('');
  const prevActiveIdRef = useRef<string | undefined>(undefined);
  
  // Notify parent of navigation data (memoized callback to prevent infinite loops)
  const stableOnNavigationData = useRef(onNavigationData);
  useEffect(() => {
    stableOnNavigationData.current = onNavigationData;
  }, [onNavigationData]);
  
  // Notify parent of navigation data
  useEffect(() => {
    if (!stableOnNavigationData.current) return;
    
    // Create a stable key to compare headings
    const headingsKey = JSON.stringify(headings.map(h => h.id));
    const headingsChanged = headingsKey !== prevHeadingsRef.current;
    const activeIdChanged = activeHeadingId !== prevActiveIdRef.current;
    
    // Only update if something actually changed
    if (headingsChanged || activeIdChanged) {
      prevHeadingsRef.current = headingsKey;
      prevActiveIdRef.current = activeHeadingId;
      
      stableOnNavigationData.current({ headings, activeHeadingId });
    }
  }, [headings, activeHeadingId]);
  
  // Memoize sticky headings to prevent recreating components unnecessarily
  const stickyHeadingsKey = useMemo(() => {
    if (!stickyHeadings || stickyHeadings.length === 0) return '';
    return JSON.stringify([...stickyHeadings].sort());
  }, [stickyHeadings]);
  
  // Track when markdown is fully loaded
  const [markdownLoadedTimestamp, setMarkdownLoadedTimestamp] = useState<number | undefined>(undefined);
  const markdownContentRef = useRef<HTMLDivElement>(null);
  
  // Detect when markdown rendering is complete
  useEffect(() => {
    if (viewMode !== 'preview' || !content) {
      setMarkdownLoadedTimestamp(undefined);
      return;
    }

    // Use a combination of requestAnimationFrame and setTimeout to detect when rendering is complete
    const checkRenderComplete = () => {
      // Wait for ReactMarkdown to finish rendering
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Additional delay to ensure all components (including mermaid) are mounted
          setTimeout(() => {
            setMarkdownLoadedTimestamp(Date.now());
          }, 100);
        });
      });
    };

    // Small delay to ensure ReactMarkdown has started rendering
    const timer = setTimeout(checkRenderComplete, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [content, viewMode]);

  // Create components with sticky headings configuration (memoized)
  const markdownComponents = useMemo(() => {
    const levels = stickyHeadingsKey ? JSON.parse(stickyHeadingsKey) : [];
    return createMarkdownComponents(levels, markdownLoadedTimestamp);
  }, [stickyHeadingsKey, markdownLoadedTimestamp]);

  return (
    <div className="space-y-4">
      {showToggle && (
        <MarkdownToolbox viewMode={viewMode} onViewModeChange={setViewMode} />
      )}

      {viewMode === 'raw' ? (
        <div className="my-4">
          <CodeViewer
            code={content}
            programmingLanguage="markdown"
            title="Raw Markdown"
          />
          <EndLine />
        </div>
      ) : (
        <article ref={markdownContentRef} className="prose prose-lg dark:prose-invert max-w-none">
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

