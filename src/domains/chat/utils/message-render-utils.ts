/**
 * Message Render Utilities
 * Unified functions to detect and extract data for different message render types
 */

import type { ChatMessage } from '../types';
import type { SearchResult } from '@/domains/ai-builder/utils/ai-search-utils';

export type MessageRenderType = 
  | 'search' 
  | 'image' 
  | 'video' 
  | 'graph' 
  | 'table' 
  | 'json' 
  | 'string' 
  | 'markdown';

export interface MessageRenderData {
  type: MessageRenderType;
  searchResults?: SearchResult[];
  imageData?: any;
  videoData?: any;
  graphData?: any;
  tableData?: any;
  jsonData?: any;
  stringData?: string;
  markdownData?: string;
}

/**
 * Parse content as JSON if possible
 */
function tryParseJson(content: string): any {
  if (!content || typeof content !== 'string') return null;
  
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * Extract search results from various locations in message
 */
function extractSearchResults(message: ChatMessage): SearchResult[] | null {
  // First, try metadata (preferred)
  if (message.metadata?.searchResults && Array.isArray(message.metadata.searchResults)) {
    return message.metadata.searchResults as SearchResult[];
  }

  // Try parsing from content
  if (message.content) {
    const parsed = tryParseJson(message.content);
    if (parsed) {
      // Check various possible structures
      if (Array.isArray(parsed)) {
        return parsed as SearchResult[];
      }
      if (parsed?.results && Array.isArray(parsed.results)) {
        return parsed.results as SearchResult[];
      }
      if (parsed?.data?.results && Array.isArray(parsed.data.results)) {
        return parsed.data.results as SearchResult[];
      }
      if (parsed?.searchResults && Array.isArray(parsed.searchResults)) {
        return parsed.searchResults as SearchResult[];
      }
      if (parsed?.data && Array.isArray(parsed.data)) {
        return parsed.data as SearchResult[];
      }
      if (parsed?.search?.results && Array.isArray(parsed.search.results)) {
        return parsed.search.results as SearchResult[];
      }
    }
  }

  return null;
}

/**
 * Check if message should render as search results
 */
function isSearchMessage(message: ChatMessage): boolean {
  if (message.role !== 'assistant') return false;
  
  const responseFormat = message.metadata?.responseFormat;
  const agentType = message.agentType;
  const agentId = message.agentId;
  
  return (
    responseFormat === 'search-card' ||
    responseFormat === 'search-results' ||
    agentType === 'search' ||
    agentId === 'search' ||
    message.metadata?.searchResults !== undefined ||
    extractSearchResults(message) !== null
  );
}

/**
 * Check if message should render as image
 */
function isImageMessage(message: ChatMessage, parsedContent: any): boolean {
  if (message.role !== 'assistant') return false;
  
  const responseFormat = message.metadata?.responseFormat;
  
  if (responseFormat === 'image') return true;
  
  // Check if parsed content has image structure
  if (parsedContent && typeof parsedContent === 'object') {
    return (
      parsedContent.image !== undefined ||
      parsedContent.url !== undefined && (
        parsedContent.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
        parsedContent.type === 'image'
      )
    );
  }
  
  return false;
}

/**
 * Check if message should render as video
 */
function isVideoMessage(message: ChatMessage, parsedContent: any): boolean {
  if (message.role !== 'assistant') return false;
  
  const responseFormat = message.metadata?.responseFormat;
  
  if (responseFormat === 'video') return true;
  
  // Check if parsed content has video structure
  if (parsedContent && typeof parsedContent === 'object') {
    return (
      parsedContent.video !== undefined ||
      parsedContent.url !== undefined && (
        parsedContent.url.match(/\.(mp4|webm|ogg|mov)$/i) ||
        parsedContent.type === 'video'
      )
    );
  }
  
  return false;
}

/**
 * Check if message should render as graph
 */
function isGraphMessage(message: ChatMessage, parsedContent: any): boolean {
  if (message.role !== 'assistant') return false;
  
  const responseFormat = message.metadata?.responseFormat;
  
  if (responseFormat === 'graph') return true;
  
  // Check if parsed content has graph structure
  if (parsedContent && typeof parsedContent === 'object') {
    return (
      parsedContent.graph !== undefined ||
      parsedContent.nodes !== undefined ||
      parsedContent.edges !== undefined ||
      parsedContent.type === 'graph'
    );
  }
  
  return false;
}

/**
 * Check if message should render as table
 */
function isTableMessage(message: ChatMessage, parsedContent: any): boolean {
  if (message.role !== 'assistant') return false;
  
  const responseFormat = message.metadata?.responseFormat;
  
  if (responseFormat === 'table') return true;
  
  // Check if parsed content has table structure
  if (parsedContent && typeof parsedContent === 'object') {
    return (
      parsedContent.table !== undefined ||
      (Array.isArray(parsedContent) && parsedContent.length > 0 && typeof parsedContent[0] === 'object') ||
      (parsedContent.data && Array.isArray(parsedContent.data) && parsedContent.data.length > 0)
    );
  }
  
  return false;
}

/**
 * Check if message should render as JSON
 */
function isJsonMessage(message: ChatMessage, parsedContent: any): boolean {
  if (message.role !== 'assistant') return false;
  
  const responseFormat = message.metadata?.responseFormat;
  
  if (responseFormat === 'json') return true;
  
  // If we have parsed JSON content that's not a string, render as JSON
  if (parsedContent && typeof parsedContent === 'object' && !Array.isArray(parsedContent)) {
    // Exclude already handled types
    if (
      !isImageMessage(message, parsedContent) &&
      !isVideoMessage(message, parsedContent) &&
      !isGraphMessage(message, parsedContent) &&
      !isTableMessage(message, parsedContent)
    ) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if message should render as string (formatted string output)
 */
function isStringMessage(message: ChatMessage): boolean {
  if (message.role !== 'assistant') return false;
  
  const responseFormat = message.metadata?.responseFormat;
  return responseFormat === 'string';
}

/**
 * Unified function to detect message render type and extract data
 */
export function detectMessageRenderType(message: ChatMessage): MessageRenderData {
  // Parse content once
  const parsedContent = tryParseJson(message.content || '');
  
  // Check search first (highest priority)
  if (isSearchMessage(message)) {
    const searchResults = extractSearchResults(message);
    if (searchResults && searchResults.length > 0) {
      return {
        type: 'search',
        searchResults,
      };
    }
  }
  
  // Check image
  if (isImageMessage(message, parsedContent)) {
    let imageData: any = null;
    
    if (parsedContent) {
      if (typeof parsedContent === 'object' && parsedContent.image) {
        imageData = parsedContent.image;
      } else if (typeof parsedContent === 'object' && (parsedContent.url || parsedContent.b64_json)) {
        imageData = parsedContent;
      } else {
        imageData = parsedContent;
      }
    } else if (message.content) {
      // Try to parse as JSON, otherwise treat as URL
      const tryParsed = tryParseJson(message.content);
      if (tryParsed && typeof tryParsed === 'object') {
        imageData = tryParsed.image || tryParsed;
      } else {
        imageData = { url: message.content };
      }
    }
    
    return {
      type: 'image',
      imageData,
    };
  }
  
  // Check video
  if (isVideoMessage(message, parsedContent)) {
    return {
      type: 'video',
      videoData: parsedContent || message.content,
    };
  }
  
  // Check graph
  if (isGraphMessage(message, parsedContent)) {
    return {
      type: 'graph',
      graphData: parsedContent || message.content,
    };
  }
  
  // Check table
  if (isTableMessage(message, parsedContent)) {
    return {
      type: 'table',
      tableData: parsedContent || message.content,
    };
  }
  
  // Check JSON
  if (isJsonMessage(message, parsedContent)) {
    return {
      type: 'json',
      jsonData: parsedContent || message.content,
    };
  }
  
  // Check string format
  if (isStringMessage(message)) {
    return {
      type: 'string',
      stringData: typeof parsedContent === 'string' ? parsedContent : message.content || '',
    };
  }
  
  // Default to markdown
  return {
    type: 'markdown',
    markdownData: message.content || '',
  };
}

