/**
 * AI Agents Hook
 * React hook for loading and managing AI agents
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AiAgent } from '../types';

interface UseAiAgentsReturn {
  agents: AiAgent[];
  loading: boolean;
  error: string | null;
  refreshAgents: () => Promise<void>;
}

interface UseAiAgentsOptions {
  agentId?: string; // If provided, fetch only this specific agent
  enabled?: boolean; // If false, don't fetch agents (default: true)
  summary?: boolean; // If true, fetch only summary fields (id, label, icon, description, agentType)
}

// Client-side cache to prevent duplicate requests
interface CacheEntry {
  data: AiAgent[];
  timestamp: number;
  promise?: Promise<AiAgent[]>;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(agentId?: string, summary?: boolean): string {
  return `${agentId || 'all'}_${summary ? 'summary' : 'full'}`;
}

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

/**
 * Hook to manage AI agents
 * @param options - Optional configuration including agentId to fetch a single agent
 */
export function useAiAgents(options?: UseAiAgentsOptions): UseAiAgentsReturn {
  const { agentId, enabled = true, summary = false } = options || {};
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    const cacheKey = getCacheKey(agentId, summary);
    const cached = cache.get(cacheKey);
    
    // If we have valid cached data, use it immediately
    if (cached && isCacheValid(cached) && !cached.promise) {
      setAgents(cached.data);
      setLoading(false);
      setError(null);
      return;
    }
    
    // If there's an ongoing request, wait for it
    if (cached?.promise) {
      setLoading(true);
      try {
        const data = await cached.promise;
        setAgents(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch agents');
        setAgents([]);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Create a promise for this request
    const fetchPromise = (async () => {
      try {
        let data: any = null;
        
        const handleResponse = async (res: Response): Promise<any> => {
          const text = await res.text();
          try {
            return text ? JSON.parse(text) : {};
          } catch {
            return { error: text || 'Unexpected response format' };
          }
        };
        
        // Build URL with query parameters
        let url = '/api/ai-agents';
        const params = new URLSearchParams();
        if (summary) {
          params.append('summary', 'true');
        }
        if (agentId) {
          params.append('id', agentId);
        }
        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        // Fetch agents (works for both single agent and all agents)
        const response = await fetch(url);
        data = await handleResponse(response);
        
        if (response.ok && data.success && data.data) {
          // If agentId was provided, data.data is a single agent, wrap it in array
          // Otherwise, data.data is already an array
          let agentsData: AiAgent[];
          if (agentId) {
            agentsData = [data.data];
          } else if (Array.isArray(data.data)) {
            agentsData = data.data;
          } else {
            throw new Error('Unexpected response format');
          }
          
          // Update cache
          cache.set(cacheKey, {
            data: agentsData,
            timestamp: Date.now(),
          });
          
          return agentsData;
        } else {
          throw new Error(data.error || (agentId ? `Failed to fetch agent "${agentId}"` : 'Failed to fetch agents'));
        }
      } catch (err) {
        throw err;
      }
    })();
    
    // Store the promise in cache to share with other hook instances
    cache.set(cacheKey, {
      data: cached?.data || [],
      timestamp: cached?.timestamp || 0,
      promise: fetchPromise,
    });
    
    try {
      const agentsData = await fetchPromise;
      setAgents(agentsData);
      setError(null);
      
      // Clear the promise from cache after completion
      const entry = cache.get(cacheKey);
      if (entry) {
        entry.promise = undefined;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
      setAgents([]);
      
      // Remove failed entry from cache
      cache.delete(cacheKey);
    } finally {
      setLoading(false);
    }
  }, [agentId, summary]);

  useEffect(() => {
    if (enabled) {
      fetchAgents();
    } else {
      setLoading(false);
    }
  }, [enabled, fetchAgents]);

  return {
    agents,
    loading,
    error,
    refreshAgents: fetchAgents,
  };
}

