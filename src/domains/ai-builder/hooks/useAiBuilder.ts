/**
 * AI Builder Hook
 * React hook for managing AI builder functionality
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import type { AiAgent, AiBuilderResponseData, GeneratePromptRequest, TokenUsage, PreloadRouteResult } from '../types';
import { useAiPrompts } from '@/domains/ai-prompts/hooks/useAiPrompts';
import { useUserStore } from '@/stores/user.store';
import {
  extractDataByPath,
  formatPreloadRouteResult,
  type PreloadRoute,
} from '@/gradian-ui/shared/utils/preload-routes';

interface UseAiBuilderReturn {
  userPrompt: string;
  setUserPrompt: (prompt: string) => void;
  aiResponse: string;
  tokenUsage: TokenUsage | null;
  duration: number | null;
  isLoading: boolean;
  isApproving: boolean;
  error: string | null;
  successMessage: string | null;
  preloadedContext: string;
  isLoadingPreload: boolean;
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
  const [userPrompt, setUserPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [preloadedContext, setPreloadedContext] = useState('');
  const [isLoadingPreload, setIsLoadingPreload] = useState(false);
  const [lastPromptId, setLastPromptId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const user = useUserStore((state) => state.user);
  const { createPrompt } = useAiPrompts();

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

            const fullUrl = routePath.startsWith('http') 
              ? routePath 
              : `${baseUrl}${routePath.startsWith('/') ? routePath : '/' + routePath}`;

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

            const responseData = await response.json();
            
            // Extract data using jsonPath (using shared utility)
            const extractedData = extractDataByPath(responseData, route.jsonPath);

            return {
              route: route.route,
              title: route.title,
              description: route.description,
              success: true,
              data: extractedData,
            };
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
      console.error('Error loading preload routes:', error);
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

    try {
      let response: Response;
      try {
        response = await fetch('/api/ai-builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt: request.userPrompt.trim(),
          agentId: request.agentId,
          previousAiResponse: request.previousAiResponse,
          previousUserPrompt: request.previousUserPrompt,
          annotations: request.annotations,
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
        throw new Error(detailedError);
      }

      const builderResponse: AiBuilderResponseData = data.data;
      setAiResponse(builderResponse.response);
      setTokenUsage(builderResponse.tokenUsage || null);
      setDuration(builderResponse.timing?.duration || null);

      // Save prompt to history
      if (builderResponse.response && builderResponse.tokenUsage) {
        const username = user?.name || user?.email || 'anonymous';
        const pricing = builderResponse.tokenUsage.pricing;
        
        const savedPrompt = await createPrompt({
          username: user?.username || '',
          aiAgent: request.agentId,
          userPrompt: request.userPrompt.trim(),
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
    } catch (err) {
      // Don't show error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        setError(null);
        setAiResponse('');
      } else {
        // Preserve detailed error message
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        setAiResponse('');
        setTokenUsage(null);
        setDuration(null);
        
        // Log detailed error for debugging
        console.error('AI Builder Error:', {
          error: err,
          message: errorMessage,
          agentId: request.agentId,
          userPrompt: request.userPrompt.substring(0, 100) + '...',
        });
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
      const shouldParseAsJson = agent.requiredOutputFormat === 'json' || agent.requiredOutputFormat === 'table' || 
        (agent.requiredOutputFormat !== 'string' && (trimmedResponse.startsWith('{') || trimmedResponse.startsWith('[')));

      // If required output format is JSON, parse it
      if (shouldParseAsJson) {
        try {
          const parsed = JSON.parse(response);
          
          // Handle both single schema object and array of schemas
          if (Array.isArray(parsed)) {
            // Validate array of schemas
            if (parsed.length === 0) {
              throw new Error('Schema array cannot be empty.');
            }
            
            // Validate each schema in the array
            parsed.forEach((schema, index) => {
              if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
                throw new Error(`Invalid schema at index ${index}: must be an object`);
              }
              
              if (!schema.id) {
                throw new Error(`Schema at index ${index} must have an "id" field.`);
              }
              
              if (!schema.singular_name) {
                throw new Error(`Schema at index ${index} must have a "singular_name" field.`);
              }
              
              if (!schema.plural_name) {
                throw new Error(`Schema at index ${index} must have a "plural_name" field.`);
              }
              
              if (!Array.isArray(schema.fields)) {
                throw new Error(`Schema at index ${index} must have a "fields" array.`);
              }
              
              if (!Array.isArray(schema.sections)) {
                throw new Error(`Schema at index ${index} must have a "sections" array.`);
              }
            });
            
            requestBody = parsed;
          } else if (parsed && typeof parsed === 'object') {
            // Validate single schema object
            if (!parsed.id) {
              throw new Error('Schema must have an "id" field.');
            }
            
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
        fetch('/api/schemas?summary=true&cacheBust=' + Date.now(), {
          method: 'GET',
          cache: 'no-store',
        }).catch(err => {
          console.warn('Failed to refresh schemas:', err);
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
    setAiResponse('');
    setTokenUsage(null);
    setDuration(null);
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
    duration,
    isLoading,
    isApproving,
    error,
    successMessage,
    preloadedContext,
    isLoadingPreload,
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

