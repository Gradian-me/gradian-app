/**
 * AI Search Utilities
 * Handles search requests and formatting
 */

import { AgentRequestData, AgentResponse } from './ai-agent-utils';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import {
  sanitizePrompt,
  getApiKey,
  sanitizeErrorMessage,
  safeJsonParse,
} from './ai-security-utils';
import {
  createAbortController,
  parseErrorResponse,
  buildTimingInfo,
  validateAgentConfig,
} from './ai-common-utils';
import { getApiUrlForAgentType } from './ai-agent-url';
import { formatToToon } from '@/gradian-ui/shared/utils/text-utils';

/**
 * Search result interface
 */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  date?: string;
  source_host?: string; // Extracted from URL
  source_title?: string; // Same as title, for consistency
  source_link?: string; // Same as url, for consistency
}

/**
 * Search API response interface
 */
export interface SearchApiResponse {
  object: string;
  results: SearchResult[];
}

const MAX_SNIPPET_LENGTH = 1200;

/**
 * Normalize noisy crawler snippets so cards stay readable.
 * - Removes markdown links and decorative bullets.
 * - Collapses excessive whitespace/newlines.
 * - Trims repetitive nav/footer noise and caps length.
 */
function normalizeSearchSnippet(snippet: string): string {
  if (!snippet || typeof snippet !== 'string') return '';

  let cleaned = snippet;

  // Convert markdown links to plain text labels.
  cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

  // Remove empty/ornamental bullet-only lines.
  cleaned = cleaned.replace(/^\s*[*•-]\s*$/gm, '');

  // Collapse huge whitespace blocks while keeping paragraph breaks.
  cleaned = cleaned
    .replace(/\r/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Remove common footer/nav boilerplate tails.
  cleaned = cleaned
    .replace(/All rights reserved[\s\S]*$/i, '')
    .replace(/AP News Code of Conduct[\s\S]*$/i, '')
    .replace(/Privacy \/ Do Not Sell My Info[\s\S]*$/i, '')
    .trim();

  if (cleaned.length <= MAX_SNIPPET_LENGTH) return cleaned;
  return `${cleaned.slice(0, MAX_SNIPPET_LENGTH).trimEnd()}...`;
}

/**
 * Extract host from URL
 */
function extractHostFromUrl(url: string): string {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    // If URL parsing fails, try to extract hostname manually
    const match = url.match(/https?:\/\/(?:www\.)?([^\/]+)/);
    return match ? match[1] : '';
  }
}

/**
 * Format search results in TOON format for appending to prompts
 */
export function formatSearchResultsToToon(results: SearchResult[]): string {
  if (!results || results.length === 0) {
    return '';
  }

  // Format each result with source_host, source_title, source_link, and snippet
  const formattedResults = results.map((result) => {
    const sourceHost = result.source_host || extractHostFromUrl(result.url || '');
    const sourceTitle = result.source_title || result.title || '';
    const sourceLink = result.source_link || result.url || '';
    
    return {
      source_host: sourceHost,
      source_title: sourceTitle,
      source_link: sourceLink,
      snippet: result.snippet || '',
      title: result.title || '', // Keep for backward compatibility
      url: result.url || '', // Keep for backward compatibility
      date: result.date || '',
    };
  });

  // Use TOON format with source_host, source_title, source_link, and snippet fields
  const toonResult = formatToToon('search-results', formattedResults, ['source_host', 'source_title', 'source_link', 'snippet']);

  if (!toonResult) {
    // Fallback: manual formatting
    const parts = formattedResults.map((result) => {
      let formatted = `**${result.source_title}**\n`;
      if (result.source_host) {
        formatted += `Source: ${result.source_host}\n`;
      }
      if (result.source_link) {
        formatted += `Link: ${result.source_link}\n`;
      }
      if (result.snippet) {
        formatted += `\n${result.snippet}`;
      }
      return formatted;
    });
    return parts.join('\n\n---\n\n');
  }

  // Add title and divider before search results
  const title = '## Search Results\n\n';
  const divider = '\n\n---\n\n';
  
  return title + toonResult.replace(/\n\n/g, divider);
}

/**
 * Check if an error is a retryable timeout/connection error
 */
function isRetryableError(error: any): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  // Check for AbortController timeout
  if (error.name === 'AbortError') {
    return true;
  }

  // Check for connection timeout errors (UND_ERR_CONNECT_TIMEOUT)
  const errorCode = (error as any).code;
  const errorCause = (error as any).cause;
  const causeCode = errorCause?.code;
  const causeName = errorCause?.name;
  const errorMessage = error.message?.toLowerCase() || '';
  
  const isConnectionTimeout = 
    errorCode === 'UND_ERR_CONNECT_TIMEOUT' ||
    errorCode === 'ETIMEDOUT' ||
    causeCode === 'UND_ERR_CONNECT_TIMEOUT' ||
    causeName === 'ConnectTimeoutError' ||
    errorMessage.includes('connect timeout') ||
    errorMessage.includes('connection timeout') ||
    (errorMessage.includes('fetch failed') && (
      causeCode === 'UND_ERR_CONNECT_TIMEOUT' ||
      causeName === 'ConnectTimeoutError'
    ));

  return isConnectionTimeout;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process search request
 */
export async function processSearchRequest(
  agent: any,
  requestData: AgentRequestData
): Promise<AgentResponse> {
  const isDevelopment = process.env.NODE_ENV === 'development';

  try {
    // Security: Validate agent configuration
    const agentValidation = validateAgentConfig(agent);
    if (!agentValidation.valid) {
      return {
        success: false,
        error: agentValidation.error || 'Invalid agent configuration',
      };
    }

    // Extract search parameters
    const query = requestData.userPrompt || requestData.prompt || '';
    const searchToolName = requestData.body?.search_tool_name || 'parallel_ai-search';
    const maxResults = requestData.body?.max_results || 5;

    // Security: Sanitize and validate query
    if (!query || typeof query !== 'string') {
      return {
        success: false,
        error: 'Query is required and must be a string',
      };
    }

    const sanitizedQuery = sanitizePrompt(query);
    if (!sanitizedQuery) {
      return {
        success: false,
        error: 'Query cannot be empty after sanitization',
      };
    }

    // Security: Validate search_tool_name
    const allowedSearchTools = ['parallel_ai-search', 'perplexity-search', 'parallel_ai-search-pro'];
    if (!allowedSearchTools.includes(searchToolName)) {
      return {
        success: false,
        error: `Invalid search_tool_name. Allowed values: ${allowedSearchTools.join(', ')}`,
      };
    }

    // Security: Validate max_results (reasonable limit: 1-20)
    const maxResultsNum = typeof maxResults === 'number' ? maxResults : parseInt(String(maxResults), 10);
    if (isNaN(maxResultsNum) || maxResultsNum < 1 || maxResultsNum > 20) {
      return {
        success: false,
        error: 'max_results must be a number between 1 and 20',
      };
    }

    // Get base search API URL and construct URL with search_tool_name in path
    const baseSearchUrl = getApiUrlForAgentType('search');
    const searchApiUrl = `${baseSearchUrl}/${searchToolName}`;

    // Track timing
    const startTime = Date.now();

    // Get API key
    const apiKeyResult = getApiKey();
    if (!apiKeyResult.key) {
      return {
        success: false,
        error: apiKeyResult.error || 'LLM_API_KEY is not configured',
      };
    }

    // Build request body (without search_tool_name, as it's in the URL)
    const requestBody = {
      query: sanitizedQuery,
      max_results: maxResultsNum,
    };

    // Log request body
    loggingCustom(
      LogType.AI_BODY_LOG,
      'info',
      `Search Request to ${searchApiUrl}: ${JSON.stringify(requestBody, null, 2)}`
    );

    // Call Search API with retry logic
    const headers: HeadersInit = {
      Authorization: `Bearer ${apiKeyResult.key}`,
      'Content-Type': 'application/json',
    };

    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Performance: Use shared AbortController utility for each attempt
      const { controller, timeoutId } = createAbortController(60000); // 60 seconds timeout

      try {
        if (attempt > 0) {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          if (isDevelopment) {
            loggingCustom(
              LogType.AI_BODY_LOG,
              'info',
              `Search API retry attempt ${attempt}/${maxRetries} after ${delayMs}ms delay`
            );
          }
          await sleep(delayMs);
        }

        const response = await fetch(searchApiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Security: Use shared error parsing utility
          const errorMessage = await parseErrorResponse(response);
          
          if (isDevelopment) {
            console.error('Search API error:', errorMessage);
          }

          // Don't retry on non-timeout HTTP errors
          return {
            success: false,
            error: sanitizeErrorMessage(errorMessage, isDevelopment),
          };
        }

        // Security: Use safe JSON parsing
        const responseText = await response.text();
        const parseResult = safeJsonParse(responseText);
        
        if (!parseResult.success || !parseResult.data) {
          // Don't retry on parsing errors
          return {
            success: false,
            error: parseResult.error || 'Invalid response format from search service',
          };
        }

        const data = parseResult.data as SearchApiResponse;

        // Log the response structure in development for debugging
        if (isDevelopment) {
          console.log('Search API response structure:', JSON.stringify(data, null, 2).substring(0, 1000));
        }

        // Extract search results
        const rawSearchResults = data.results || [];

        if (!Array.isArray(rawSearchResults) || rawSearchResults.length === 0) {
          // Don't retry on empty results
          return {
            success: false,
            error: 'No search results returned',
          };
        }

        // Enrich search results with source metadata
        const searchResults: SearchResult[] = rawSearchResults.map((result) => ({
          ...result,
          snippet: normalizeSearchSnippet(result.snippet || ''),
          source_host: result.source_host || extractHostFromUrl(result.url || ''),
          source_title: result.source_title || result.title || '',
          source_link: result.source_link || result.url || '',
        }));

        // Format search results in TOON format
        const toonFormatted = formatSearchResultsToToon(searchResults);

        // Performance: Use shared timing utility
        const timing = buildTimingInfo(startTime);

        // Format response data for AiBuilderResponseData structure
        const responseData = {
          search: {
            results: searchResults,
            query: sanitizedQuery,
            search_tool_name: searchToolName,
            max_results: maxResultsNum,
          },
          toonFormatted, // Formatted results for appending to prompts
          timing,
        };

        return {
          success: true,
          data: {
            response: JSON.stringify(searchResults, null, 2), // Return search results as JSON string
            format: 'search-card' as const, // Use search-card format for card-based search results
            tokenUsage: null, // Search doesn't use tokens
            timing,
            agent: {
              id: agent.id,
              label: agent.label,
              description: agent.description,
              requiredOutputFormat: 'search-card' as const, // Search card format
              nextAction: agent.nextAction,
            },
            searchResults: searchResults, // Pass raw results for component rendering
          },
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        lastError = fetchError;

        // Check if this is a retryable error
        if (isRetryableError(fetchError)) {
          if (attempt < maxRetries) {
            // Will retry in next iteration
            if (isDevelopment) {
              loggingCustom(
                LogType.AI_BODY_LOG,
                'warn',
                `Search API timeout/connection error (attempt ${attempt + 1}/${maxRetries + 1}), will retry: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
              );
            }
            continue; // Retry
          } else {
            // Max retries reached
            if (isDevelopment) {
              console.error('Search API timeout after all retries:', fetchError);
            }
            return {
              success: false,
              error: sanitizeErrorMessage('Connection timeout - unable to reach search service after multiple attempts. Please try again later.', isDevelopment),
            };
          }
        } else {
          // Non-retryable error, return immediately
          if (fetchError instanceof Error) {
            // Check for other connection errors (but not timeout-related)
            const errorMessage = fetchError.message?.toLowerCase() || '';
            if (errorMessage.includes('fetch failed')) {
              if (isDevelopment) {
                console.error('Network error in search API:', fetchError);
              }
              return {
                success: false,
                error: sanitizeErrorMessage('Network error - unable to connect to search service. Please check your connection and try again.', isDevelopment),
              };
            }
          }

          // For other errors, return them instead of throwing
          if (isDevelopment) {
            console.error('Error in search request:', fetchError);
          }
          return {
            success: false,
            error: sanitizeErrorMessage(fetchError, isDevelopment),
          };
        }
      }
    }

    // This should never be reached as all paths in the loop return
    // But TypeScript requires a return here
    return {
      success: false,
      error: sanitizeErrorMessage(
        lastError ? 
          (lastError instanceof Error ? lastError.message : String(lastError)) : 
          'Unexpected error in search request',
        isDevelopment
      ),
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('Error in search request:', error);
    }
    return {
      success: false,
      error: sanitizeErrorMessage(error, isDevelopment),
    };
  }
}

