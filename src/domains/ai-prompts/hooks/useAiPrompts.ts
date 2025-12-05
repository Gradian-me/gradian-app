/**
 * AI Prompts Hooks
 * React hooks for managing AI prompts
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AiPrompt, CreateAiPromptRequest, AiPromptFilters } from '../types';

interface UseAiPromptsReturn {
  prompts: AiPrompt[];
  loading: boolean;
  error: string | null;
  createPrompt: (data: CreateAiPromptRequest) => Promise<AiPrompt | null>;
  refreshPrompts: (filters?: AiPromptFilters) => Promise<void>;
}

interface UseAiPromptsOptions {
  autoFetch?: boolean;
}

/**
 * Hook to manage AI prompts
 */
export function useAiPrompts(filters?: AiPromptFilters, options?: UseAiPromptsOptions): UseAiPromptsReturn {
  const { autoFetch = true } = options || {};
  const [prompts, setPrompts] = useState<AiPrompt[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompts = useCallback(async (promptFilters?: AiPromptFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (promptFilters?.username) params.set('username', promptFilters.username);
      if (promptFilters?.aiAgent) params.set('aiAgent', promptFilters.aiAgent);
      if (promptFilters?.startDate) params.set('startDate', promptFilters.startDate);
      if (promptFilters?.endDate) params.set('endDate', promptFilters.endDate);
      if (promptFilters?.search) params.set('search', promptFilters.search);
      
      const queryString = params.toString();
      const url = queryString ? `/api/ai-prompts?${queryString}` : '/api/ai-prompts';
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setPrompts(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch prompts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prompts');
    } finally {
      setLoading(false);
    }
  }, []);

  const createPrompt = useCallback(async (data: CreateAiPromptRequest): Promise<AiPrompt | null> => {
    try {
      const response = await fetch('/api/ai-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Only refresh prompts if autoFetch is enabled
        if (autoFetch) {
          await fetchPrompts(filters);
        }
        return result.data;
      } else {
        setError(result.error || 'Failed to create prompt');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create prompt');
      return null;
    }
  }, [filters, fetchPrompts, autoFetch]);

  useEffect(() => {
    if (autoFetch) {
      fetchPrompts(filters);
    }
  }, [autoFetch, fetchPrompts, filters]);

  return {
    prompts,
    loading,
    error,
    createPrompt,
    refreshPrompts: fetchPrompts,
  };
}

