// Message Metadata Dialog Component
// Shows message metadata including tokens, cost, duration, and execution type

'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MetricCard } from '@/gradian-ui/analytics/indicators/metric-card/components/MetricCard';
import { Badge } from '@/gradian-ui/form-builder/form-elements/components/Badge';
import { Hash, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '../types';

export interface MessageMetadataDialogProps {
  message: ChatMessage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MessageMetadataDialog: React.FC<MessageMetadataDialogProps> = ({
  message,
  open,
  onOpenChange,
}) => {
  const tokenUsage = message?.metadata?.tokenUsage;
  const duration = message?.metadata?.duration;
  const cost = message?.metadata?.cost;
  const executionType = message?.metadata?.executionType;
  const hashtags = message?.hashtags || [];
  const mentions = message?.mentions || [];

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

  if (!message) return null;

  // Format execution type for display
  const formatExecutionType = (type: string | undefined): string => {
    if (!type) return 'Unknown';
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] h-auto md:max-w-4xl md:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-10">
            <DialogTitle>Message Metadata</DialogTitle>
            {executionType && (
              <Badge
                color="indigo"
                size="md"
                className="ml-2"
              >
                {formatExecutionType(executionType)}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 p-2">
          {/* MetricCard */}
          {metrics.length > 0 ? (
            <MetricCard
              metrics={metrics}
              footer={{
                icon: 'Sparkles',
                text: 'Powered by Gradian AI • Efficient & Cost-Effective',
              }}
              gradient="indigo"
            />
          ) : (
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-center text-sm text-gray-500 dark:text-gray-400">
              No metrics available for this message
            </div>
          )}

          {/* Additional Info */}
          {message.agentId && (
            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">Agent:</span>{' '}
                <span className="text-gray-600 dark:text-gray-400">{message.agentId}</span>
              </div>
              {message.agentType && (
                <div className="text-sm mt-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Type:</span>{' '}
                  <span className="text-gray-600 dark:text-gray-400">{message.agentType}</span>
                </div>
              )}
            </div>
          )}

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Hashtags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {hashtags.map((hashtag, index) => (
                  <Badge
                    key={index}
                    color="blue"
                    size="sm"
                    className="cursor-default"
                  >
                    #{hashtag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Mentions */}
          {mentions.length > 0 && (
            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 mb-2">
                <AtSign className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mentions</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {mentions.map((mention, index) => (
                  <Badge
                    key={index}
                    color="violet"
                    size="sm"
                    className="cursor-default"
                  >
                    @{mention}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

MessageMetadataDialog.displayName = 'MessageMetadataDialog';

