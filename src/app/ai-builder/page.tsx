'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { Button } from '@/components/ui/button';
import { Select } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { MainLayout } from '@/components/layout/main-layout';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/gradian-ui/shared/utils';
import { Sparkles, Loader2, CheckCircle2, XCircle, Eye, X, Square } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { DEMO_MODE } from '@/gradian-ui/shared/constants/application-variables';

interface AiAgent {
  id: string;
  label: string;
  icon: string;
  description: string;
  requiredOutputFormat: 'json' | 'string';
  model?: string;
  systemPrompt?: string;
  preloadRoutes?: Array<{
    route: string;
    title: string;
    description: string;
    method?: 'GET' | 'POST';
    jsonPath?: string;
    body?: any;
    queryParameters?: Record<string, string>;
  }>;
  nextAction: {
    label: string;
    icon?: string;
    route: string;
  };
}

export default function AiBuilderPage() {
  const [userPrompt, setUserPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [tokenUsage, setTokenUsage] = useState<{ prompt_tokens: number; completion_tokens: number; total_tokens: number } | null>(null);
  const [aiAgents, setAiAgents] = useState<AiAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [preloadedContext, setPreloadedContext] = useState<string>('');
  const [isLoadingPreload, setIsLoadingPreload] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get selected agent
  const selectedAgent = aiAgents.find(agent => agent.id === selectedAgentId) || null;

  // Load preload routes when agent or sheet opens
  useEffect(() => {
    const loadPreloadRoutes = async () => {
      if (!selectedAgent?.preloadRoutes || !Array.isArray(selectedAgent.preloadRoutes) || selectedAgent.preloadRoutes.length === 0) {
        setPreloadedContext('');
        return;
      }

      setIsLoadingPreload(true);
      try {
        const baseUrl = window.location.origin;
        const results = await Promise.all(
          selectedAgent.preloadRoutes.map(async (route: any) => {
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
              
              // Extract data using jsonPath
              let extractedData = responseData;
              if (route.jsonPath) {
                const pathParts = route.jsonPath.split('.');
                for (const part of pathParts) {
                  if (extractedData && typeof extractedData === 'object' && part in extractedData) {
                    extractedData = extractedData[part];
                  } else {
                    extractedData = null;
                    break;
                  }
                }
              }

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

        // Format results for system prompt
        const sections: string[] = [];
        results.forEach((result) => {
          if (result.success && result.data) {
            sections.push(
              `## ${result.title}\n${result.description}\n\n` +
              `Data from ${result.route}:\n\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\`\n`
            );
          } else {
            sections.push(
              `## ${result.title}\n${result.description}\n\n` +
              `⚠️ Failed to load data from ${result.route}: ${result.error || 'Unknown error'}\n`
            );
          }
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
    };

    if (isSheetOpen && selectedAgent) {
      loadPreloadRoutes();
    }
  }, [isSheetOpen, selectedAgent?.id, selectedAgent?.preloadRoutes]);

  // Get the prompt that would be sent to LLM
  const getPromptForLLM = () => {
    if (!selectedAgent || !userPrompt.trim()) {
      return null;
    }

    const systemPrompt = (selectedAgent.systemPrompt || '') + preloadedContext;

    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      {
        role: 'user' as const,
        content: userPrompt.trim()
      }
    ];

    return {
      model: selectedAgent.model || 'gpt-4o',
      messages
    };
  };

  // Load all agents on mount
  useEffect(() => {
    const loadAgents = async () => {
      setIsLoadingAgents(true);
      try {
        const response = await fetch('/api/ai-agents');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && data.data.length > 0) {
            setAiAgents(data.data);
            // Set first agent as default
            if (data.data.length > 0) {
              setSelectedAgentId(data.data[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load AI agents:', err);
      } finally {
        setIsLoadingAgents(false);
      }
    };
    loadAgents();
  }, []);

  // Clear response when agent changes
  useEffect(() => {
    setAiResponse('');
    setTokenUsage(null);
    setError(null);
    setSuccessMessage(null);
  }, [selectedAgentId]);

  // Auto-resize textarea with max 8 lines
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
      const maxHeight = lineHeight * 8; // 8 lines max
      
      if (scrollHeight <= maxHeight) {
        textarea.style.height = `${scrollHeight}px`;
        textarea.style.overflowY = 'hidden';
      } else {
        textarea.style.height = `${maxHeight}px`;
        textarea.style.overflowY = 'auto';
      }
    }
  }, [userPrompt]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleDoMagic = async () => {
    if (!userPrompt.trim()) {
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
      const response = await fetch('/api/ai-builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt: userPrompt.trim(),
          agentId: selectedAgentId,
        }),
        signal: abortController.signal,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      setAiResponse(data.data.response);
      setTokenUsage(data.data.tokenUsage || null);
    } catch (err) {
      // Don't show error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        setError(null);
        setAiResponse('');
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setAiResponse('');
        setTokenUsage(null);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setError(null);
      setAiResponse('');
      setTokenUsage(null);
      abortControllerRef.current = null;
    }
  };

  const handleApprove = async () => {
    if (!aiResponse || !selectedAgent?.nextAction) {
      return;
    }

    setIsApproving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let requestBody: any;

      // Determine if we should parse as JSON
      // Check requiredOutputFormat, or try to detect JSON (object or array)
      const trimmedResponse = aiResponse.trim();
      const shouldParseAsJson = selectedAgent?.requiredOutputFormat === 'json' || 
        (selectedAgent?.requiredOutputFormat !== 'string' && (trimmedResponse.startsWith('{') || trimmedResponse.startsWith('[')));

      // If required output format is JSON, parse it
      if (shouldParseAsJson) {
        try {
          const parsed = JSON.parse(aiResponse);
          
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
        requestBody = { content: aiResponse };
      }

      if (!requestBody) {
        throw new Error('No data to send. Please try generating a new response.');
      }

      const response = await fetch(selectedAgent.nextAction.route, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
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
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsApproving(false);
    }
  };

  // Skeleton component for loading state
  if (isLoadingAgents) {
    return (
      <MainLayout
        title="AI Builder"
        subtitle="Transform your ideas into reality with the power of AI"
        icon="Sparkles"
      >
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* User Prompt Input Skeleton */}
          <div className="space-y-3">
            {/* Label and Select Row Skeleton */}
            <div className="flex flex-row justify-between items-center flex-wrap gap-2">
              <Skeleton className="h-5 w-48 rounded-md" />
              <Skeleton className="h-10 w-48 rounded-lg" />
            </div>
            
            {/* Textarea Skeleton */}
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>

          {/* Button Skeleton */}
          <div className="flex justify-center items-center gap-3">
            <Skeleton className="h-12 w-48 rounded-lg" />
            <Skeleton className="h-12 w-36 rounded-lg" />
          </div>

          {/* Animated shimmer effect container */}
          <div className="space-y-4 mt-8">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="AI Builder"
      subtitle="Transform your ideas into reality with the power of AI"
      icon="Sparkles"
    >
      <div className="space-y-6">
        {/* User Prompt Input */}
        <div className="space-y-2 flex flex-col items-center">
          <div className="flex flex-row justify-between items-center flex-wrap gap-2 w-full max-w-3xl">
            <label
              htmlFor="user-prompt"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              What would you like to create?
            </label>
            <div className="w-48">
              <Select
                config={{
                  name: 'ai-agent-select',
                  label: '',
                }}
                options={aiAgents.map(agent => ({
                  id: agent.id,
                  label: agent.label,
                  icon: agent.icon,
                }))}
                value={selectedAgentId}
                onValueChange={(value) => setSelectedAgentId(value)}
                placeholder="Select agent"
                size="md"
                className="w-full"
              />
            </div>
          </div>
          <textarea
            ref={textareaRef}
            id="user-prompt"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Describe your vision... Let AI bring your ideas to life with intelligent automation and creative solutions."
            className={cn(
              'w-full max-w-3xl min-h-[120px] px-4 py-3 rounded-2xl border',
              'bg-white dark:bg-gray-800',
              'border-gray-300 dark:border-gray-600',
              'text-gray-900 dark:text-gray-100',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent',
              'resize-none shadow-sm',
              'transition-all duration-200'
            )}
            disabled={isLoading}
            rows={1}
          />
        </div>

        {/* Do the Magic Button */}
        <div className="flex justify-center items-center gap-3">
          {isLoading ? (
            <>
              <Button
                onClick={handleDoMagic}
                disabled={true}
                size="lg"
                className="min-w-[200px]"
              >
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </Button>
              <Button
                onClick={handleStop}
                variant="outline"
                size="lg"
                className="min-w-[150px]"
              >
                <Square className="mr-2 h-5 w-5 text-gray-600 dark:text-gray-400 fill-gray-600 dark:fill-gray-400" />
                Stop
              </Button>
            </>
          ) : (
            <Button
              onClick={handleDoMagic}
              disabled={!userPrompt.trim()}
              size="lg"
              className="min-w-[200px]"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Do the Magic
            </Button>
          )}
          {DEMO_MODE && (
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  disabled={!userPrompt.trim() || !selectedAgent}
                  className="min-w-[150px]"
                >
                  <Eye className="mr-2 h-5 w-5" />
                  View Prompt
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0 h-full">
                <SheetHeader className="px-6 pt-6 pb-4 pr-12 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 sticky top-0 bg-white dark:bg-gray-900 z-10">
                  <SheetTitle>Prompt Sent to LLM</SheetTitle>
                  <SheetDescription>
                    This is the prompt that will be sent to the Language Model when you click "Do the Magic".
                  </SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
                  {getPromptForLLM() ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
                          System Prompt:
                        </h3>
                        {isLoadingPreload ? (
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading preloaded context...
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                            <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                              {(selectedAgent?.systemPrompt || '') + preloadedContext || '(No system prompt configured)'}
                            </pre>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
                          User Prompt:
                        </h3>
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                          <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                            {userPrompt.trim()}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p>Please enter a prompt and select an AI agent to view the prompt.</p>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
            <div className="flex items-start">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                  Error
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
            <div className="flex items-start">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                  Success
                </h3>
                <p className="mt-1 text-sm text-green-700 dark:text-green-400">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* AI Response */}
        {aiResponse && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Your Creation
              </h2>
              <div className="flex items-center gap-3">
                {tokenUsage && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span>Tokens: {tokenUsage.prompt_tokens} + {tokenUsage.completion_tokens} = {tokenUsage.total_tokens}</span>
                  </div>
                )}
                {selectedAgent?.nextAction && (
                  <Button
                    onClick={handleApprove}
                    disabled={isApproving}
                    variant="default"
                    size="default"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {selectedAgent.nextAction.icon && (
                          <IconRenderer 
                            iconName={selectedAgent.nextAction.icon} 
                            className="mr-2 h-4 w-4" 
                          />
                        )}
                        {selectedAgent.nextAction.label}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            <CodeViewer
              code={aiResponse}
              programmingLanguage={selectedAgent?.requiredOutputFormat === 'json' ? 'json' : 'text'}
              title="AI Generated Content"
              initialLineNumbers={30}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
}

