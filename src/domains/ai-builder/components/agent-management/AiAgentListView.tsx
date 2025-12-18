'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PencilRuler, Trash2, Sparkles, Code } from 'lucide-react';
import { AiAgent } from '../../types';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { UI_PARAMS } from '@/gradian-ui/shared/configs/ui-config';

interface AiAgentListViewProps {
  agents: AiAgent[];
  onEdit: (agent: AiAgent) => void;
  onView: (agent: AiAgent) => void;
  onDelete: (agent: AiAgent) => void;
}

interface AiAgentListItemProps {
  agent: AiAgent;
  index: number;
  onEdit: (agent: AiAgent) => void;
  onView: (agent: AiAgent) => void;
  onDelete: (agent: AiAgent) => void;
}

const AiAgentListItemComponent = memo(
  ({ agent, index, onEdit, onView, onDelete }: AiAgentListItemProps) => {
    const animationDelay = Math.min(
      index * UI_PARAMS.CARD_INDEX_DELAY.STEP,
      UI_PARAMS.CARD_INDEX_DELAY.MAX,
    );
    const renderComponentsCount = agent.renderComponents?.length ?? 0;
    const preloadRoutesCount = agent.preloadRoutes?.length ?? 0;
    const showStats = renderComponentsCount > 0 || preloadRoutesCount > 0;

    return (
      <motion.div
        initial={{ opacity: 0, x: -20, scale: 0.99 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.18, delay: animationDelay, ease: 'easeOut' }}
        whileHover={{
          scale: 1.01,
          transition: { type: 'spring', stiffness: 420, damping: 22 },
        }}
        className="group relative flex items-center gap-4 overflow-hidden rounded-xl border p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300/80 hover:shadow-lg border-blue-100/80 bg-gradient-to-r from-blue-50/90 via-white to-cyan-50/80 dark:border-slate-700/80 dark:bg-gradient-to-r dark:from-slate-900/85 dark:via-slate-900/80 dark:to-zinc-900/80"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 2px 2px, rgba(148,163,184,0.30) 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative z-10 flex items-center gap-3 flex-1 min-w-0">
          {agent.icon && (
            <IconRenderer
              iconName={agent.icon}
              className="h-8 w-8 shrink-0 text-blue-600 dark:text-blue-300"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold truncate text-gray-900 dark:text-gray-100">
                {agent.label}
              </h3>
              {agent.model && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {agent.model}
                </Badge>
              )}
              {agent.requiredOutputFormat && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                  {agent.requiredOutputFormat}
                </Badge>
              )}
            </div>
            {agent.description && (
              <p className="text-sm line-clamp-1 text-gray-500 dark:text-gray-400">
                {agent.description}
              </p>
            )}
            {showStats && (
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
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
            )}
          </div>
        </div>
        <div className="relative z-10 flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onView(agent)}
            className="h-8 w-8 rounded-full text-gray-500 hover:text-blue-700 hover:bg-blue-50/80 dark:text-gray-400 dark:hover:text-blue-200 dark:hover:bg-blue-500/10"
            title="View Agent"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(agent)}
            className="h-8 w-8 rounded-full text-gray-500 hover:text-blue-700 hover:bg-blue-50/80 dark:text-gray-400 dark:hover:text-blue-200 dark:hover:bg-blue-500/10"
            title="Edit Agent"
          >
            <PencilRuler className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(agent)}
            className="h-8 w-8 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50/80"
            title="Delete Agent"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    );
  },
);

AiAgentListItemComponent.displayName = 'AiAgentListItemComponent';

export function AiAgentListView({ agents, onEdit, onView, onDelete }: AiAgentListViewProps) {
  return (
    <div className="space-y-3">
      {agents.map((agent, index) => (
        <AiAgentListItemComponent
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

