/**
 * Rehype plugin to wrap KaTeX math elements with dir="ltr" to ensure
 * formulas render left-to-right even in RTL text contexts
 */
import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

function hasKatexClass(node: Element): boolean {
  if (!node.properties || !node.properties.className) {
    return false;
  }
  
  const className = node.properties.className;
  
  // Handle array of class names
  if (Array.isArray(className)) {
    return className.some((cls: any) => 
      typeof cls === 'string' && cls.includes('katex')
    );
  }
  
  // Handle string class name
  if (typeof className === 'string') {
    return className.includes('katex');
  }
  
  return false;
}

export function rehypeKatexLtr() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      // Check if this is a KaTeX element (has class "katex")
      if (node.type === 'element' && hasKatexClass(node)) {
        // Check if already wrapped (avoid double wrapping)
        if (parent && typeof index === 'number') {
          const parentElement = parent as Element;
          if (parentElement.type === 'element' && 
              parentElement.properties?.dir === 'ltr') {
            return; // Already wrapped
          }
        }
        
        // Wrap the KaTeX element with a span that has dir="ltr"
        const wrapper: Element = {
          type: 'element',
          tagName: 'span',
          properties: {
            dir: 'ltr',
            style: node.tagName === 'span' ? 'display: inline-block;' : undefined
          },
          children: [node]
        };

        // Replace the original node with the wrapper
        if (parent && typeof index === 'number' && Array.isArray(parent.children)) {
          parent.children[index] = wrapper;
        }
      }
    });
  };
}
