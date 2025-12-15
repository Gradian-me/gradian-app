// Mention Command Component
// Command palette for selecting AI agents to mention in chat

'use client';

import React, { useEffect, useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useAiAgents } from '@/domains/ai-builder/hooks/useAiAgents';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { cn } from '@/lib/utils';
import type { AiAgent } from '@/domains/ai-builder/types';

export interface MentionCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (agentId: string) => void;
  query?: string;
  className?: string;
}

export const MentionCommand: React.FC<MentionCommandProps> = ({
  open,
  onOpenChange,
  onSelect,
  query = '',
  className,
}) => {
  const { agents, loading } = useAiAgents({ summary: true });
  const [searchQuery, setSearchQuery] = useState(query);

  // Update search query when prop changes (from typing in chat input)
  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

  // Filter agents based on search query
  const filteredAgents = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return agents;
    }
    
    const lowerQuery = searchQuery.toLowerCase();
    return agents.filter(
      (agent) =>
        agent.id.toLowerCase().includes(lowerQuery) ||
        agent.label?.toLowerCase().includes(lowerQuery) ||
        agent.description?.toLowerCase().includes(lowerQuery)
    );
  }, [agents, searchQuery]);

  const handleSelect = (agentId: string) => {
    onSelect(agentId);
    onOpenChange(false);
    setSearchQuery('');
  };

  // Handle keyboard events for navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <div 
      className={cn('absolute bottom-full left-0 mb-2 z-[100]', className)}
      onKeyDown={handleKeyDown}
    >
      <Command 
        className="w-80 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg"
        shouldFilter={false} // We handle filtering manually based on query prop
      >
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {searchQuery ? `Searching for "${searchQuery}"...` : 'Type after @ to search agents'}
          </div>
        </div>
        <CommandList>
          <CommandEmpty>
            {loading ? 'Loading agents...' : searchQuery ? `No agents found matching "${searchQuery}"` : 'No agents found'}
          </CommandEmpty>
          <CommandGroup heading="AI Agents">
            {filteredAgents.map((agent: AiAgent) => (
              <CommandItem
                key={agent.id}
                value={`${agent.id} ${agent.label || ''} ${agent.description || ''}`}
                onSelect={() => handleSelect(agent.id)}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer"
              >
                <IconRenderer
                  iconName={agent.icon || 'Bot'}
                  className="w-4 h-4 text-gray-600 dark:text-gray-400 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {agent.label || agent.id}
                  </div>
                  {agent.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {agent.description}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                  {agent.id}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
};

MentionCommand.displayName = 'MentionCommand';

