'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PencilRuler, Trash2, Sparkles, Code } from 'lucide-react';
import { AiAgent } from '../../types';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { UI_PARAMS } from '@/gradian-ui/shared/configs/ui-config';

interface AiAgentCardGridProps {
  agents: AiAgent[];
  onEdit: (agent: AiAgent) => void;
  onView: (agent: AiAgent) => void;
  onDelete: (agent: AiAgent) => void;
}

interface AiAgentCardProps {
  agent: AiAgent;
  index: number;
  onEdit: (agent: AiAgent) => void;
  onView: (agent: AiAgent) => void;
  onDelete: (agent: AiAgent) => void;
}

interface AiAgentCardSkeletonGridProps {
  count?: number;
}

const AiAgentCardComponent = memo(({ agent, index, onEdit, onView, onDelete }: AiAgentCardProps) => {
  const animationDelay = Math.min(index * UI_PARAMS.CARD_INDEX_DELAY.STEP, UI_PARAMS.CARD_INDEX_DELAY.MAX);
  const renderComponentsCount = agent.renderComponents?.length ?? 0;
  const preloadRoutesCount = agent.preloadRoutes?.length ?? 0;
  const showStats = renderComponentsCount > 0 || preloadRoutesCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, delay: animationDelay, ease: 'easeOut' }}
      whileHover={{
        scale: 1.01,
        transition: { type: 'spring', stiffness: 420, damping: 22 },
      }}
    >
      <Card
        className="group relative flex h-full flex-col overflow-hidden border shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300/80 hover:shadow-lg border-blue-100/80 bg-gradient-to-br from-blue-50/90 via-white to-cyan-50/80 dark:border-slate-700/80 dark:bg-gradient-to-br dark:from-slate-900/85 dark:via-slate-900/80 dark:to-zinc-900/80"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 2px 2px, rgba(148,163,184,0.30) 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <CardHeader className="relative z-10 pb-3 pt-4 px-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                {agent.icon && (
                  <IconRenderer 
                    iconName={agent.icon} 
                    className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300" 
                  />
                )}
                <CardTitle className="text-base font-semibold truncate text-gray-900 dark:text-gray-100">
                  {agent.label}
                </CardTitle>
              </div>
              {agent.description && (
                <p className="text-xs line-clamp-2 mt-1 text-gray-500 dark:text-gray-400">
                  {agent.description}
                </p>
              )}
            </div>
            <div className="flex gap-0.5 ms-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onView(agent)}
                className="h-7 w-7 rounded-full text-gray-500 hover:text-blue-700 hover:bg-blue-50/80 dark:text-gray-400 dark:hover:text-blue-200 dark:hover:bg-blue-500/10"
                title="View Agent"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(agent)}
                className="h-7 w-7 rounded-full text-gray-500 hover:text-blue-700 hover:bg-blue-50/80 dark:text-gray-400 dark:hover:text-blue-200 dark:hover:bg-blue-500/10"
                title="Edit Agent"
              >
                <PencilRuler className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(agent)}
                className="h-7 w-7 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50/80"
                title="Delete Agent"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {showStats && (
          <CardContent className="relative z-10 pt-2 px-4 pb-3">
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              {renderComponentsCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <Code className="h-3.5 w-3.5" />
                  <span>{renderComponentsCount} Components</span>
                </div>
              )}
              {preloadRoutesCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{preloadRoutesCount} Routes</span>
                </div>
              )}
            </div>
          </CardContent>
        )}
        {(agent.model || agent.requiredOutputFormat) && (
          <CardContent className="relative z-10 pt-0 px-4 pb-4 mt-auto">
            <div className="flex items-center justify-end gap-2">
              {agent.model && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {agent.model}
                </Badge>
              )}
              {agent.requiredOutputFormat && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                  {agent.requiredOutputFormat}
                </Badge>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
});

AiAgentCardComponent.displayName = 'AiAgentCardComponent';

export function AiAgentCardGrid({ agents, onEdit, onView, onDelete }: AiAgentCardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent, index) => (
        <AiAgentCardComponent
          key={agent.id}
          agent={agent}
          index={index}
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export function AiAgentCardSkeletonGrid({ count = 6 }: AiAgentCardSkeletonGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.25,
            delay: Math.min(index * UI_PARAMS.CARD_INDEX_DELAY.STEP, UI_PARAMS.CARD_INDEX_DELAY.SKELETON_MAX ?? 0.25),
            ease: 'easeOut',
          }}
        >
          <div className="h-32 rounded-xl border border-blue-100/70 bg-gradient-to-br from-blue-50/70 via-white to-cyan-50/70 shadow-sm dark:border-slate-700/80 dark:bg-gradient-to-br dark:from-slate-900/85 dark:via-slate-900/80 dark:to-zinc-900/80 animate-pulse" />
        </motion.div>
      ))}
    </div>
  );
}

