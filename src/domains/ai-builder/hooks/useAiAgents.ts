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

/**
 * Hook to manage AI agents
 */
export function useAiAgents(): UseAiAgentsReturn {
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai-agents');
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        setAgents(data.data);
      } else {
        setError(data.error || 'Failed to fetch agents');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    loading,
    error,
    refreshAgents: fetchAgents,
  };
}

