'use client';

import React from 'react';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { MermaidDiagramSimple } from '../MermaidDiagramSimple';
import { extractLanguage, extractLanguageFromNode, getCodeContent } from '../../utils/markdownComponentUtils';

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
  
  // Render Mermaid diagrams (case-insensitive check)
  if (!inline && language === 'mermaid') {
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

