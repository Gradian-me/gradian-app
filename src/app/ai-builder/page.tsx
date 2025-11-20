'use client';

import React, { useState, useEffect } from 'react';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { Button } from '@/components/ui/button';
import { Select } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { MainLayout } from '@/components/layout/main-layout';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/gradian-ui/shared/utils';
import { Sparkles, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface AiAgent {
  id: string;
  label: string;
  icon: string;
  description: string;
  requiredOutputFormat: 'json' | 'string';
  nextAction: {
    label: string;
    icon?: string;
    route: string;
  };
}

export default function AiBuilderPage() {
  const [userPrompt, setUserPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiAgents, setAiAgents] = useState<AiAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get selected agent
  const selectedAgent = aiAgents.find(agent => agent.id === selectedAgentId) || null;

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
    setError(null);
    setSuccessMessage(null);
  }, [selectedAgentId]);

  const handleDoMagic = async () => {
    if (!userPrompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

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
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      setAiResponse(data.data.response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setAiResponse('');
    } finally {
      setIsLoading(false);
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
      // Check requiredOutputFormat, or try to detect JSON
      const shouldParseAsJson = selectedAgent?.requiredOutputFormat === 'json' || 
        (selectedAgent?.requiredOutputFormat !== 'string' && aiResponse.trim().startsWith('{'));

      // If required output format is JSON, parse it
      if (shouldParseAsJson) {
        try {
          const parsed = JSON.parse(aiResponse);
          
          // Validate that it's an object and has required fields
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Parsed JSON must be an object, not an array or primitive value.');
          }
          
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
      // Clear the form after successful creation
      setTimeout(() => {
        setUserPrompt('');
        setAiResponse('');
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
        subtitle="Describe what you want to create, and AI do the Magic!"
        icon="Sparkles"
      >
        <div className="space-y-6">
          {/* AI Agent Selector Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* User Prompt Input Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>

          {/* Button Skeleton */}
          <div className="flex justify-center">
            <Skeleton className="h-12 w-48 rounded-lg" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="AI Builder"
      subtitle="Describe what you want to create, and AI will generate the schema for you"
      icon="Sparkles"
    >
      <div className="space-y-6">
        {/* AI Agent Selector */}
        <div className="space-y-2">
          <label
            htmlFor="ai-agent-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Select AI Agent
          </label>
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
            placeholder="Select an AI agent"
            size="md"
            className="w-full"
          />
          {selectedAgent && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {selectedAgent.description}
            </p>
          )}
        </div>

        {/* User Prompt Input */}
        <div className="space-y-2">
          <label
            htmlFor="user-prompt"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            What would you like to create?
          </label>
          <textarea
            id="user-prompt"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="e.g., Create a schema for managing products with name, price, description, and status fields..."
            className={cn(
              'w-full min-h-[120px] px-4 py-3 rounded-lg border',
              'bg-white dark:bg-gray-800',
              'border-gray-300 dark:border-gray-600',
              'text-gray-900 dark:text-gray-100',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent',
              'resize-y'
            )}
            disabled={isLoading}
          />
        </div>

        {/* Do the Magic Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleDoMagic}
            disabled={isLoading || !userPrompt.trim()}
            size="lg"
            className="min-w-[200px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Do the Magic
              </>
            )}
          </Button>
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
                AI Response
              </h2>
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
            <CodeViewer
              code={aiResponse}
              programmingLanguage={selectedAgent?.requiredOutputFormat === 'json' ? 'json' : 'text'}
              title="Generated Schema"
              initialLineNumbers={30}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
}

