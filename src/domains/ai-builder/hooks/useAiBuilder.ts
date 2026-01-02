/**
 * AI Builder Hook
 * React hook for managing AI builder functionality
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import type { AiAgent, AiBuilderResponseData, GeneratePromptRequest, TokenUsage, VideoUsage, PreloadRouteResult } from '../types';
import { useAiPrompts } from '@/domains/ai-prompts/hooks/useAiPrompts';
import { useUserStore } from '@/stores/user.store';
import { useTenantStore } from '@/stores/tenant.store';
import {
  extractDataByPath,
  formatPreloadRouteResult,
  type PreloadRoute,
} from '@/gradian-ui/shared/utils/preload-routes';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { truncateText } from '@/domains/chat/utils/text-utils';
import { formatSearchResultsToToon, type SearchResult } from '../utils/ai-search-utils';
import { summarizePrompt } from '../utils/ai-summarization-utils';

/**
 * Extract organization RAG data from preloaded context
 * @param preloadedContext - The full preloaded context string
 * @returns Organization RAG section if found, empty string otherwise
 */
function extractOrganizationRagFromPreloadedContext(preloadedContext: string): string {
  if (!preloadedContext || !preloadedContext.trim()) {
    return '';
  }

  // Look for the organization RAG section in preloaded context
  // It should be formatted as: "## Organizational RAG Data\n..."
  const orgRagMatch = preloadedContext.match(/##\s+Organizational\s+RAG\s+Data[\s\S]*?(?=##\s+\w+|$)/i);
  if (orgRagMatch) {
    return orgRagMatch[0].trim();
  }

  // Also check for "## Preloaded Context Data" section that might contain org RAG
  const preloadMatch = preloadedContext.match(/##\s+Preloaded\s+Context\s+Data[\s\S]*?##\s+Organizational\s+RAG\s+Data[\s\S]*?(?=##\s+\w+|$)/i);
  if (preloadMatch) {
    const orgRagInPreload = preloadMatch[0].match(/##\s+Organizational\s+RAG\s+Data[\s\S]*?(?=##\s+\w+|$)/i);
    if (orgRagInPreload) {
      return orgRagInPreload[0].trim();
    }
  }

  return '';
}

interface UseAiBuilderReturn {
  userPrompt: string;
  setUserPrompt: (prompt: string) => void;
  aiResponse: string;
  tokenUsage: TokenUsage | null;
  videoUsage: VideoUsage | null;
  duration: number | null;
  isLoading: boolean;
  isApproving: boolean;
  error: string | null;
  successMessage: string | null;
  preloadedContext: string;
  isLoadingPreload: boolean;
  imageResponse: string | null;
  imageError: string | null;
  graphWarnings: string[]; // Warnings for graph validation issues
  searchResults: any[] | null; // Search results for display
  searchError: string | null; // Search error
  searchDuration: number | null; // Search duration in milliseconds
  searchUsage: { cost: number; tool: string } | null; // Search usage (cost and tool)
  summarizedPrompt: string | null; // Summarized version of the prompt (for search/image)
  generateResponse: (request: GeneratePromptRequest) => Promise<void>;
  stopGeneration: () => void;
  approveResponse: (response: string, agent: AiAgent) => Promise<void>;
  loadPreloadRoutes: (agent: AiAgent) => Promise<void>;
  clearResponse: () => void;
  clearError: () => void;
  clearSuccessMessage: () => void;
  lastPromptId: string | null; // ID of the last saved prompt
}

/**
 * Hook to manage AI builder state and operations
 */
export function useAiBuilder(): UseAiBuilderReturn {
  const tenantId = useTenantStore((state) => state.getTenantId());
  const isDevelopment = process.env.NODE_ENV === 'development';
  const [userPrompt, setUserPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [videoUsage, setVideoUsage] = useState<VideoUsage | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [preloadedContext, setPreloadedContext] = useState('');
  const [isLoadingPreload, setIsLoadingPreload] = useState(false);
  const [imageResponse, setImageResponse] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [graphWarnings, setGraphWarnings] = useState<string[]>([]);
  const [lastPromptId, setLastPromptId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchDuration, setSearchDuration] = useState<number | null>(null);
  const [searchUsage, setSearchUsage] = useState<{ cost: number; tool: string } | null>(null);
  const [summarizedPrompt, setSummarizedPrompt] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const user = useUserStore((state) => state.user);
  const { createPrompt } = useAiPrompts(undefined, { autoFetch: false });

  const loadPreloadRoutes = useCallback(async (agent: AiAgent) => {
    if (!agent.preloadRoutes || !Array.isArray(agent.preloadRoutes) || agent.preloadRoutes.length === 0) {
      setPreloadedContext('');
      return;
    }

    setIsLoadingPreload(true);
    try {
      const baseUrl = window.location.origin;
      const results = await Promise.all(
        agent.preloadRoutes.map(async (route: any): Promise<PreloadRouteResult> => {
          try {
            const method = route.method || 'GET';
            let routePath = route.route;

            // Build URL with query parameters for GET requests
            if (method === 'GET' && route.queryParameters) {
              const [path, existingQuery] = routePath.split('?');
              const searchParams = new URLSearchParams(existingQuery || '');
              Object.entries(route.queryParameters).forEach(([key, value]) => {
                searchParams.set(key, value as string);
              });
              const queryString = searchParams.toString();
              routePath = queryString ? `${path}?${queryString}` : path;
            }

            // Enforce same-origin: allow absolute URLs only when matching current origin
            let fullUrl: string;
            if (routePath.startsWith('http')) {
              const parsed = new URL(routePath);
              if (parsed.origin !== baseUrl) {
                return {
                  route: route.route,
                  title: route.title,
                  description: route.description,
                  success: false,
                  error: 'Preload route must be same-origin',
                };
              }
              fullUrl = routePath;
            } else {
              fullUrl = `${baseUrl}${routePath.startsWith('/') ? routePath : '/' + routePath}`;
            }

            const fetchOptions: RequestInit = {
              method,
              headers: { 'Content-Type': 'application/json' },
            };

            if (method === 'POST' && route.body) {
              fetchOptions.body = JSON.stringify(route.body);
            }

            const response = await fetch(fullUrl, fetchOptions);
            
            if (!response.ok) {
              return {
                route: route.route,
                title: route.title,
                description: route.description,
                success: false,
                error: `HTTP ${response.status}: ${response.statusText}`,
              };
            }

            // Check content-type to handle both JSON and text/plain (for TOON format)
            const contentType = response.headers.get('content-type') || '';
            let responseData: any;
            
            if (contentType.includes('application/json') || contentType.includes('text/json')) {
              // Parse as JSON
              responseData = await response.json();
              // Extract data using jsonPath (using shared utility)
              const extractedData = extractDataByPath(responseData, route.jsonPath);
              
              return {
                route: route.route,
                title: route.title,
                description: route.description,
                success: true,
                data: extractedData,
              };
            } else {
              // Handle text/plain (e.g., TOON format) or other text formats
              const responseText = await response.text();
              
              // If outputFormat is 'toon', return the text as-is
              if (route.outputFormat === 'toon') {
                return {
                  route: route.route,
                  title: route.title,
                  description: route.description,
                  success: true,
                  data: responseText,
                };
              }
              
              // Try to parse as JSON if it looks like JSON
              try {
                responseData = JSON.parse(responseText);
                const extractedData = extractDataByPath(responseData, route.jsonPath);
                
                return {
                  route: route.route,
                  title: route.title,
                  description: route.description,
                  success: true,
                  data: extractedData,
                };
              } catch {
                // If parsing fails, return as string
                return {
                  route: route.route,
                  title: route.title,
                  description: route.description,
                  success: true,
                  data: responseText,
                };
              }
            }
          } catch (error) {
            return {
              route: route.route,
              title: route.title,
              description: route.description,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );

      // Format results for system prompt using shared formatting function
      const sections: string[] = [];
      
      results.forEach((result, index) => {
        const route = agent.preloadRoutes![index] as PreloadRoute;
        sections.push(formatPreloadRouteResult(result, route));
      });

      const context = sections.length > 0 
        ? `\n\n## Preloaded Context Data\n\n${sections.join('\n')}\n`
        : '';
      
      setPreloadedContext(context);
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error loading preload routes: ${error instanceof Error ? error.message : String(error)}`);
      setPreloadedContext('');
    } finally {
      setIsLoadingPreload(false);
    }
  }, []);

  const generateResponse = useCallback(async (request: GeneratePromptRequest) => {
    if (!request.userPrompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setAiResponse('');
    setImageResponse(null);
    setImageError(null);
    setSearchResults(null);
    setSearchError(null);
    setSearchDuration(null);
    setSearchUsage(null);

    try {
      const agentId = request.agentId;
      if (!agentId) {
        throw new Error('agentId is required');
      }

      // Check if search is enabled
      // Search is enabled when searchType is set and is not 'no-search'
      const searchType = request.body?.searchType || 'no-search';
      const isSearchEnabled = searchType && searchType !== 'no-search';
      
      // Check if image generation is enabled
      const imageType = request.imageType || request.body?.imageType;
      const isImageEnabled = imageType && imageType !== 'none' && agentId !== 'image-generator';
      
      // Store original prompt for main AI call
      const originalPrompt = request.userPrompt.trim();
      let enhancedPrompt = originalPrompt;
      let searchResultsData: SearchResult[] | null = null;
      
      // Summarization: If enabled and search/image is needed, summarize the prompt first
      const shouldSummarize = request.summarizeBeforeSearchImage !== false && (isSearchEnabled || isImageEnabled);
      let summarizedPromptValue: string | null = null;
      
      if (shouldSummarize) {
        if (isDevelopment) {
          loggingCustom(LogType.AI_BODY_LOG, 'info', `Summarizing prompt before search/image operations...`);
        }
        
        // Non-blocking call to organization-rag API
        // Fire and forget - don't wait for response
        fetch('/api/organization-rag?format=toon', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: abortController.signal,
        }).catch((error) => {
          // Silently handle errors - this is non-blocking
          if (isDevelopment && !(error instanceof Error && error.name === 'AbortError')) {
            loggingCustom(LogType.CLIENT_LOG, 'warn', `Organization RAG API call failed (non-blocking): ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });
        
        try {
          // Extract organization RAG from preloaded context
          const organizationRag = extractOrganizationRagFromPreloadedContext(preloadedContext);
          
          summarizedPromptValue = await summarizePrompt(
            originalPrompt, 
            abortController.signal,
            60000
          );
          if (isDevelopment && summarizedPromptValue !== originalPrompt) {
            loggingCustom(LogType.AI_BODY_LOG, 'info', `Prompt summarized successfully. Original: ${originalPrompt.length} chars, Summarized: ${summarizedPromptValue.length} chars`);
          }
          // Store summarized prompt in state for display
          setSummarizedPrompt(summarizedPromptValue);
        } catch (summarizeError) {
          // If summarization fails, fallback to original prompt
          if (isDevelopment) {
            loggingCustom(LogType.CLIENT_LOG, 'warn', `Summarization failed, using original prompt: ${summarizeError instanceof Error ? summarizeError.message : 'Unknown error'}`);
          }
          summarizedPromptValue = null;
          setSummarizedPrompt(null);
        }
      } else {
        // Clear summarized prompt if summarization is disabled
        setSummarizedPrompt(null);
      }

      // Debug logging
      if (isDevelopment) {
        loggingCustom(LogType.AI_BODY_LOG, 'info', `Search check - searchType: ${searchType}, enabled: ${isSearchEnabled}, body keys: ${Object.keys(request.body || {}).join(', ')}`);
      }

      // If search is enabled, call search API first
      if (isSearchEnabled) {
        if (isDevelopment) {
          loggingCustom(LogType.AI_BODY_LOG, 'info', `Starting search API call with query: ${enhancedPrompt.substring(0, 100)}...`);
        }
        try {
          // Map searchType to search_tool_name
          const searchToolNameMap: Record<string, string> = {
            'basic': 'parallel_ai-search',
            'advanced': 'perplexity-search',
            'deep': 'parallel_ai-search-pro',
          };
          const searchToolName = searchToolNameMap[searchType] || 'parallel_ai-search';
          const maxResults = request.body?.max_results || 5;

          // Search tool pricing (per query)
          const searchToolPricing: Record<string, number> = {
            'parallel_ai-search': 0.004,
            'perplexity-search': 0.005,
            'google_pse-search': 0.005,
            'tavily-search': 0.008,
            'firecrawl-search': 0.008,
            'parallel_ai-search-pro': 0.009,
            'tavily-search-advanced': 0.016,
            'exa_ai-search': 0.025,
          };

          // Use summarized prompt for search if available, otherwise use original
          const promptForSearch = summarizedPromptValue || originalPrompt;
          
          // Clean the query - remove common prefixes that might be added by form building
          const cleanQuery = promptForSearch
            .replace(/^(?:User Prompt|Prompt|User Prompt:)\s*:?\s*/i, '')
            .trim();

          // Track search start time
          const searchStartTime = Date.now();

          // Call search API through server route (like other agent calls)
          try {
            const searchResponse = await fetch('/api/ai-builder/search', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userPrompt: cleanQuery,
                body: {
                  search_tool_name: searchToolName,
                  max_results: maxResults,
                },
              }),
              signal: abortController.signal,
            });

            // Calculate search duration
            const searchEndTime = Date.now();
            const searchDurationMs = searchEndTime - searchStartTime;
            setSearchDuration(searchDurationMs);

            if (!searchResponse.ok) {
              const errorText = await searchResponse.text();
              let errorData: any = null;
              try {
                errorData = JSON.parse(errorText);
              } catch {
                // If not JSON, use the text as error message
              }
              const errorMessage = errorData?.error || errorText || `HTTP ${searchResponse.status}: ${searchResponse.statusText}`;
              setSearchError(errorMessage);
              loggingCustom(LogType.CLIENT_LOG, 'error', `Search API error: ${errorMessage}`);
            } else {
              const searchResponseData = await searchResponse.json();
              
              if (searchResponseData.success && searchResponseData.data) {
                const builderResponse: AiBuilderResponseData = searchResponseData.data;
                
                // Extract search results from response
                if (builderResponse.searchResults && Array.isArray(builderResponse.searchResults)) {
                  searchResultsData = builderResponse.searchResults;
                } else {
                  // Try to parse from response string
                  try {
                    const parsedResponse = JSON.parse(builderResponse.response);
                    if (parsedResponse.results && Array.isArray(parsedResponse.results)) {
                      searchResultsData = parsedResponse.results;
                    } else if (Array.isArray(parsedResponse)) {
                      searchResultsData = parsedResponse;
                    }
                  } catch {
                    // If parsing fails, leave searchResultsData as null
                  }
                }

                if (searchResultsData && searchResultsData.length > 0) {
                  setSearchResults(searchResultsData);

                  // Calculate estimated cost
                  const searchCost = searchToolPricing[searchToolName] || 0.004;
                  setSearchUsage({
                    cost: searchCost,
                    tool: searchToolName,
                  });

                  // Format search results in TOON format
                  const toonFormatted = formatSearchResultsToToon(searchResultsData);

                  // Append formatted results to prompt with divider
                  enhancedPrompt = `${enhancedPrompt}\n\n---\n\n${toonFormatted}`;
                } else {
                  setSearchError('No search results found');
                }
              } else {
                setSearchError(searchResponseData.error || 'Search failed');
              }
            }
          } catch (searchFetchError) {
            if (!(searchFetchError instanceof Error && searchFetchError.name === 'AbortError')) {
              const errorMessage = searchFetchError instanceof Error ? searchFetchError.message : 'Search fetch error';
              setSearchError(errorMessage);
              loggingCustom(LogType.CLIENT_LOG, 'error', `Search fetch error: ${errorMessage}`);
            }
          }
        } catch (searchErr) {
          if (!(searchErr instanceof Error && searchErr.name === 'AbortError')) {
            const errorMessage = searchErr instanceof Error ? searchErr.message : 'Search error';
            setSearchError(errorMessage);
            loggingCustom(LogType.CLIENT_LOG, 'error', `Search error: ${errorMessage}`);
          }
        }
      }

      // If imageType is set and not "none", run both requests in parallel with Promise.allSettled
      // UNLESS the agent is image-generator itself, in which case use the normal flow (no duplicate call)
      const isImageGeneratorAgent = agentId === 'image-generator';
      
      if (isImageEnabled && !isImageGeneratorAgent) {
        // For non-image-generator agents with imageType, make both requests in parallel
        // For image-generator agent, skip this and use the normal flow below
        try {
          // Use summarized prompt for image if available, otherwise use original
          const promptForImage = summarizedPromptValue || originalPrompt;
          
          const [mainResult, imageResult] = await Promise.allSettled([
            // Main agent request
            fetch(`/api/ai-builder/${agentId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userPrompt: enhancedPrompt,
                previousAiResponse: request.previousAiResponse,
                previousUserPrompt: request.previousUserPrompt,
                annotations: request.annotations,
                body: request.body,
                extra_body: request.extra_body,
              }),
              signal: abortController.signal,
            }),
            // Image generation request
            fetch(`/api/ai-builder/image-generator`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userPrompt: promptForImage,
                body: {
                  imageType: imageType,
                  prompt: promptForImage,
                  ...(request.body || {}), // Include other body params if any
                },
                extra_body: {
                  output_format: 'png',
                  ...(request.extra_body || {}), // Include other extra params if any
                },
              }),
              signal: abortController.signal,
            }),
          ]);

          // Helper function to check if image generation succeeded
          // Note: This checks the promise result, but actual success is determined after parsing
          const checkImageSucceeded = (): boolean => {
            if (imageResult.status === 'rejected') return false;
            if (imageResult.status === 'fulfilled') {
              const imgResponse = imageResult.value;
              return imgResponse.ok;
            }
            return false;
          };

          // Handle main agent response independently
          if (mainResult.status === 'fulfilled') {
            const response = mainResult.value;
            try {
              if (!response.ok) {
                let errorText = '';
                let errorData: any = null;
                try {
                  errorText = await response.text();
                  try {
                    errorData = JSON.parse(errorText);
                  } catch {}
                } catch {}
                const errorMessage = errorData?.error || errorText || `HTTP ${response.status}: ${response.statusText}`;
                // Only set error if image generation also failed - otherwise show image
                if (!checkImageSucceeded()) {
                  setError(`Server Error (${response.status}): ${errorMessage}`);
                } else {
                  setError(null); // Image succeeded, don't show error
                }
                setAiResponse('');
                setTokenUsage(null);
                setVideoUsage(null);
                setDuration(null);
              } else {
                // Try to parse as JSON, but handle non-JSON responses gracefully
                let data: any;
                try {
                  const responseText = await response.text();
                  try {
                    data = JSON.parse(responseText);
                  } catch (parseError) {
                    // If response is not JSON, it might be a direct error response
                    // Check if image generation succeeded - if so, don't show error
                    if (!checkImageSucceeded()) {
                      const errorMatch = responseText.match(/error["\s:]+([^"}\n]+)/i);
                      const errorMessage = errorMatch ? errorMatch[1] : 'Invalid response format (not JSON)';
                      setError(`Response Parse Error: ${errorMessage}`);
                    } else {
                      setError(null); // Image succeeded, don't show error
                    }
                    setAiResponse('');
                    setTokenUsage(null);
                    setVideoUsage(null);
                    setDuration(null);
                    return; // Exit early, don't try to process invalid response
                  }
                } catch (readError) {
                  // If we can't read the response at all
                  if (!checkImageSucceeded()) {
                    const errorMessage = readError instanceof Error ? readError.message : 'Failed to read response';
                    setError(`Response Read Error: ${errorMessage}`);
                  } else {
                    setError(null);
                  }
                  setAiResponse('');
                  setTokenUsage(null);
                  setVideoUsage(null);
                  setDuration(null);
                  return;
                }
                
                if (!data.success) {
                  const errorMessage = data.error || 'Failed to get AI response';
                  // Only set error if image generation also failed
                  if (!checkImageSucceeded()) {
                    setError(`AI Builder Error: ${errorMessage}`);
                  } else {
                    setError(null); // Image succeeded, don't show error
                  }
                  setAiResponse('');
                  setTokenUsage(null);
                  setVideoUsage(null);
                  setDuration(null);
                } else {
                  const builderResponse: AiBuilderResponseData = data.data;
                  setAiResponse(builderResponse.response);
                  setTokenUsage(builderResponse.tokenUsage || null);
                  setVideoUsage(builderResponse.videoUsage || null);
                  setDuration(builderResponse.timing?.duration || null);
                  setError(null);

                  // Extract search results if format is 'search-results' or 'search-card'
                  if (builderResponse.format === 'search-results' || builderResponse.format === 'search-card') {
                    // First check if searchResults is directly in the response data (from ai-search-utils)
                    if (builderResponse.searchResults && Array.isArray(builderResponse.searchResults)) {
                      setSearchResults(builderResponse.searchResults);
                    } else {
                      // Try to parse search results from the response string
                      try {
                        const parsedResponse = JSON.parse(builderResponse.response);
                        // Check for different possible structures
                        if (parsedResponse.results && Array.isArray(parsedResponse.results)) {
                          setSearchResults(parsedResponse.results);
                        } else if (parsedResponse.search?.results && Array.isArray(parsedResponse.search.results)) {
                          setSearchResults(parsedResponse.search.results);
                        } else if (Array.isArray(parsedResponse)) {
                          setSearchResults(parsedResponse);
                        }
                      } catch (parseError) {
                        // If parsing fails, search results might be in a different format
                        // Leave searchResults as null, will be handled by response component
                      }
                    }
                  }

                  // Save prompt to history
                  if (builderResponse.response && builderResponse.tokenUsage) {
                    const username = user?.name || user?.email || 'anonymous';
                    const pricing = builderResponse.tokenUsage.pricing;
                    
                    const savedPrompt = await createPrompt({
                      username: user?.username || '',
                      aiAgent: request.agentId,
                      userPrompt: enhancedPrompt,
                      agentResponse: typeof builderResponse.response === 'string' 
                        ? builderResponse.response 
                        : JSON.stringify(builderResponse.response, null, 2),
                      inputTokens: builderResponse.tokenUsage.prompt_tokens,
                      inputPrice: pricing?.input_cost || 0,
                      outputTokens: builderResponse.tokenUsage.completion_tokens,
                      outputPrice: pricing?.output_cost || 0,
                      totalTokens: builderResponse.tokenUsage.total_tokens,
                      totalPrice: pricing?.total_cost || 0,
                      responseTime: builderResponse.timing?.responseTime,
                      duration: builderResponse.timing?.duration,
                      referenceId: request.referenceId,
                      annotations: request.annotations,
                    });
                    
                    if (savedPrompt?.id) {
                      setLastPromptId(savedPrompt.id);
                    }
                  }
                }
              }
            } catch (err) {
              if (!(err instanceof Error && err.name === 'AbortError')) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
                // Only set error if image generation also failed
                if (!checkImageSucceeded()) {
                  setError(`Main Agent Error: ${errorMessage}`);
                } else {
                  setError(null); // Image succeeded, don't show error
                }
                setAiResponse('');
                setTokenUsage(null);
                setVideoUsage(null);
                setDuration(null);
              }
            }
          } else {
            // Main request rejected
            const errorMessage = mainResult.reason instanceof Error ? mainResult.reason.message : 'Unknown error';
            // Only set error if image generation also failed
            if (!checkImageSucceeded()) {
              setError(`Main Agent Error: ${errorMessage}`);
            } else {
              setError(null); // Image succeeded, don't show error
            }
            setAiResponse('');
            setTokenUsage(null);
            setVideoUsage(null);
            setDuration(null);
          }

        // Handle image generation response independently
        if (imageResult.status === 'fulfilled') {
          const response = imageResult.value;
          try {
            if (!response.ok) {
              let errorText = '';
              let errorData: any = null;
              try {
                errorText = await response.text();
                try {
                  errorData = JSON.parse(errorText);
                } catch {}
              } catch {}
              const errorMessage = errorData?.error || errorText || `HTTP ${response.status}: ${response.statusText}`;
              setImageError(`Image Generation Error (${response.status}): ${errorMessage}`);
              setImageResponse(null);
            } else {
              // Try to parse as JSON, but handle non-JSON responses gracefully
              let data: any;
              try {
                const responseText = await response.text();
                try {
                  data = JSON.parse(responseText);
                } catch (parseError) {
                  // If response is not JSON, it might be a direct error response
                  const errorMatch = responseText.match(/error["\s:]+([^"}\n]+)/i);
                  const errorMessage = errorMatch ? errorMatch[1] : 'Invalid response format (not JSON)';
                  setImageError(`Image Response Parse Error: ${errorMessage}`);
                  setImageResponse(null);
                  return; // Exit early
                }
              } catch (readError) {
                const errorMessage = readError instanceof Error ? readError.message : 'Failed to read response';
                setImageError(`Image Response Read Error: ${errorMessage}`);
                setImageResponse(null);
                return;
              }
              
              if (!data.success) {
                const errorMessage = data.error || 'Failed to generate image';
                setImageError(`Image Generation Error: ${errorMessage}`);
                setImageResponse(null);
              } else {
                const builderResponse: AiBuilderResponseData = data.data;
                setImageResponse(builderResponse.response);
                setImageError(null);
              }
            }
          } catch (err) {
            if (!(err instanceof Error && err.name === 'AbortError')) {
              const errorMessage = err instanceof Error ? err.message : 'Unknown error';
              setImageError(`Image Generation Error: ${errorMessage}`);
              setImageResponse(null);
            }
          }
        } else {
          // Image request rejected
          const errorMessage = imageResult.reason instanceof Error ? imageResult.reason.message : 'Unknown error';
          setImageError(`Image Generation Error: ${errorMessage}`);
          setImageResponse(null);
        }
        } finally {
          setIsLoading(false);
        }
      } else {
        // Original single request flow when imageType is not set or is "none"
        let response: Response;
        try {
          response = await fetch(`/api/ai-builder/${agentId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userPrompt: enhancedPrompt,
              previousAiResponse: request.previousAiResponse,
              previousUserPrompt: request.previousUserPrompt,
              annotations: request.annotations,
              body: request.body,
              extra_body: request.extra_body,
            }),
            signal: abortController.signal,
          });
      } catch (fetchError) {
        // Handle network errors, CORS errors, etc.
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
        const isNetworkError = 
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('Network request failed') ||
          errorMessage.includes('ERR_NETWORK') ||
          errorMessage.includes('ERR_CONNECTION_REFUSED') ||
          errorMessage.includes('ERR_CONNECTION_RESET') ||
          errorMessage.includes('ERR_INTERNET_DISCONNECTED');
        
        const isCorsError = 
          errorMessage.includes('CORS') ||
          errorMessage.includes('Cross-Origin') ||
          errorMessage.includes('Access-Control');
        
        let detailedError = 'Failed to connect to the AI builder service.';
        
        if (isNetworkError) {
          detailedError = `Network Error: Unable to reach the server. This could be due to:\n\n• Server is down or unreachable\n• Network connectivity issues\n• Firewall or proxy blocking the request\n• SSL/TLS certificate problems\n\nError details: ${errorMessage}`;
        } else if (isCorsError) {
          detailedError = `CORS Error: Cross-origin request blocked. This usually indicates a server configuration issue.\n\nError details: ${errorMessage}`;
        } else {
          detailedError = `Connection Error: ${errorMessage}\n\nThis could be due to:\n• Server configuration issues\n• Network connectivity problems\n• Request timeout\n• SSL/TLS certificate issues`;
        }
        
        throw new Error(detailedError);
      }

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        let errorText = '';
        let errorData: any = null;
        
        try {
          errorText = await response.text();
          // Try to parse as JSON
          try {
            errorData = JSON.parse(errorText);
          } catch {
            // If not JSON, use the text as error message
          }
        } catch (parseError) {
          // If we can't read the response, use status text
          errorText = response.statusText || 'Unknown error';
        }
        
        const errorMessage = errorData?.error || errorText || `HTTP ${response.status}: ${response.statusText}`;
        const detailedError = `Server Error (${response.status}): ${errorMessage}\n\nPossible causes:\n• API endpoint is not available\n• Server is experiencing issues\n• Request format is invalid\n• Authentication/authorization failed`;
        
        // For graph/image/video agents, preserve error details in response for better error display
        const agentFormat = request.agentId === 'graph-generator' || request.agentId === 'image-generator' || request.agentId === 'video-generator';
        if (agentFormat && errorMessage) {
          // Store error as JSON so it can be displayed in the response component
          setAiResponse(JSON.stringify({ error: errorMessage, success: false, status: response.status }, null, 2));
        }
        
        throw new Error(detailedError);
      }

      let data: any;
      try {
        data = await response.json();
      } catch (jsonError) {
        throw new Error(`Invalid response format: The server returned non-JSON data. This could indicate a server error or misconfiguration.\n\nError: ${jsonError instanceof Error ? jsonError.message : 'Unknown JSON parse error'}`);
      }

      if (!data.success) {
        const errorMessage = data.error || 'Failed to get AI response';
        const detailedError = `AI Builder Error: ${errorMessage}\n\nThis could be due to:\n• AI service is unavailable\n• Invalid request parameters\n• Rate limiting or quota exceeded\n• Model configuration issues`;
        
        // For graph/image/video agents, preserve error details in response for better error display
        const agentFormat = request.agentId === 'graph-generator' || request.agentId === 'image-generator' || request.agentId === 'video-generator';
        if (agentFormat && data.error) {
          // Store error as JSON so it can be displayed in the response component
          setAiResponse(JSON.stringify({ error: data.error, success: false }, null, 2));
        }
        
        throw new Error(detailedError);
      }

      const builderResponse: AiBuilderResponseData = data.data;
      setAiResponse(builderResponse.response);
      setTokenUsage(builderResponse.tokenUsage || null);
      setDuration(builderResponse.timing?.duration || null);
      setGraphWarnings(builderResponse.warnings || []);

      // Extract search results if format is 'search-results' or 'search-card'
      if (builderResponse.format === 'search-results' || builderResponse.format === 'search-card') {
        // First check if searchResults is directly in the response data (from ai-search-utils)
        if (builderResponse.searchResults && Array.isArray(builderResponse.searchResults)) {
          setSearchResults(builderResponse.searchResults);
        } else {
          // Try to parse search results from the response string
          try {
            const parsedResponse = JSON.parse(builderResponse.response);
            // Check for different possible structures
            if (parsedResponse.results && Array.isArray(parsedResponse.results)) {
              setSearchResults(parsedResponse.results);
            } else if (parsedResponse.search?.results && Array.isArray(parsedResponse.search.results)) {
              setSearchResults(parsedResponse.search.results);
            } else if (Array.isArray(parsedResponse)) {
              setSearchResults(parsedResponse);
            }
          } catch (parseError) {
            // If parsing fails, search results might be in a different format
            // Leave searchResults as null, will be handled by response component
          }
        }
      }

      // Save prompt to history
      if (builderResponse.response && builderResponse.tokenUsage) {
        const username = user?.name || user?.email || 'anonymous';
        const pricing = builderResponse.tokenUsage.pricing;
        
        const savedPrompt = await createPrompt({
          username: user?.username || '',
          aiAgent: request.agentId,
          userPrompt: enhancedPrompt,
          agentResponse: typeof builderResponse.response === 'string' 
            ? builderResponse.response 
            : JSON.stringify(builderResponse.response, null, 2),
          inputTokens: builderResponse.tokenUsage.prompt_tokens,
          inputPrice: pricing?.input_cost || 0,
          outputTokens: builderResponse.tokenUsage.completion_tokens,
          outputPrice: pricing?.output_cost || 0,
          totalTokens: builderResponse.tokenUsage.total_tokens,
          totalPrice: pricing?.total_cost || 0,
          responseTime: builderResponse.timing?.responseTime,
          duration: builderResponse.timing?.duration,
          referenceId: request.referenceId,
          annotations: request.annotations,
        });
        
        if (savedPrompt?.id) {
          setLastPromptId(savedPrompt.id);
        }
      }
      }
    } catch (err) {
      // Don't show error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        setError(null);
        // Only clear response if no other successful response exists
        if (!imageResponse) {
          setAiResponse('');
        }
      } else {
        // Preserve detailed error message
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        
        // For graph/image/video agents, preserve error in response for display
        // Don't clear aiResponse if it contains a successful response from another agent
        const isGraphImageVideoAgent = request.agentId === 'graph-generator' || 
                                       request.agentId === 'image-generator' || 
                                       request.agentId === 'video-generator';
        
        if (isGraphImageVideoAgent) {
          // Store error as JSON in response so it can be displayed in the response component
          // Only overwrite if current response is empty or also an error
          if (!aiResponse || aiResponse.trim() === '' || aiResponse.includes('"error"')) {
            setAiResponse(JSON.stringify({ error: errorMessage, success: false, agentId: request.agentId }, null, 2));
          }
        } else {
          // For other agents, clear response only if no image response exists
          if (!imageResponse) {
            setAiResponse('');
          }
        }
        
        setTokenUsage(null);
        setDuration(null);
        
        // Log detailed error for debugging
        loggingCustom(LogType.CLIENT_LOG, 'error', `AI Builder Error: ${errorMessage}, agentId: ${request.agentId}, userPrompt: ${truncateText(request.userPrompt, 64, '...')}`);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [user, createPrompt]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setError(null);
      setAiResponse('');
      setTokenUsage(null);
      setDuration(null);
      setImageResponse(null);
      setImageError(null);
      setGraphWarnings([]);
      abortControllerRef.current = null;
    }
  }, []);

  const approveResponse = useCallback(async (response: string, agent: AiAgent) => {
    if (!response || !agent.nextAction) {
      return;
    }

    setIsApproving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let requestBody: any;

      // Determine if we should parse as JSON
      const trimmedResponse = response.trim();
      const shouldParseAsJson = agent.requiredOutputFormat === 'json' || agent.requiredOutputFormat === 'table' || agent.requiredOutputFormat === 'search-results' || agent.requiredOutputFormat === 'search-card' || 
        (agent.requiredOutputFormat !== 'string' && (trimmedResponse.startsWith('{') || trimmedResponse.startsWith('[')));

      // If required output format is JSON, parse it
      if (shouldParseAsJson) {
        try {
          const parsed = JSON.parse(response);
          
          // Determine if this is an AI agent route or schema route
          const isAiAgentRoute = agent.nextAction.route.includes('/api/ai-agents');
          const isSchemaRoute = agent.nextAction.route.includes('/api/schemas');
          
          // Handle both single object and array of objects
          if (Array.isArray(parsed)) {
            if (parsed.length === 0) {
              throw new Error('Array cannot be empty.');
            }
            
            // Validate each object in the array based on route type
            parsed.forEach((item, index) => {
              if (!item || typeof item !== 'object' || Array.isArray(item)) {
                throw new Error(`Invalid object at index ${index}: must be an object`);
              }
              
              if (!item.id) {
                throw new Error(`Object at index ${index} must have an "id" field.`);
              }
              
              // Validate schema fields only for schema routes
              if (isSchemaRoute) {
                if (!item.singular_name) {
                  throw new Error(`Schema at index ${index} must have a "singular_name" field.`);
                }
                
                if (!item.plural_name) {
                  throw new Error(`Schema at index ${index} must have a "plural_name" field.`);
                }
                
                if (!Array.isArray(item.fields)) {
                  throw new Error(`Schema at index ${index} must have a "fields" array.`);
                }
                
                if (!Array.isArray(item.sections)) {
                  throw new Error(`Schema at index ${index} must have a "sections" array.`);
                }
              }
              
              // Validate AI agent fields only for AI agent routes
              if (isAiAgentRoute) {
                if (!item.label) {
                  throw new Error(`AI agent at index ${index} must have a "label" field.`);
                }
                
                if (!item.icon) {
                  throw new Error(`AI agent at index ${index} must have an "icon" field.`);
                }
                
                if (!item.description) {
                  throw new Error(`AI agent at index ${index} must have a "description" field.`);
                }
                
                if (!item.requiredOutputFormat) {
                  throw new Error(`AI agent at index ${index} must have a "requiredOutputFormat" field.`);
                }
                
                if (!item.model) {
                  throw new Error(`AI agent at index ${index} must have a "model" field.`);
                }
                
                if (!item.systemPrompt) {
                  throw new Error(`AI agent at index ${index} must have a "systemPrompt" field.`);
                }
                
              }
            });
            
            requestBody = parsed;
          } else if (parsed && typeof parsed === 'object') {
            // Validate single object based on route type
            if (!parsed.id) {
              throw new Error('Object must have an "id" field.');
            }
            
            // Validate schema fields only for schema routes
            if (isSchemaRoute) {
              if (!parsed.singular_name) {
                throw new Error('Schema must have a "singular_name" field.');
              }
              
              if (!parsed.plural_name) {
                throw new Error('Schema must have a "plural_name" field.');
              }
              
              if (!Array.isArray(parsed.fields)) {
                throw new Error('Schema must have a "fields" array.');
              }
              
              if (!Array.isArray(parsed.sections)) {
                throw new Error('Schema must have a "sections" array.');
              }
            }
            
            // Validate AI agent fields only for AI agent routes
            if (isAiAgentRoute) {
              if (!parsed.label) {
                throw new Error('AI agent must have a "label" field.');
              }
              
              if (!parsed.icon) {
                throw new Error('AI agent must have an "icon" field.');
              }
              
              if (!parsed.description) {
                throw new Error('AI agent must have a "description" field.');
              }
              
              if (!parsed.requiredOutputFormat) {
                throw new Error('AI agent must have a "requiredOutputFormat" field.');
              }
              
              if (!parsed.model) {
                throw new Error('AI agent must have a "model" field.');
              }
              
              if (!parsed.systemPrompt) {
                throw new Error('AI agent must have a "systemPrompt" field.');
              }
              
              // AI agents should NOT have schema fields
              if (parsed.singular_name || parsed.plural_name || parsed.fields || parsed.sections) {
                throw new Error('AI agent must NOT have schema fields (singular_name, plural_name, fields, sections). These are schema fields, not AI agent fields.');
              }
            }
            
            requestBody = parsed;
          } else {
            throw new Error('Parsed JSON must be an object or an array of objects.');
          }
        } catch (parseError) {
          if (parseError instanceof SyntaxError) {
            throw new Error('Invalid JSON in response. Please check the AI response.');
          }
          throw parseError;
        }
      } else {
        requestBody = { content: response };
      }

      if (!requestBody) {
        throw new Error('No data to send. Please try generating a new response.');
      }

      // Only allow same-origin relative routes to avoid SSRF
      if (typeof window !== 'undefined') {
        if (!agent.nextAction.route.startsWith('/')) {
          throw new Error('Next action route must be a same-origin relative path.');
        }
      }

      // Special handling for graph-viewer page route
      const isGraphViewerRoute = agent.nextAction.route === '/ui/components/graph-viewer';
      const isGraphFormat = agent.requiredOutputFormat === 'graph' || agent.id === 'graph-generator';
      
      if (isGraphViewerRoute && isGraphFormat && typeof window !== 'undefined') {
        // Parse graph data from response
        try {
          const parsed = JSON.parse(response);
          const graphData = parsed.graph || parsed;
          
          // Validate graph structure
          if (graphData && typeof graphData === 'object' && 
              Array.isArray(graphData.nodes) && Array.isArray(graphData.edges)) {
            // Store graph data in localStorage
            const storageKey = 'graph-viewer-data';
            window.localStorage.setItem(storageKey, JSON.stringify(graphData));
            
            // Navigate to graph viewer page
            window.location.href = agent.nextAction.route;
            
            setIsApproving(false);
            return;
          } else {
            throw new Error('Invalid graph data structure: must have nodes and edges arrays');
          }
        } catch (parseError) {
          if (parseError instanceof SyntaxError) {
            throw new Error('Invalid JSON in graph response. Please check the AI response.');
          }
          throw parseError;
        }
      }

      const fetchResponse = await fetch(agent.nextAction.route, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await fetchResponse.json();

      if (!fetchResponse.ok || !data.success) {
        throw new Error(data.error || 'Failed to create schema');
      }

      setSuccessMessage(data.message || 'Schema created successfully!');
      
      // Refresh schemas sidebar after successful creation
      if (typeof window !== 'undefined') {
        // Dispatch event to clear React Query caches for schemas
        window.dispatchEvent(new CustomEvent('react-query-cache-clear', { 
          detail: { queryKeys: ['schemas'] } 
        }));
        
        // Also trigger storage event for other tabs
        window.localStorage.setItem('react-query-cache-cleared', JSON.stringify(['schemas']));
        window.localStorage.removeItem('react-query-cache-cleared');
        
        // Force refresh the schemas endpoint
        const tenantParam = tenantId ? `&tenantIds=${encodeURIComponent(String(tenantId))}` : '';
        fetch(`/api/schemas?summary=true${tenantParam}&cacheBust=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
        }).catch(err => {
          loggingCustom(LogType.CLIENT_LOG, 'warn', `Failed to refresh schemas: ${err instanceof Error ? err.message : String(err)}`);
        });
      }
      
      // Clear the form after successful creation
      setTimeout(() => {
        setUserPrompt('');
        setAiResponse('');
        setTokenUsage(null);
        setDuration(null);
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsApproving(false);
    }
  }, [setUserPrompt]);

  const clearResponse = useCallback(() => {
    setSummarizedPrompt(null);
    setAiResponse('');
    setTokenUsage(null);
    setVideoUsage(null);
    setDuration(null);
    setError(null);
    setSuccessMessage(null);
    setImageResponse(null);
    setImageError(null);
    setGraphWarnings([]);
    setSearchResults(null);
    setSearchError(null);
    setSearchDuration(null);
    setSearchUsage(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearSuccessMessage = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  return {
    userPrompt,
    setUserPrompt,
    aiResponse,
    tokenUsage,
    videoUsage,
    duration,
    isLoading,
    isApproving,
    error,
    successMessage,
    preloadedContext,
    isLoadingPreload,
    imageResponse,
    imageError,
    graphWarnings,
    searchResults,
    searchError,
    searchDuration,
    searchUsage,
    summarizedPrompt,
    generateResponse,
    stopGeneration,
    approveResponse,
    loadPreloadRoutes,
    clearResponse,
    clearError,
    clearSuccessMessage,
    lastPromptId,
  };
}

