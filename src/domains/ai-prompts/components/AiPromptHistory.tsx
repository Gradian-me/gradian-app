/**
 * AI Prompt History Component
 * Displays a list of AI prompts with filtering options
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAiPrompts } from '../hooks/useAiPrompts';
import type { AiPrompt, AiPromptFilters } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { Skeleton } from '@/components/ui/skeleton';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { MetricCard } from '@/gradian-ui/analytics';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import { config } from '@/lib/config';
import { History, Search, X, DollarSign, Hash, Timer, Sparkles, Coins, Cpu, User, ChevronDown, ChevronUp, FileText, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ModifiedPromptsList } from './ModifiedPromptsList';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface AiPromptHistoryProps {
  className?: string;
  maxItems?: number;
  showFilters?: boolean;
}

interface AiAgent {
  id: string;
  label: string;
  icon: string;
  model?: string;
}

interface UserData {
  id: string;
  name: string;
  lastname?: string;
  username?: string;
}

export function AiPromptHistory({ 
  className = '', 
  maxItems,
  showFilters = true 
}: AiPromptHistoryProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<AiPromptFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);

  const { prompts, loading, error, refreshPrompts } = useAiPrompts(filters);

  // Load agents
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await fetch('/api/ai-agents');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setAgents(data.data);
          }
        }
      } catch (err) {
        console.error('Failed to load agents:', err);
      }
    };
    loadAgents();
  }, []);

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const apiUrl = `${config.dataApi.basePath}/users`;
        const response = await fetch(apiUrl, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setUsers(data.data);
          }
        }
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };
    loadUsers();
  }, []);

  // Create agent map for quick lookup
  const agentMap = new Map(agents.map(agent => [agent.id, agent]));

  // Create user map for quick lookup (by id and username)
  const userMap = new Map<string, UserData>();
  users.forEach(user => {
    userMap.set(user.id, user);
    if (user.username) {
      userMap.set(user.username, user);
    }
  });

  // Get unique agents from prompts with their info
  const uniqueAgents = Array.from(new Set(prompts.map(p => p.aiAgent)))
    .map(agentId => {
      const agent = agentMap.get(agentId);
      return {
        id: agentId,
        label: agent?.label || agentId,
        icon: agent?.icon,
      };
    });

  // Get unique users from prompts, filtered by selected agent if any
  const getFilteredPrompts = () => {
    if (selectedAgent) {
      return prompts.filter(p => p.aiAgent === selectedAgent);
    }
    return prompts;
  };

  const filteredPrompts = getFilteredPrompts();
  const uniqueUserIds = Array.from(new Set(filteredPrompts.map(p => p.username)));
  
  const uniqueUsers = uniqueUserIds
    .map(userId => {
      const user = userMap.get(userId);
      const firstName = user?.name || '';
      const lastName = user?.lastname || '';
      const fullName = lastName 
        ? `${firstName} ${lastName}`.trim()
        : firstName || userId;
      
      return {
        id: userId,
        label: fullName,
        firstName,
        lastName,
      };
    })
    .sort((a, b) => {
      // Sort by last name if available, otherwise by first name
      const aSort = a.lastName || a.firstName || a.id;
      const bSort = b.lastName || b.firstName || b.id;
      return aSort.localeCompare(bSort);
    });

  // Clear user selection when agent changes
  useEffect(() => {
    if (selectedAgent && selectedUser) {
      const userStillAvailable = uniqueUsers.some(u => u.id === selectedUser);
      if (!userStillAvailable) {
        setSelectedUser('');
      }
    }
  }, [selectedAgent, uniqueUsers, selectedUser]);

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchQuery || undefined,
      aiAgent: selectedAgent || undefined,
      username: selectedUser || undefined,
    }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedAgent('');
    setSelectedUser('');
    setFilters({});
  };

  // Group prompts: parent prompts and their modified versions
  const promptGroups = useMemo(() => {
    const parentPrompts: AiPrompt[] = [];
    const modifiedPromptsMap = new Map<string, AiPrompt[]>();
    
    prompts.forEach(prompt => {
      if (prompt.referenceId) {
        // This is a modified prompt
        if (!modifiedPromptsMap.has(prompt.referenceId)) {
          modifiedPromptsMap.set(prompt.referenceId, []);
        }
        modifiedPromptsMap.get(prompt.referenceId)!.push(prompt);
      } else {
        // This is a parent prompt
        parentPrompts.push(prompt);
      }
    });
    
    return { parentPrompts, modifiedPromptsMap };
  }, [prompts]);

  const displayPrompts = maxItems 
    ? promptGroups.parentPrompts.slice(0, maxItems) 
    : promptGroups.parentPrompts;

  if (loading && prompts.length === 0) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Prompt History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="overflow-hidden border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Skeleton className="h-6 w-6 rounded-lg bg-violet-200 dark:bg-violet-900/50" />
                          <Skeleton className="h-5 w-32 rounded-md bg-gray-300 dark:bg-gray-600" />
                          <Skeleton className="h-5 w-20 rounded-full bg-gray-300 dark:bg-gray-600" />
                          <Skeleton className="h-5 w-16 rounded-md bg-gray-300 dark:bg-gray-600" />
                        </div>
                        <Skeleton className="h-3 w-48 rounded-md bg-gray-300 dark:bg-gray-600" />
                      </div>
                      <Skeleton className="h-8 w-20 rounded-md bg-gray-300 dark:bg-gray-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24 rounded-md bg-gray-300 dark:bg-gray-600" />
                        <Skeleton className="h-16 w-full rounded-md bg-gray-200 dark:bg-gray-700" />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map(j => (
                          <div key={j} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <Skeleton className="h-4 w-4 rounded-full bg-gray-300 dark:bg-gray-600" />
                            <div className="space-y-1 flex-1">
                              <Skeleton className="h-3 w-16 rounded-md bg-gray-300 dark:bg-gray-600" />
                              <Skeleton className="h-2 w-12 rounded-md bg-gray-200 dark:bg-gray-700" />
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Total Tokens & Price Skeleton */}
                      <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-950/40 dark:via-purple-950/40 dark:to-indigo-950/40 border border-violet-200 dark:border-violet-400">
                        <div className="absolute inset-0 opacity-5 dark:opacity-10">
                          <div className="absolute inset-0" style={{
                            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                            backgroundSize: '24px 24px'
                          }} />
                        </div>
                        <div className="relative p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-10 w-10 rounded-lg bg-violet-200 dark:bg-violet-900/60" />
                              <div className="space-y-1 flex-1">
                                <Skeleton className="h-3 w-24 rounded-md bg-violet-300 dark:bg-violet-800/60" />
                                <Skeleton className="h-6 w-32 rounded-md bg-violet-200 dark:bg-violet-900/60" />
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-10 w-10 rounded-lg bg-emerald-200 dark:bg-emerald-900/60" />
                              <div className="space-y-1 flex-1">
                                <Skeleton className="h-3 w-24 rounded-md bg-emerald-300 dark:bg-emerald-800/60" />
                                <Skeleton className="h-6 w-28 rounded-md bg-emerald-200 dark:bg-emerald-900/60" />
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-violet-200 dark:border-violet-400">
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-3.5 w-3.5 rounded-full bg-violet-300 dark:bg-violet-800/60" />
                              <Skeleton className="h-3 w-48 rounded-md bg-violet-200 dark:bg-violet-900/60" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Prompt History
            {prompts.length > 0 && (
              <span className="text-sm font-normal text-gray-500">
                ({prompts.length} {prompts.length === 1 ? 'entry' : 'entries'})
              </span>
            )}
          </CardTitle>
          <CardDescription>
            View and search through your AI prompt history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showFilters && (
            <div className="mb-4">
              <div className="flex flex-row gap-2 items-center">
                <div className="flex-1 min-w-[180px]">
                  <Input
                    placeholder="Search prompts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full h-9"
                  />
                </div>
                <Select
                  value={selectedAgent}
                  onValueChange={(value) => setSelectedAgent(value as string)}
                  options={[
                    { id: '', label: 'All Agents' },
                    ...uniqueAgents.map(agent => ({ 
                      id: agent.id, 
                      label: agent.label,
                      icon: agent.icon,
                    }))
                  ]}
                  placeholder="Agent"
                  className="w-40"
                  size="sm"
                />
                <Select
                  value={selectedUser}
                  onValueChange={(value) => setSelectedUser(value as string)}
                  options={[
                    { id: '', label: 'All Users' },
                    ...uniqueUsers.map(user => ({ 
                      id: user.id, 
                      label: user.label,
                    }))
                  ]}
                  placeholder="User"
                  className="w-44"
                  size="sm"
                />
                <Button onClick={handleSearch} variant="default" size="sm" className="shrink-0 h-9">
                  <Search className="h-4 w-4" />
                </Button>
                {(searchQuery || selectedAgent || selectedUser) && (
                  <Button onClick={clearFilters} variant="outline" size="sm" className="shrink-0 h-9">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          {displayPrompts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No prompts found</p>
              {showFilters && (
                <p className="text-sm mt-2">Try adjusting your filters</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {displayPrompts.map((prompt) => {
                const agent = agentMap.get(prompt.aiAgent);
                const modifiedPrompts = promptGroups.modifiedPromptsMap.get(prompt.id) || [];
                return (
                  <div key={prompt.id} className="space-y-2">
                    <PromptCard
                      prompt={prompt}
                      agent={agent ? {
                        id: agent.id,
                        label: agent.label,
                        icon: agent.icon,
                        model: agent.model,
                      } : undefined}
                      isExpanded={expandedPrompt === prompt.id}
                      onToggle={() => setExpandedPrompt(
                        expandedPrompt === prompt.id ? null : prompt.id
                      )}
                      router={router}
                    />
                    {/* Modified Prompts */}
                    {modifiedPrompts.length > 0 && (
                      <ModifiedPromptsList
                        parentPromptId={prompt.id}
                        modifiedPrompts={modifiedPrompts}
                        agentMap={agentMap}
                        userMap={userMap}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
        </CardContent>
      </Card>
    </div>
  );
}

interface PromptCardProps {
  prompt: AiPrompt;
  agent?: { id: string; label: string; icon: string; model?: string } | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  router: ReturnType<typeof useRouter>;
}

function PromptCard({ prompt, agent, isExpanded, onToggle, router }: PromptCardProps) {
  const date = new Date(prompt.timestamp);
  const isJson = prompt.agentResponse.trim().startsWith('{') || 
                 prompt.agentResponse.trim().startsWith('[');

  const agentLabel = agent?.label || prompt.aiAgent;
  const agentIcon = agent?.icon;
  const model = agent?.model;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              {agentIcon ? (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                    <IconRenderer 
                      iconName={agentIcon} 
                      className="h-4 w-4 text-violet-600 dark:text-violet-400" 
                    />
                  </div>
                  <span className="font-medium">{agentLabel}</span>
                </div>
              ) : (
                <span className="font-medium">{agentLabel}</span>
              )}
              {model && (
                <Badge variant="outline" className="text-xs font-medium gap-1.5">
                  <Cpu className="h-3 w-3" />
                  {model}
                </Badge>
              )}
              <span className="text-sm font-normal text-gray-500 flex flex-row items-center gap-1">
                by <User className="h-3 w-3" /> {prompt.username}
              </span>
            </CardTitle>
            <CardDescription className="mt-1">
              {format(date, 'PPpp')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/ai-builder/${prompt.id}`);
              }}
              className="flex flex-row items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Open in AI Builder
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="flex flex-row items-center gap-1"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* User Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                User Prompt:
              </h4>
              <CopyContent content={prompt.userPrompt} />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
              {prompt.userPrompt}
            </p>
          </div>

          {/* Input/Output Keys - Only show when expanded */}
          {isExpanded && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="font-medium">Input</div>
                  <div className="text-xs text-gray-500">
                    {prompt.inputTokens.toLocaleString()} tokens
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="font-medium">Input Cost</div>
                  <div className="text-xs text-gray-500">
                    ${prompt.inputPrice.toFixed(4)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="font-medium">Output</div>
                  <div className="text-xs text-gray-500">
                    {prompt.outputTokens.toLocaleString()} tokens
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="font-medium">Output Cost</div>
                  <div className="text-xs text-gray-500">
                    ${prompt.outputPrice.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Total Tokens & Price - Beautiful Card - Always visible */}
          <MetricCard
            metrics={[
              {
                id: 'total-tokens',
                label: 'Total Tokens',
                value: prompt.totalTokens,
                unit: 'tokens',
                icon: 'Hash',
                iconColor: 'violet',
                format: 'number',
              },
              {
                id: 'total-cost',
                label: 'Total Cost',
                value: prompt.totalPrice,
                prefix: '$',
                icon: 'Coins',
                iconColor: 'emerald',
                format: 'currency',
                precision: 4,
              },
              ...(prompt.duration !== undefined ? [{
                id: 'duration',
                label: 'Duration',
                value: prompt.duration < 1000 ? prompt.duration : prompt.duration / 1000,
                unit: prompt.duration < 1000 ? 'ms' : 's',
                icon: 'Timer',
                iconColor: 'blue' as const,
                format: 'number' as const,
                precision: prompt.duration < 1000 ? 0 : 2,
              }] : []),
            ]}
            footer={{
              icon: 'Sparkles',
              text: 'Powered by Gradian AI • Efficient & Cost-Effective',
            }}
          />

          {/* Agent Response */}
          {isExpanded && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Agent Response:
              </h4>
              <CodeViewer
                code={prompt.agentResponse}
                programmingLanguage={isJson ? 'json' : 'text'}
                title=""
                initialLineNumbers={10}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


