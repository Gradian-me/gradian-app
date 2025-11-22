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
import { History, Search, X, DollarSign, Hash, Clock, Timer, Sparkles, Coins, Cpu, User, ChevronDown, ChevronUp, FileText } from 'lucide-react';
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
  const [filters, setFilters] = useState<AiPromptFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedModifiedPrompt, setSelectedModifiedPrompt] = useState<AiPrompt | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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
                      {/* Timing Information Skeleton */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <Skeleton className="h-4 w-4 rounded-full bg-gray-300 dark:bg-gray-600" />
                          <div className="space-y-1 flex-1">
                            <Skeleton className="h-3 w-20 rounded-md bg-gray-300 dark:bg-gray-600" />
                            <Skeleton className="h-2 w-16 rounded-md bg-gray-200 dark:bg-gray-700" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <Skeleton className="h-4 w-4 rounded-full bg-gray-300 dark:bg-gray-600" />
                          <div className="space-y-1 flex-1">
                            <Skeleton className="h-3 w-20 rounded-md bg-gray-300 dark:bg-gray-600" />
                            <Skeleton className="h-2 w-16 rounded-md bg-gray-200 dark:bg-gray-700" />
                          </div>
                        </div>
                      </div>
                      {/* Total Tokens & Price Skeleton */}
                      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-950/40 dark:via-purple-950/40 dark:to-indigo-950/40 border border-violet-200/50 dark:border-violet-800/50">
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
                          <div className="mt-4 pt-4 border-t border-violet-200/50 dark:border-violet-800/50">
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
                    />
                    {/* Modified Prompts */}
                    {modifiedPrompts.length > 0 && (
                      <div className="ml-6 pl-4 border-l-2 border-violet-200 dark:border-violet-800 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">
                          <FileText className="h-4 w-4" />
                          Modified Prompts ({modifiedPrompts.length})
                        </div>
                        {modifiedPrompts.map((modifiedPrompt) => {
                          const modifiedAgent = agentMap.get(modifiedPrompt.aiAgent);
                          return (
                            <div
                              key={modifiedPrompt.id}
                              className="cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-950/20 rounded-lg p-2 transition-colors"
                              onClick={() => {
                                setSelectedModifiedPrompt(modifiedPrompt);
                                setIsSheetOpen(true);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {modifiedAgent?.icon && (
                                    <div className="p-1 rounded bg-violet-100 dark:bg-violet-900/30">
                                      <IconRenderer
                                        iconName={modifiedAgent.icon}
                                        className="h-3 w-3 text-violet-600 dark:text-violet-400"
                                      />
                                    </div>
                                  )}
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {format(new Date(modifiedPrompt.timestamp), 'PPpp')}
                                  </span>
                                  {modifiedPrompt.annotations && modifiedPrompt.annotations.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      {modifiedPrompt.annotations.length} annotation{modifiedPrompt.annotations.length !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Modified Prompt Sheet */}
          {selectedModifiedPrompt && (
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetContent className="w-full sm:max-w-3xl flex flex-col p-0 h-full overflow-y-auto">
                <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                  <SheetTitle>Modified Prompt Details</SheetTitle>
                  <SheetDescription>
                    View details of the modified prompt with annotations
                  </SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <ModifiedPromptViewer 
                    prompt={selectedModifiedPrompt} 
                    agentMap={agentMap} 
                    userMap={userMap}
                  />
                </div>
              </SheetContent>
            </Sheet>
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
}

function PromptCard({ prompt, agent, isExpanded, onToggle }: PromptCardProps) {
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

          {/* Token Usage & Pricing */}
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

          {/* Timing Information */}
          {(prompt.responseTime !== undefined || prompt.duration !== undefined) && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {prompt.responseTime !== undefined && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="font-medium">Response Time</div>
                    <div className="text-xs text-gray-500">
                      {prompt.responseTime < 1000 
                        ? `${prompt.responseTime}ms` 
                        : `${(prompt.responseTime / 1000).toFixed(2)}s`}
                    </div>
                  </div>
                </div>
              )}
              {prompt.duration !== undefined && (
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="font-medium">Duration</div>
                    <div className="text-xs text-gray-500">
                      {prompt.duration < 1000 
                        ? `${prompt.duration}ms` 
                        : `${(prompt.duration / 1000).toFixed(2)}s`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Total Tokens & Price - Beautiful Card */}
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

interface ModifiedPromptViewerProps {
  prompt: AiPrompt;
  agentMap: Map<string, AiAgent>;
  userMap: Map<string, UserData>;
}

function ModifiedPromptViewer({ prompt, agentMap, userMap }: ModifiedPromptViewerProps) {
  const agent = agentMap.get(prompt.aiAgent);
  const user = userMap.get(prompt.username);
  const date = new Date(prompt.timestamp);
  const isJson = prompt.agentResponse.trim().startsWith('{') || 
                 prompt.agentResponse.trim().startsWith('[');

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {agent?.icon && (
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <IconRenderer
                iconName={agent.icon}
                className="h-5 w-5 text-violet-600 dark:text-violet-400"
              />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {agent?.label || prompt.aiAgent}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {format(date, 'PPpp')} • by {user?.name || prompt.username}
            </p>
          </div>
        </div>
      </div>

      {/* User Prompt */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            User Prompt:
          </h4>
          <CopyContent content={prompt.userPrompt} />
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
          <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
            {prompt.userPrompt}
          </pre>
        </div>
      </div>

      {/* Annotations */}
      {prompt.annotations && prompt.annotations.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100">
            Annotations ({prompt.annotations.length} schema{prompt.annotations.length !== 1 ? 's' : ''})
          </h4>
          <div className="space-y-3">
            {prompt.annotations.map((schemaAnnotation) => (
              <div
                key={schemaAnnotation.schemaId}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50"
              >
                <h5 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  {schemaAnnotation.schemaName}
                </h5>
                {schemaAnnotation.annotations.length > 0 ? (
                  <ul className="space-y-1">
                    {schemaAnnotation.annotations.map((annotation, index) => (
                      <li
                        key={annotation.id}
                        className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <span className="text-violet-600 dark:text-violet-400 font-medium shrink-0">
                          {index + 1}.
                        </span>
                        <span>{annotation.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No annotations
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Response */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            AI Response:
          </h4>
          <CopyContent content={prompt.agentResponse} />
        </div>
        <CodeViewer
          code={prompt.agentResponse}
          programmingLanguage={isJson ? 'json' : 'text'}
          title=""
          initialLineNumbers={10}
        />
      </div>

      {/* Token Usage */}
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
    </div>
  );
}

