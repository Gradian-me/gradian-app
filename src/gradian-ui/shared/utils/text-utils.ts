/**
 * Normalize arbitrary text by trimming, removing diacritics, collapsing whitespace,
 * and optionally lowercasing.
 */
export const cleanText = (input: string | null | undefined, options?: { lowercase?: boolean }): string => {
  if (!input) return '';
  const normalized = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  return options?.lowercase ? normalized.toLowerCase() : normalized;
};

const splitIntoWords = (input: string | null | undefined): string[] => {
  const cleaned = cleanText(input ?? '', { lowercase: true });
  if (!cleaned) return [];
  return cleaned
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .split(/[\s_-]+/)
    .filter(Boolean);
};

export const toKebabCase = (input: string | null | undefined): string =>
  splitIntoWords(input).join('-');

export const toSnakeCase = (input: string | null | undefined): string =>
  splitIntoWords(input).join('_');

export const toCamelCase = (input: string | null | undefined): string => {
  const words = splitIntoWords(input);
  if (words.length === 0) return '';
  return words
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join('');
};

export const toPascalCase = (input: string | null | undefined): string =>
  splitIntoWords(input)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

/**
 * Format JSON for markdown code blocks with proper indentation
 * Ensures consistent 2-space indentation and removes any formatting inconsistencies
 * Handles escaped JSON strings (strings containing \n, \", etc.)
 * 
 * @param data - Data to format (object, array, or JSON string)
 * @returns Properly formatted JSON string with 2-space indentation
 */
export function formatJsonForMarkdown(data: any): string {
  try {
    // If it's a string, check if it contains escaped JSON (like "{\n\"key\": \"value\"}")
    if (typeof data === 'string') {
      const trimmed = data.trim();
      
      // Check if it's an escaped JSON string (starts with " and contains \n or \" but not actual newlines)
      const isEscapedJsonString = trimmed.startsWith('"') && 
                                  trimmed.endsWith('"') && 
                                  (trimmed.includes('\\n') || trimmed.includes('\\"') || trimmed.includes('\\t')) && 
                                  !trimmed.includes('\n');
      
      if (isEscapedJsonString) {
        // This is a JSON-encoded string, parse it to get the actual JSON string
        try {
          const unescapedJsonString = JSON.parse(trimmed);
          // If the result is still a string, parse it again to get the object
          if (typeof unescapedJsonString === 'string') {
            try {
              const parsed = JSON.parse(unescapedJsonString);
              return JSON.stringify(parsed, null, 2);
            } catch {
              // If second parse fails, the string might not be JSON, return formatted first parse
              return JSON.stringify(unescapedJsonString, null, 2);
            }
          }
          // Otherwise, format the parsed object
          return JSON.stringify(unescapedJsonString, null, 2);
        } catch {
          // If parsing fails, it might not be valid JSON, return as-is
          return data;
        }
      } else {
        // Regular JSON string (not escaped), try to parse and format
        try {
          const parsed = JSON.parse(trimmed);
          return JSON.stringify(parsed, null, 2);
        } catch {
          // If parsing fails, it might be a template or invalid JSON, return as-is
          return data;
        }
      }
    }
    
    // If it's already an object/array, just format it
    return JSON.stringify(data, null, 2);
  } catch (error) {
    // If all parsing fails, return as string
    return String(data);
  }
}

export const ensureKebabCase = (input: string | null | undefined, fallbackPrefix = 'section'): string => {
  const result = toKebabCase(input);
  if (result) {
    return result;
  }
  return `${fallbackPrefix}-${Date.now()}`;
};

/**
 * Format data in TOON format
 * Example output:
 * users[3]{id,name,email}:
 *   1,Alice,alice@example.com
 *   2,Bob,bob@example.com
 *   3,Charlie,charlie@example.com
 * 
 * @param entityName - Name of the entity/collection (e.g., "users", "schemas")
 * @param data - Array of objects to format
 * @param fields - Array of field names to include in the format
 * @returns Formatted TOON string
 */
export const formatToToon = (
  entityName: string | null | undefined,
  data: any[],
  fields: string[]
): string => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return '';
  }

  if (!fields || fields.length === 0) {
    return '';
  }

  const cleanEntityName = cleanText(entityName || 'items');
  const count = data.length;
  const fieldsList = fields.join(',');
  
  // Build header: {entityName}[{count}]{field1,field2,...}:
  const header = `${cleanEntityName}[${count}]{${fieldsList}}:`;
  
  // Build rows: each row is comma-separated values
  const rows = data.map((item: any) => {
    const values = fields.map((field) => {
      const value = item?.[field];
      // Clean the value and handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }
      // Convert to string, clean, and replace commas with dashes to avoid conflicts
      return cleanText(String(value)).replace(/,/g, '-');
    });
    return `  ${values.join(',')}`;
  });
  
  return `${header}\n\n${rows.join('\n')}`;
};

/**
 * Formats a key name to a human-readable label
 * Examples:
 * - "nodeTypeId" -> "Node Type Id"
 * - "dateCreated" -> "Date Created"
 * - "riskLevel" -> "Risk Level"
 * - "top10ProductsPercent" -> "Top 10 Products Percent"
 * - "node_type_id" -> "Node Type Id"
 * - "node-type-id" -> "Node Type Id"
 */
export function formatKeyToLabel(key: string): string {
  if (!key) return '';
  
  // First, handle snake_case and kebab-case by replacing with spaces
  let processed = key.replace(/[_-]/g, ' ');
  
  // Split camelCase and PascalCase by detecting capital letters and numbers
  // Insert a space before capital letters and numbers (but not at the start)
  processed = processed.replace(/([a-z])([A-Z])/g, '$1 $2'); // camelCase: lowercase followed by uppercase
  processed = processed.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2'); // PascalCase: uppercase followed by uppercase+lowercase
  processed = processed.replace(/([a-zA-Z])(\d)/g, '$1 $2'); // Letter followed by number
  processed = processed.replace(/(\d)([a-zA-Z])/g, '$1 $2'); // Number followed by letter
  
  // Split by spaces and clean up
  const words = processed
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(word => word.toLowerCase());
  
  if (words.length === 0) return key;
  
  // Capitalize first letter of each word and join with spaces
  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formats a value for display in a card
 * Handles various types: strings, numbers, booleans, dates, arrays, objects, null, undefined
 * Returns formatted string for simple display, or returns special marker for complex types
 */
export function formatValueForDisplay(value: any): { display: string; isComplex: boolean } {
  if (value === null) return { display: '—', isComplex: false };
  if (value === undefined) return { display: '—', isComplex: false };
  
  if (typeof value === 'boolean') {
    return { display: value ? 'Yes' : 'No', isComplex: false };
  }
  
  if (typeof value === 'number') {
    // Format numbers with locale-aware formatting (e.g., 1000 -> 1,000)
    return { display: value.toLocaleString('en-US'), isComplex: false };
  }
  
  if (typeof value === 'string') {
    // Check if it's a date string (ISO format or common date formats)
    const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          // Format as readable date
          return { 
            display: date.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }), 
            isComplex: false 
          };
        }
      } catch {
        // Not a valid date, continue with string formatting
      }
    }
    
    // Empty string
    if (value.trim() === '') {
      return { display: '—', isComplex: false };
    }
    
    return { display: value, isComplex: false };
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) return { display: '—', isComplex: false };
    
    // Check if array contains complex objects
    const hasComplexItems = value.some(item => typeof item === 'object' && item !== null);
    if (hasComplexItems) {
      return { display: '', isComplex: true };
    }
    
    // Format simple array items
    const display = value.map(item => {
      if (item === null || item === undefined) return '—';
      return String(item);
    }).join(', ');
    
    return { display, isComplex: false };
  }
  
  if (typeof value === 'object') {
    // Objects are always complex
    return { display: '', isComplex: true };
  }
  
  return { display: String(value), isComplex: false };
}

/**
 * Convert Persian numerals to regular numbers in list markers
 * This ensures markdown parsers recognize list items correctly
 * Converts Persian numerals (۰-۹) to English numerals (0-9) in list markers
 * 
 * @param content - Markdown content that may contain Persian numerals in list markers
 * @returns Content with Persian numerals converted to English numerals in list markers
 */
export function convertPersianNumeralsInLists(content: string): string {
  if (!content || typeof content !== 'string') {
    return content;
  }

  // Map Persian numerals to regular numbers
  const persianToEnglish: Record<string, string> = {
    '۰': '0',
    '۱': '1',
    '۲': '2',
    '۳': '3',
    '۴': '4',
    '۵': '5',
    '۶': '6',
    '۷': '7',
    '۸': '8',
    '۹': '9',
  };

  // Convert Persian numerals in list markers (at start of line, followed by period and space)
  // Pattern: Start of line, optional whitespace, Persian numeral, period, space
  // This matches: "۱. ", "۲. ", etc.
  return content.replace(/^(\s*)([۰-۹]+)\.\s+/gm, (match, indent, persianNum) => {
    // Convert each Persian digit to English
    const englishNum = persianNum
      .split('')
      .map((digit: string) => persianToEnglish[digit] || digit)
      .join('');
    return `${indent}${englishNum}. `;
  });
}

/**
 * Text Utilities for Chat
 * Functions for extracting and processing hashtags and mentions
 */

/**
 * Extract hashtags from text (e.g., #hashtag, #my-tag)
 * Returns array of unique hashtag strings without the # symbol
 */
export function extractHashtags(text: string): string[] {
  if (!text) return [];
  
  // Match hashtags: # followed by alphanumeric characters, hyphens, and underscores
  // Exclude if preceded by a word character (to avoid matching in URLs like example.com#anchor)
  const hashtagRegex = /(?:^|\s)#([a-zA-Z0-9_-]+)/g;
  const matches = text.matchAll(hashtagRegex);
  const hashtags = new Set<string>();
  
  for (const match of matches) {
    if (match[1]) {
      hashtags.add(match[1].toLowerCase());
    }
  }
  
  return Array.from(hashtags);
}

/**
 * Extract mentions from text (e.g., @agent-id, @user)
 * Returns array of unique mention strings without the @ symbol
 */
export function extractMentions(text: string): string[] {
  if (!text) return [];
  
  // Match mentions: @ followed by alphanumeric characters, hyphens, and underscores
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  const matches = text.matchAll(mentionRegex);
  const mentions = new Set<string>();
  
  for (const match of matches) {
    if (match[1]) {
      mentions.add(match[1]);
    }
  }
  
  return Array.from(mentions);
}

/**
 * Process text to replace hashtags and mentions with styled HTML
 * Returns HTML string with styled hashtags and mentions
 */
export function processTextWithStyledHashtagsAndMentions(text: string): string {
  if (!text) return text;
  
  // Replace hashtags with styled spans
  let processed = text.replace(
    /(?:^|\s)(#([a-zA-Z0-9_-]+))/g,
    (match, fullMatch, hashtag) => {
      const prefix = match.startsWith(' ') ? ' ' : '';
      return `${prefix}<span class="hashtag-inline">#${hashtag}</span>`;
    }
  );
  
  // Replace mentions with styled spans
  processed = processed.replace(
    /@([a-zA-Z0-9_-]+)/g,
    (match, mention) => {
      return `<span class="mention-inline">@${mention}</span>`;
    }
  );
  
  return processed;
}

/**
 * Helper to check if a position in text is inside HTML tags
 */
function isInsideHtmlTag(text: string, position: number): boolean {
  const before = text.substring(0, position);
  const openTags = (before.match(/<[^/][^>]*>/g) || []).length;
  const closeTags = (before.match(/<\/[^>]+>/g) || []).length;
  return openTags > closeTags;
}

/**
 * Process text to replace markdown syntax, hashtags and mentions with styled HTML
 * Returns HTML string with styled markdown, hashtags and mentions
 */
export function processTextWithMarkdownHashtagsAndMentions(text: string): string {
  if (!text) return text;
  
  // Escape HTML to prevent XSS
  let processed = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Process markdown syntax in order of priority
  // 1. Code blocks with triple backticks first (highest priority)
  processed = processed.replace(
    /```([\s\S]*?)```/g,
    (match, code) => {
      return `<pre><code class="block-code">${code.trim()}</code></pre>`;
    }
  );
  
  // 2. Inline code with single backticks (after code blocks)
  processed = processed.replace(
    /`([^`]+)`/g,
    '<code class="inline-code">$1</code>'
  );
  
  // 3. Bold: **text** (before single * for italic)
  processed = processed.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong>$1</strong>'
  );
  
  // 4. Bold: __text__ (alternative syntax, but avoid matching single _)
  processed = processed.replace(
    /__([^_\n]+?)__/g,
    (match, content) => {
      // Only match if it's not already processed
      if (match.includes('<strong>') || match.includes('<code') || match.includes('<del>') || match.includes('<pre>')) {
        return match;
      }
      return `<strong>${content}</strong>`;
    }
  );
  
  // 5. Strikethrough: ~~text~~
  processed = processed.replace(
    /~~([^~]+)~~/g,
    '<del>$1</del>'
  );
  
  // 6. Italic: *text* (single asterisk, not part of **)
  processed = processed.replace(
    /([^*]|^)\*([^*\n]+?)\*([^*]|$)/g,
    (match, before, content, after) => {
      // Skip if already processed
      if (match.includes('<strong>') || match.includes('<code') || match.includes('<del>') || match.includes('<pre>')) {
        return match;
      }
      return `${before}<em>${content}</em>${after}`;
    }
  );
  
  // 7. Replace hashtags (after markdown to avoid conflicts)
  // Use matchAll to get positions
  const hashtagMatches: Array<{ match: string; index: number; hashtag: string; prefix: string }> = [];
  const hashtagRegex = /(?:^|\s)(#([a-zA-Z0-9_-]+))/g;
  let hashtagMatch;
  while ((hashtagMatch = hashtagRegex.exec(processed)) !== null) {
    const prefix = hashtagMatch[0].startsWith(' ') ? ' ' : '';
    hashtagMatches.push({
      match: hashtagMatch[0],
      index: hashtagMatch.index,
      hashtag: hashtagMatch[2],
      prefix,
    });
  }
  
  // Replace hashtags in reverse order to maintain indices
  for (let i = hashtagMatches.length - 1; i >= 0; i--) {
    const { match, index, hashtag, prefix } = hashtagMatches[i];
    if (!isInsideHtmlTag(processed, index)) {
      const replacement = `${prefix}<span class="hashtag-inline">#${hashtag}</span>`;
      processed = processed.substring(0, index) + replacement + processed.substring(index + match.length);
    }
  }
  
  // 8. Replace mentions (after markdown to avoid conflicts)
  const mentionMatches: Array<{ match: string; index: number; mention: string }> = [];
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  let mentionMatch;
  while ((mentionMatch = mentionRegex.exec(processed)) !== null) {
    mentionMatches.push({
      match: mentionMatch[0],
      index: mentionMatch.index,
      mention: mentionMatch[1],
    });
  }
  
  // Replace mentions in reverse order to maintain indices
  for (let i = mentionMatches.length - 1; i >= 0; i--) {
    const { match, index, mention } = mentionMatches[i];
    if (!isInsideHtmlTag(processed, index)) {
      const replacement = `<span class="mention-inline">@${mention}</span>`;
      processed = processed.substring(0, index) + replacement + processed.substring(index + match.length);
    }
  }
  
  // 9. Preserve line breaks
  processed = processed.replace(/\n/g, '<br>');
  
  return processed;
}

/**
 * Truncate text to a specified length and append truncation indicator
 * @param text - The text to truncate
 * @param maxLength - Maximum number of characters (default: 1000)
 * @param truncationIndicator - Text to append when truncated (default: "... (truncated)")
 * @returns Truncated text with indicator if text exceeds maxLength, otherwise original text
 * 
 * @example
 * truncateText("Very long text...", 10) // "Very long ... (truncated)"
 * truncateText("Short", 10) // "Short"
 */
export function truncateText(
  text: string,
  maxLength: number = 1000,
  truncationIndicator: string = '... (truncated)'
): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + truncationIndicator;
}
