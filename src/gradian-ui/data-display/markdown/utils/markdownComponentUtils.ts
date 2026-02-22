import React from 'react';

/**
 * Extract programming language from className
 */
export function extractLanguage(className?: string | string[]): string {
  if (!className) return '';
  
  const classNameStr = Array.isArray(className) ? className.join(' ') : String(className);
  // Match language-xxx pattern (case insensitive)
  const match = /language-(\w+)/i.exec(classNameStr);
  if (match) {
    return match[1].toLowerCase();
  }
  
  // Also check for direct language class (some parsers use just the language name)
  const directMatch = /\b(latex|math|katex|mermaid|cytoscape)\b/i.exec(classNameStr);
  if (directMatch) {
    return directMatch[1].toLowerCase();
  }
  
  return '';
}

/**
 * Extract language from node properties (fallback)
 */
export function extractLanguageFromNode(node: any): string {
  if (!node) return '';
  
  // Check className in properties
  if (node.properties?.className) {
    const classNameStr = Array.isArray(node.properties.className) 
      ? node.properties.className.join(' ')
      : String(node.properties.className);
    
    const nodeMatch = /language-(\w+)/i.exec(classNameStr);
    if (nodeMatch) {
      return nodeMatch[1].toLowerCase();
    }
    
    // Also check for direct language class
    const directMatch = /\b(latex|math|katex|mermaid|cytoscape)\b/i.exec(classNameStr);
    if (directMatch) {
      return directMatch[1].toLowerCase();
    }
  }
  
  // Check data.meta (some markdown parsers store language here)
  if (node.data?.meta) {
    const metaMatch = /language-(\w+)/i.exec(String(node.data.meta));
    if (metaMatch) {
      return metaMatch[1].toLowerCase();
    }
  }
  
  // Check lang property directly
  if (node.properties?.lang) {
    return String(node.properties.lang).toLowerCase();
  }
  
  return '';
}

/**
 * Get code content from children (handles string or array)
 */
export function getCodeContent(children: any): string {
  if (typeof children === 'string') {
    return children;
  }
  if (Array.isArray(children)) {
    return children.map((child: any) => 
      typeof child === 'string' ? child : String(child)
    ).join('');
  }
  return String(children);
}

/**
 * Check if a list is a task list by examining children
 */
export function isTaskList(children: React.ReactNode): boolean {
  return React.Children.toArray(children).some((child: any) => {
    if (React.isValidElement(child) && child.props && typeof child.props === 'object' && child.props !== null) {
      return 'checked' in child.props && child.props.checked !== null && child.props.checked !== undefined;
    }
    return false;
  });
}

/**
 * Check if children are empty (null, undefined, or only whitespace)
 */
export function isEmptyChildren(children: React.ReactNode): boolean {
  if (children === null || children === undefined) return true;
  if (typeof children === 'string') return children.trim() === '';
  if (Array.isArray(children)) {
    return children.length === 0 || children.every(child => isEmptyChildren(child));
  }
  if (React.isValidElement(children)) {
    const props = children.props as { children?: React.ReactNode };
    return isEmptyChildren(props?.children);
  }
  return false;
}

/**
 * Strip subgraph blocks from Mermaid diagram source.
 * Keeps nodes and edges inside subgraphs so the diagram renders as a flat flowchart/graph,
 * avoiding "Unable to render this Mermaid layout" errors caused by subgraph layout.
 */
export function stripMermaidSubgraphs(diagram: string): string {
  if (!diagram || typeof diagram !== 'string') return diagram;
  const lines = diagram.split(/\r?\n/);
  const out: string[] = [];
  let depth = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\s*subgraph\s/i.test(line)) {
      depth++;
      continue;
    }
    if (depth > 0 && /^\s*end\s*$/i.test(trimmed)) {
      depth--;
      continue;
    }
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

