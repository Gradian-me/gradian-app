import { unified } from 'unified';
import remarkParse from 'remark-parse';

/**
 * Extract all text from a node recursively (handles text, links, code, etc.)
 */
function extractTextFromNode(node: any): string {
  if (node.type === 'text') {
    return node.value || '';
  }
  
  if (node.children && Array.isArray(node.children)) {
    return node.children.map(extractTextFromNode).join('');
  }
  
  return '';
}

/**
 * Extract headings from markdown content using remark parser
 * @param content - Markdown content string
 * @param levels - Array of heading levels to extract (e.g., [1, 2] for h1 and h2)
 * @returns Array of heading objects with id, text, and level
 */
export async function extractHeadings(
  content: string,
  levels: number[] = [2]
): Promise<Array<{ id: string; text: string; level: number }>> {
  if (!content || typeof content !== 'string') {
    console.error('❌ extractHeadings: content is empty or not a string');
    return [];
  }

  try {
    // Parse markdown content
    const tree = unified()
      .use(remarkParse)
      .parse(content);
    
    const headings: Array<{ id: string; text: string; level: number }> = [];

    function walk(node: any, index = 0) {
      if (node.type === 'heading' && levels.includes(node.depth)) {
        // Extract all text from heading, including nested elements
        const text = extractTextFromNode(node);

        if (text) {
          // Generate ID using our own function (matches GitHub-style anchor generation)
          const id = generateHeadingId(text);

          headings.push({
            id,
            text,
            level: node.depth,
          });
        }
      }

      if (node.children) {
        node.children.forEach((child: any, childIndex: number) => walk(child, childIndex));
      }
    }

    walk(tree);

    return headings;
  } catch (error) {
    console.error('❌ Error parsing markdown:', error);
    return [];
  }
}

/**
 * Generate heading ID from text (matches GitHub-style anchor generation)
 */
export function generateHeadingId(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .trim();
}
