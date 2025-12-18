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

