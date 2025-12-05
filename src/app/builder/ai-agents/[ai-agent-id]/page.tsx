'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AiAgentTabbedEditor } from '@/domains/ai-builder/components/agent-management/AiAgentTabbedEditor';
import { AiAgent } from '@/domains/ai-builder/types';
import { Message } from '@/gradian-ui/layout/message-box';

/**
 * Transform API response messages to MessageBox format
 */
const transformMessages = (apiMessages: any[]): Message[] => {
  if (!Array.isArray(apiMessages)) return [];
  
  return apiMessages.map((msg: any) => {
    if (msg.message !== undefined) {
      return msg;
    }
    
    const { path, ...languageKeys } = msg;
    
    if (Object.keys(languageKeys).length > 0) {
      return {
        path,
        message: languageKeys,
      };
    }
    
    return {
      path,
      message: JSON.stringify(msg),
    };
  });
};

export default function AiAgentEditorPage({ params }: { params: Promise<{ 'ai-agent-id': string }> }) {
  const router = useRouter();
  const [agentId, setAgentId] = useState<string>('');

  useEffect(() => {
    params.then((resolvedParams) => {
      setAgentId(resolvedParams['ai-agent-id']);
    });
  }, [params]);

  const fetchAgent = async (id: string): Promise<AiAgent> => {
    const cacheBust = Date.now().toString();
    const url = `/api/ai-agents/${id}?cacheBust=${cacheBust}`;

    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

    const result = await response.json();

    if (response.ok && result.success && result.data) {
      return result.data as AiAgent;
    }

    // If agent not found (404), redirect to not-found page
    if (response.status === 404 || !result.success) {
      router.replace(`/builder/ai-agents/${id}/not-found`);
      // Return a promise that never resolves to prevent component from rendering
      return new Promise(() => {});
    }

    const errorMessage = result.error || 'Failed to load AI agent';
    throw new Error(errorMessage);
  };

  const saveAgent = async (id: string, agent: AiAgent): Promise<void> => {
    const { id: _agentId, ...payload } = agent;
    
    const response = await fetch(`/api/ai-agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to save AI agent');
    }
  };

  const deleteAgent = async (id: string): Promise<void> => {
    const response = await fetch(`/api/ai-agents/${id}`, {
      method: 'DELETE',
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete AI agent');
    }
  };

  if (!agentId) {
    return null;
  }

  return (
    <AiAgentTabbedEditor
      agentId={agentId}
      fetchAgent={fetchAgent}
      saveAgent={saveAgent}
      deleteAgent={deleteAgent}
      onBack={() => router.push('/builder/ai-agents')}
    />
  );
}

