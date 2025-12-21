'use client';

import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { MermaidDiagramSimple } from '../MermaidDiagramSimple';
import { GraphViewer } from '@/domains/graph-designer/components/GraphViewer';
import { extractLanguage, extractLanguageFromNode, getCodeContent } from '../../utils/markdownComponentUtils';
import { sanitizeHtml } from '@/gradian-ui/shared/utils/html-sanitizer';
import type { GraphNodeData, GraphEdgeData, GraphRecord } from '@/domains/graph-designer/types';

export interface CodeComponentProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children: any;
  markdownLoadedTimestamp?: number;
  [key: string]: any;
}

export function CodeComponent({ 
  node, 
  inline, 
  className, 
  children, 
  markdownLoadedTimestamp,
  ...props 
}: CodeComponentProps) {
  // Extract language from className
  let language = extractLanguage(className);
  
  // Fallback: try to get language from node properties
  if (!language) {
    language = extractLanguageFromNode(node);
  }
  
  const codeContent = getCodeContent(children);
  
  // Normalize language for case-insensitive matching
  const normalizedLanguage = language?.toLowerCase();
  
  // Render LaTeX/Math code blocks with KaTeX
  if (normalizedLanguage === 'latex' || normalizedLanguage === 'math' || normalizedLanguage === 'katex') {
    const mathContent = codeContent.trim();
    if (!mathContent) {
      return null;
    }
    
    let html: string;
    try {
      // Render with KaTeX
      html = katex.renderToString(mathContent, {
        throwOnError: false,
        displayMode: !inline, // Block mode for code blocks, inline for inline code
      });
    } catch (error) {
      // If KaTeX rendering fails, fall back to code display
      console.warn('KaTeX rendering error:', error);
      if (!inline && language) {
        return (
          <div className="my-4">
            <CodeViewer
              code={codeContent.replace(/\n$/, '')}
              programmingLanguage={language}
              title={language}
            />
          </div>
        );
      }
      return null;
    }
    
    // SECURITY: dangerouslySetInnerHTML is safe here because:
    // 1. KaTeX library sanitizes all output HTML to prevent XSS
    // 2. Input is validated math content from markdown code blocks (not user input)
    // 3. KaTeX only generates safe SVG/HTML markup for mathematical notation
    // 4. Additional sanitization with DOMPurify for defense in depth
    const sanitizedHtml = sanitizeHtml(html, {
      tags: ['span', 'math', 'mi', 'mo', 'mn', 'mtext', 'mspace', 'ms', 'mfrac', 'msqrt', 'mroot', 'mstyle', 'merror', 'mpadded', 'mphantom', 'mfenced', 'menclose', 'msub', 'msup', 'msubsup', 'munder', 'mover', 'munderover', 'mmultiscripts', 'mtable', 'mlabeledtr', 'mtr', 'mtd', 'maligngroup', 'malignmark', 'mgroup', 'mrow', 'maction'],
      attributes: ['class', 'style', 'data-*']
    });
    if (inline) {
      // Inline math
      return (
        <span 
          className="katex-inline"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      );
    } else {
      // Block math
      return (
        <div 
          className="my-4 katex-display"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      );
    }
  }
  
  // Render Mermaid diagrams (case-insensitive check)
  if (!inline && normalizedLanguage === 'mermaid') {
    const diagram = codeContent.replace(/\n$/, '').trim();
    if (diagram) {
      return (
        <div className="my-6">
          <MermaidDiagramSimple 
            diagram={diagram} 
            markdownLoadedTimestamp={markdownLoadedTimestamp} 
          />
        </div>
      );
    }
  }
  
  // Render Cytoscape graphs (case-insensitive check for 'cytoscape' or 'cytoscape json')
  if (!inline && (normalizedLanguage === 'cytoscape' || normalizedLanguage === 'cytoscape json')) {
    const jsonContent = codeContent.replace(/\n$/, '').trim();
    if (jsonContent) {
      // Parse JSON and prepare data outside of JSX construction
      let graphData: { nodes: GraphNodeData[]; edges: GraphEdgeData[] } | GraphRecord | null = null;
      let parseError: string | null = null;
      
      try {
        const parsed = JSON.parse(jsonContent);
        
        // Check if it's a full GraphRecord or just {nodes, edges}
        if (parsed.nodes && Array.isArray(parsed.nodes) && parsed.edges && Array.isArray(parsed.edges)) {
          // It's either {nodes, edges} or full GraphRecord
          if ('id' in parsed && 'createdAt' in parsed) {
            // Full GraphRecord
            graphData = parsed as GraphRecord;
          } else {
            // Just {nodes, edges}
            graphData = {
              nodes: parsed.nodes as GraphNodeData[],
              edges: parsed.edges as GraphEdgeData[],
            };
          }
        } else {
          // Invalid format
          parseError = 'Invalid graph data format. Expected { nodes: [], edges: [] } or a full GraphRecord.';
        }
      } catch (error) {
        // JSON parsing error
        parseError = `Failed to parse graph JSON: ${error instanceof Error ? error.message : 'Invalid JSON'}`;
      }
      
      // Construct JSX outside of try/catch
      if (parseError) {
        return (
          <div className="my-4 p-4 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-200">
              {parseError}
            </p>
          </div>
        );
      }
      
      if (graphData) {
        return (
          <div className="my-6">
            <GraphViewer data={graphData} />
          </div>
        );
      }
    }
  }
  
  // Render code blocks with CodeViewer
  if (!inline && language) {
    const content = codeContent.replace(/\n$/, '');
    return (
      <div className="my-4">
        <CodeViewer
          code={content}
          programmingLanguage={language}
          title={language}
        />
      </div>
    );
  }
  
  // Render inline code
  return (
    <code 
      className="bg-gray-100 dark:bg-gray-700/50 dark:border dark:border-gray-600/50 px-1.5 py-0.5 rounded text-sm font-mono text-gray-900 dark:text-gray-100 dark:shadow-sm" 
      {...props}
    >
      {children}
    </code>
  );
}

