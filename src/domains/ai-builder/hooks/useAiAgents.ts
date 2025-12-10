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
}

/**
 * Hook to manage AI agents
 * @param options - Optional configuration including agentId to fetch a single agent
 */
export function useAiAgents(options?: UseAiAgentsOptions): UseAiAgentsReturn {
  const { agentId, enabled = true } = options || {};
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let response: Response;
      let data: any = null;
      
      const handleResponse = async (res: Response): Promise<any> => {
        const text = await res.text();
        try {
          return text ? JSON.parse(text) : {};
        } catch {
          return { error: text || 'Unexpected response format' };
        }
      };
      
      // If agentId is provided, fetch only that specific agent
      if (agentId) {
        response = await fetch(`/api/ai-agents/${agentId}`);
        data = await handleResponse(response);
        
        if (response.ok && data.success && data.data) {
          setAgents([data.data]);
        } else {
          setError(data.error || `Failed to fetch agent "${agentId}"`);
          setAgents([]);
        }
      } else {
        // Fetch all agents
        response = await fetch('/api/ai-agents');
        data = await handleResponse(response);
        
        if (response.ok && data.success && data.data && Array.isArray(data.data)) {
          setAgents(data.data);
        } else {
          setError(data.error || 'Failed to fetch agents');
          setAgents([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

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

