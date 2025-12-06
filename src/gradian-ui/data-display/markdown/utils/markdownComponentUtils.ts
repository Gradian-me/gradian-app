import React from 'react';

/**
 * Extract programming language from className
 */
export function extractLanguage(className?: string | string[]): string {
  if (!className) return '';
  
  const classNameStr = Array.isArray(className) ? className.join(' ') : String(className);
  const match = /language-(\w+)/i.exec(classNameStr);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Extract language from node properties (fallback)
 */
export function extractLanguageFromNode(node: any): string {
  if (!node?.properties?.className) return '';
  
  const nodeMatch = /language-(\w+)/i.exec(
    Array.isArray(node.properties.className) 
      ? node.properties.className.join(' ')
      : String(node.properties.className)
  );
  return nodeMatch ? nodeMatch[1].toLowerCase() : '';
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

