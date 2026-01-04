'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkSlug from 'remark-slug';
import remarkAutolinkHeadings from 'remark-autolink-headings';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // KaTeX styles for math rendering
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { EndLine } from '@/gradian-ui/layout/end-line/components/EndLine';
import { createMarkdownComponents } from './MarkdownComponents';
import { MarkdownToolbox } from './MarkdownToolbox';
import { MarkdownNavigation } from './MarkdownNavigation';
import { MarkdownEditor } from './MarkdownEditor';
import { extractHeadings } from '../utils/headingExtractor';
import { useMarkdownScrollSpy } from '../hooks/useMarkdownScrollSpy';
import { MarkdownViewerProps } from '../types';
import { exportMarkdownToPdf } from '../utils/pdfExport';
import { ProfessionalWritingModal } from '@/gradian-ui/communication/professional-writing';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { usePrint } from '@/gradian-ui/shared/hooks/use-print';

/**
 * Clean markdown content by removing problematic nested markdown code blocks
 * Removes code blocks that contain markdown examples (```markdown) which cause nested markdown rendering issues
 * IMPORTANT: Only removes ```markdown blocks, preserves all other code blocks (mermaid, json, etc.)
 */
function cleanMarkdownContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return content;
  }

  let cleaned = content;

  // Remove all ```markdown code blocks (these cause nested markdown rendering issues)
  // Pattern: ```markdown followed by content and closing ```
  // Use non-greedy matching to ensure we only match complete markdown blocks
  cleaned = cleaned.replace(/```markdown\s*\n?([\s\S]*?)\n?```/gi, (match, innerContent) => {
    // Extract the content inside the code block and return it as plain text
    // This preserves the content but removes the problematic code block wrapper
    const text = innerContent.trim();
    // If it's empty, remove it entirely
    if (!text) {
      return '';
    }
    // Return the content as plain text (not in a code block)
    // Add a newline before and after to maintain spacing
    return `\n${text}\n`;
  });

  // Handle cases where ```markdown appears after mermaid diagrams or other sections
  // This pattern handles the specific case: mermaid diagram followed by markdown code block
  // Keep the mermaid diagram intact, only remove the markdown block
  cleaned = cleaned.replace(/```mermaid\s*\n?([\s\S]*?)\n?```\s*\n+```markdown\s*\n?([\s\S]*?)\n?```/gi, (match, mermaidContent, markdownContent) => {
    // Keep the mermaid diagram, remove the nested markdown block
    return `\`\`\`mermaid\n${mermaidContent}\n\`\`\``;
  });

  // Remove any excessive newlines that might have been created (more than 3 consecutive)
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

  return cleaned;
}

export function MarkdownViewer({ 
  content, 
  showToggle = true,
  isEditable = false,
  onChange,
  stickyHeadings = [],
  navigationHeadingLevels = [],
  onNavigationData,
  aiAgentId,
  showEndLine = true,
  enablePrint = false,
  printConfig,
  onPrint
}: MarkdownViewerProps) {
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'raw'>('preview');
  const [headings, setHeadings] = useState<Array<{ id: string; text: string; level: number }>>([]);
  const lastSentContentRef = useRef<string>(content);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  
  // Handle content changes from editor - immediately update store
  const handleContentChange = useCallback((newContent: string) => {
    // Track what we're sending to parent/store
    lastSentContentRef.current = newContent;
    // Immediately notify parent/store of changes
    onChange?.(newContent);
  }, [onChange]);
  
  // Always use content prop as source of truth (it should come from store)
  // Clean the content to remove problematic nested markdown code blocks
  // This ensures preview/raw modes always show the latest from store
  // When editing, onChange updates the store, which updates content prop, which flows back
  const displayContent = useMemo(() => {
    return cleanMarkdownContent(content);
  }, [content]);
  
  // Memoize navigationHeadingLevels array to prevent unnecessary re-renders
  const navigationLevelsKey = useMemo(() => {
    if (!navigationHeadingLevels || navigationHeadingLevels.length === 0) return '';
    return JSON.stringify([...navigationHeadingLevels].sort());
  }, [navigationHeadingLevels]);
  
  // Memoize content key to detect actual content changes
  const contentKey = useMemo(() => {
    return displayContent || '';
  }, [displayContent]);
  
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
          loggingCustom(LogType.CLIENT_LOG, 'log', `✅ Extracted headings: ${extracted.length} headings`);
          loggingCustom(LogType.CLIENT_LOG, 'log', `Extracted heading IDs: ${extracted.map(h => `#${h.id}`).join(', ')}`);
          
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
                loggingCustom(LogType.CLIENT_LOG, 'warn', `⚠️ Some heading IDs not found in DOM: ${missing.map(m => `#${m.id}`).join(', ')}`);
              } else {
                loggingCustom(LogType.CLIENT_LOG, 'log', '✅ All heading IDs found in DOM');
              }
            }
          }, 1000);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          loggingCustom(LogType.CLIENT_LOG, 'error', `❌ Error extracting headings: ${error instanceof Error ? error.message : String(error)}`);
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
    // Note: onNavigationData is tracked via ref in the previous useEffect, so we don't need it here
    // This keeps the dependency array size constant
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
    if (viewMode !== 'preview' || !displayContent) {
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
  }, [displayContent, viewMode]);

  // Create components with sticky headings configuration (memoized)
  const markdownComponents = useMemo(() => {
    const levels = stickyHeadingsKey ? JSON.parse(stickyHeadingsKey) : [];
    return createMarkdownComponents(levels, markdownLoadedTimestamp);
  }, [stickyHeadingsKey, markdownLoadedTimestamp]);

  // SECURITY: enforce safe link behavior (no reverse tabnabbing, reduced link abuse)
  const secureMarkdownComponents = useMemo(() => {
    const baseComponents = markdownComponents || {};

    return {
      ...baseComponents,
      a: (props: any) => {
        const { href, children, ...rest } = props || {};
        const BaseAnchor = (baseComponents as any).a || 'a';

        return (
          <BaseAnchor
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            {...rest}
          >
            {children}
          </BaseAnchor>
        );
      },
    };
  }, [markdownComponents]);

  // PDF export handler
  const handleExportPdf = useCallback(async () => {
    if (!markdownContentRef.current || viewMode !== 'preview') {
      return;
    }

    try {
      await exportMarkdownToPdf(markdownContentRef.current, {
        filename: `markdown-document-${Date.now()}.pdf`,
        title: 'Markdown Document',
      });
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `PDF export error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }, [viewMode]);

  // Print functionality
  const printOptions = useMemo(() => {
    if (!enablePrint || !printConfig) {
      return undefined;
    }
    return {
      title: printConfig.documentTitle || 'Markdown Document',
      header: printConfig,
    };
  }, [enablePrint, printConfig]);

  const { print: handlePrintInternal, isPrinting } = usePrint(
    markdownContentRef,
    enablePrint ? printOptions : undefined
  );

  const handlePrint = useCallback(async () => {
    if (viewMode !== 'preview' || !markdownContentRef.current) {
      return;
    }

    try {
      await handlePrintInternal();
      onPrint?.();
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Print error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }, [viewMode, handlePrintInternal, onPrint]);

  // AI agent handler
  const handleAiAgentClick = useCallback(() => {
    setIsAiModalOpen(true);
  }, []);

  const handleApplyEnhancedText = useCallback((enhancedText: string) => {
    onChange?.(enhancedText);
    setIsAiModalOpen(false);
  }, [onChange]);

  return (
    <div className="space-y-4">
      {showToggle && (
        <MarkdownToolbox 
          viewMode={viewMode} 
          onViewModeChange={setViewMode}
          onExportPdf={handleExportPdf}
          showPdfExport={true}
          onPrint={enablePrint ? handlePrint : undefined}
          showPrint={enablePrint}
          showEditor={isEditable}
          aiAgentId={aiAgentId}
          onAiAgentClick={handleAiAgentClick}
          hasContent={!!content && content.trim().length > 0}
        />
      )}

      {viewMode === 'editor' ? (
        <div className="my-4">
          <MarkdownEditor
            key="markdown-editor" // Stable key to preserve editor instance across mode switches
            content={content}
            onChange={handleContentChange}
            readOnly={false}
            className="w-full"
          />
          {showEndLine && <EndLine />}
        </div>
      ) : viewMode === 'raw' ? (
        <div className="my-4">
          <CodeViewer
            key={displayContent} // Force re-render when content changes
            code={displayContent}
            programmingLanguage="markdown"
            title="Raw Markdown"
          />
          {showEndLine && <EndLine />}
        </div>
      ) : (
        <article 
          ref={markdownContentRef} 
          dir="auto" 
          className="prose prose-lg dark:prose-invert max-w-none"
          key={displayContent} // Force re-render when content changes
        >
          <ReactMarkdown
            remarkPlugins={[
              remarkGfm,
              remarkSlug as any, // Type compatibility workaround
              remarkAutolinkHeadings as any, // Type compatibility workaround
              remarkMath // Support for math syntax - parses $...$ and $$...$$
            ]}
            rehypePlugins={[
              rehypeKatex // Render math with KaTeX - automatically converts math nodes to KaTeX HTML
            ]}
            components={secureMarkdownComponents}
            // SECURITY: Do not render raw HTML from markdown to prevent XSS
            skipHtml={true}
          >
            {displayContent}
          </ReactMarkdown>
          {showEndLine && <EndLine />}
        </article>
      )}
      {aiAgentId && (
        <ProfessionalWritingModal
          isOpen={isAiModalOpen}
          onOpenChange={setIsAiModalOpen}
          initialText={content || ''}
          onApply={handleApplyEnhancedText}
        />
      )}
    </div>
  );
}

MarkdownViewer.displayName = 'MarkdownViewer';

