'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AppVersion, ChangeType, Priority, VersionFilters, VersionChange } from '../types';
import { renderHighlightedText } from '@/gradian-ui/shared/utils/highlighter';
import { format } from 'date-fns';
import { Tag, Calendar, GitBranch } from 'lucide-react';

interface VersionCardProps {
  version: AppVersion;
  index: number;
  query: string;
  filters?: VersionFilters;
}

// Filter changes based on search query and filters
function filterChanges(changes: VersionChange[], filters?: VersionFilters): VersionChange[] {
  if (!filters) return changes;
  
  let filtered = [...changes];
  
  // Filter by search query
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(change =>
      change.description.toLowerCase().includes(searchLower) ||
      change.affectedDomains.some(d => d.toLowerCase().includes(searchLower))
    );
  }
  
  // Filter by change type
  if (filters.changeType && filters.changeType !== 'all') {
    const changeType = filters.changeType as ChangeType;
    filtered = filtered.filter(change => change.changeType === changeType);
  }
  
  // Filter by priority
  if (filters.priority && filters.priority !== 'all') {
    const priority = filters.priority as Priority;
    filtered = filtered.filter(change => change.priority === priority);
  }
  
  // Filter by domain
  if (filters.domain && filters.domain !== 'all') {
    const domain = filters.domain.toLowerCase();
    filtered = filtered.filter(change =>
      change.affectedDomains.some(d => d.toLowerCase() === domain)
    );
  }
  
  return filtered;
}

const changeTypeColors: Record<ChangeType, string> = {
  feature: 'bg-blue-200 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200',
  refactor: 'bg-purple-200 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200',
  add: 'bg-green-200 text-green-800 dark:bg-green-500/20 dark:text-green-200',
  restore: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-200',
  enhance: 'bg-indigo-200 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200',
  update: 'bg-cyan-200 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200',
};

const priorityColors: Record<Priority, string> = {
  LOW: 'bg-gray-200 text-gray-800 dark:bg-gray-500/20 dark:text-gray-200',
  Medium: 'bg-amber-200 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  High: 'bg-red-200 text-red-800 dark:bg-red-500/20 dark:text-red-200',
};

export const VersionCard: React.FC<VersionCardProps> = ({ version, index, query, filters }) => {
  const animationDelay = Math.min(index * 0.05, 0.3);
  const filteredChanges = filterChanges(version.changes, filters);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, delay: animationDelay, ease: 'easeOut' }}
      whileHover={{
        scale: 1.015,
        transition: { type: 'spring', stiffness: 380, damping: 26 },
      }}
    >
      <Card className="group relative flex h-full flex-col overflow-hidden border border-violet-100/70 bg-gradient-to-br from-violet-50/70 via-white to-indigo-50/60 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-xl dark:border-violet-900/40 dark:from-gray-950/60 dark:via-gray-900 dark:to-violet-950/40">
        <div
          className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(139,92,246,0.18) 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <CardHeader className="relative z-10 flex-1 space-y-3 px-4 pb-2 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                <CardTitle className="truncate text-lg font-bold text-gray-900 dark:text-gray-100">
                  {renderHighlightedText(
                    `v${version.version}`,
                    query,
                    'bg-violet-100/70 text-violet-900 rounded px-0.5 dark:bg-violet-500/30 dark:text-violet-50'
                  )}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {format(new Date(version.timestamp), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            {filteredChanges.length > 0 ? (
              filteredChanges.map((change, changeIndex) => (
              <div
                key={changeIndex}
                className="rounded-lg border border-gray-200/50 bg-white/50 p-2.5 dark:border-gray-700/50 dark:bg-gray-800/30"
              >
                <div className="mb-1.5 flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${changeTypeColors[change.changeType]}`}
                  >
                    {change.changeType}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${priorityColors[change.priority]}`}
                  >
                    {change.priority}
                  </Badge>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                  {renderHighlightedText(
                    change.description,
                    query,
                    'bg-amber-100/70 text-amber-900 rounded px-0.5 dark:bg-amber-500/30 dark:text-amber-50'
                  )}
                </p>
                {change.affectedDomains.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                    <Tag className="h-3 w-3 text-gray-400" />
                    {change.affectedDomains.map((domain, domainIndex) => (
                      <Badge
                        key={domainIndex}
                        variant="outline"
                        className="text-[9px] border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200"
                      >
                        {domain}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              ))
            ) : (
              <div className="rounded-lg border border-gray-200/50 bg-white/50 p-2.5 dark:border-gray-700/50 dark:bg-gray-800/30">
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  No changes match the current filters
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="relative z-10 flex items-center justify-between gap-3 px-4 pb-4 pt-0">
          <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
            <Badge
              variant="outline"
              className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200"
            >
              {filteredChanges.length} change{filteredChanges.length !== 1 ? 's' : ''}
              {filteredChanges.length !== version.changes.length && (
                <span className="ms-1 text-gray-400">/ {version.changes.length}</span>
              )}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

