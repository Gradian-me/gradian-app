// Todo Response Dialog Component
// Shows todo execution results with MetricCard and content

'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MetricCard } from '@/gradian-ui/analytics/indicators/metric-card/components/MetricCard';
import { MarkdownViewer } from '@/gradian-ui/data-display/markdown/components/MarkdownViewer';
import { DynamicAiAgentResponseContainer } from '@/gradian-ui/data-display/components/DynamicAiAgentResponseContainer';
import { ImageViewer } from '@/gradian-ui/form-builder/form-elements/components/ImageViewer';
import type { Todo } from '../types';
import type { QuickAction, FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';

export interface TodoResponseDialogProps {
  todo: Todo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TodoResponseDialog: React.FC<TodoResponseDialogProps> = ({
  todo,
  open,
  onOpenChange,
}) => {
  const tokenUsage = todo?.tokenUsage;
  const duration = todo?.duration;
  const cost = todo?.cost;
  const output = todo?.output;
  const responseFormat = todo?.responseFormat || 'string';

  // Prepare metrics for MetricCard
  const metrics = React.useMemo(() => {
    const metricItems: any[] = [];

    if (tokenUsage) {
      metricItems.push({
        id: 'total-tokens',
        label: 'Total Tokens',
        value: tokenUsage.total_tokens,
        unit: 'tokens',
        icon: 'Hash',
        iconColor: 'violet' as const,
        format: 'number' as const,
      });

      if (tokenUsage.pricing) {
        metricItems.push({
          id: 'total-cost',
          label: 'Total Cost',
          value: tokenUsage.pricing.total_cost,
          prefix: '$',
          icon: 'Coins',
          iconColor: 'emerald' as const,
          format: 'currency' as const,
          precision: 4,
        });
      }
    }

    if (duration !== undefined && duration !== null) {
      metricItems.push({
        id: 'duration',
        label: 'Duration',
        value: duration < 1000 ? duration : duration / 1000,
        unit: duration < 1000 ? 'ms' : 's',
        icon: 'Timer',
        iconColor: 'blue' as const,
        format: 'number' as const,
        precision: duration < 1000 ? 0 : 2,
      });
    }

    if (cost !== undefined && cost !== null && !tokenUsage?.pricing) {
      metricItems.push({
        id: 'cost',
        label: 'Cost',
        value: cost,
        prefix: '$',
        icon: 'Coins',
        iconColor: 'emerald' as const,
        format: 'currency' as const,
        precision: 4,
      });
    }

    return metricItems;
  }, [tokenUsage, duration, cost]);

  if (!todo) return null;

  // Check if should render as DynamicAiAgentResponseContainer
  const shouldRenderAgentContainer = ['json', 'table', 'image', 'video'].includes(responseFormat);

  // For agent container, create mock action and schema
  const agentAction: QuickAction = {
    id: todo.id,
    label: todo.agentId || 'AI Response',
    icon: 'Sparkles',
    componentType: 'ai-agent-response',
    action: 'runAiAgent',
    agentId: todo.agentId,
  };

  const agentSchema: FormSchema = {
    id: 'todo-response',
    singular_name: 'Todo Response',
    plural_name: 'Todo Responses',
    description: 'AI generated response for todo',
    icon: 'BotMessageSquare',
    fields: [],
    sections: [],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <DialogTitle>{todo.title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* MetricCard */}
          {metrics.length > 0 && (
            <MetricCard
              metrics={metrics}
              footer={{
                icon: 'Sparkles',
                text: 'Powered by Gradian AI • Efficient & Cost-Effective',
              }}
              gradient="indigo"
            />
          )}

          {/* Response Content */}
          {output && (
            <div className="mt-4">
              {shouldRenderAgentContainer && responseFormat !== 'image' ? (
                <DynamicAiAgentResponseContainer
                  action={agentAction}
                  schema={agentSchema}
                  data={{ response: typeof output === 'string' ? output : JSON.stringify(output, null, 2) }}
                />
              ) : responseFormat === 'image' ? (
                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                  <ImageViewer
                    value={typeof output === 'object' ? output : undefined}
                    sourceUrl={
                      typeof output === 'string' && 
                      !output.startsWith('data:') && 
                      output.trim().length > 0 &&
                      (output.startsWith('/') || output.startsWith('http://') || output.startsWith('https://'))
                        ? output 
                        : undefined
                    }
                    content={typeof output === 'string' && output.startsWith('data:') ? output : undefined}
                    alt="Generated image"
                    width={1024}
                    height={1024}
                    objectFit="contain"
                    className="w-full"
                  />
                </div>
              ) : responseFormat === 'video' ? (
                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <video
                    src={typeof output === 'string' ? output : ''}
                    controls
                    className="w-full h-auto"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <MarkdownViewer
                    content={typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

TodoResponseDialog.displayName = 'TodoResponseDialog';

