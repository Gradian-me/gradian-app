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
}

/**
 * Search API response interface
 */
export interface SearchApiResponse {
  object: string;
  results: SearchResult[];
}

/**
 * Format search results in TOON format for appending to prompts
 */
export function formatSearchResultsToToon(results: SearchResult[]): string {
  if (!results || results.length === 0) {
    return '';
  }

  // Format each result as: [title] + snippet
  const formattedResults = results.map((result) => ({
    title: result.title || '',
    snippet: result.snippet || '',
    url: result.url || '',
    date: result.date || '',
  }));

  // Use TOON format with title and snippet fields
  const toonResult = formatToToon('search-results', formattedResults, ['title', 'snippet']);

  if (!toonResult) {
    // Fallback: manual formatting
    const parts = formattedResults.map((result) => {
      let formatted = `[${result.title}]`;
      if (result.snippet) {
        formatted += `\n${result.snippet}`;
      }
      return formatted;
    });
    return parts.join('\n\n---\n\n');
  }

  // Add divider between results
  return toonResult.replace(/\n\n/g, '\n\n---\n\n');
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

    // Performance: Use shared AbortController utility
    const { controller, timeoutId } = createAbortController(60000); // 60 seconds timeout

    try {
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

      // Get API key
      const apiKeyResult = getApiKey();
      if (!apiKeyResult.key) {
        return {
          success: false,
          error: apiKeyResult.error || 'LLM_API_KEY is not configured',
        };
      }

      // Call Search API
      const headers: HeadersInit = {
        Authorization: `Bearer ${apiKeyResult.key}`,
        'Content-Type': 'application/json',
      };

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

        return {
          success: false,
          error: sanitizeErrorMessage(errorMessage, isDevelopment),
        };
      }

      // Security: Use safe JSON parsing
      const responseText = await response.text();
      const parseResult = safeJsonParse(responseText);
      
      if (!parseResult.success || !parseResult.data) {
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
      const searchResults = data.results || [];

      if (!Array.isArray(searchResults) || searchResults.length === 0) {
        return {
          success: false,
          error: 'No search results returned',
        };
      }

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

      // Handle timeout errors
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        if (isDevelopment) {
          console.error('Request timeout in search API:', fetchError);
        }
        return {
          success: false,
          error: sanitizeErrorMessage('Request timeout', isDevelopment),
        };
      }

      throw fetchError;
    }
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

