/**
 * AI Builder Response Component
 * Displays the AI response with actions
 */

'use client';

import React from 'react';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { Button } from '@/components/ui/button';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Loader2 } from 'lucide-react';
import type { AiAgent, TokenUsage } from '../types';

interface AiBuilderResponseProps {
  response: string;
  agent: AiAgent | null;
  tokenUsage: TokenUsage | null;
  isApproving: boolean;
  onApprove: () => void;
}

export function AiBuilderResponse({
  response,
  agent,
  tokenUsage,
  isApproving,
  onApprove,
}: AiBuilderResponseProps) {
  if (!response) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Your Creation
        </h2>
        <div className="flex items-center gap-3">
          {tokenUsage && (
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <span>
                Tokens: {tokenUsage.prompt_tokens}
                {tokenUsage.pricing && ` ($${tokenUsage.pricing.input_price_per_1m.toFixed(2)}/1M)`}
                {' + '}
                {tokenUsage.completion_tokens}
                {tokenUsage.pricing && ` ($${tokenUsage.pricing.output_price_per_1m.toFixed(2)}/1M)`}
                {' = '}
                {tokenUsage.total_tokens}
                {tokenUsage.pricing && ` | Total: $${tokenUsage.pricing.total_cost.toFixed(4)}`}
              </span>
            </div>
          )}
          {agent?.nextAction && (
            <Button
              onClick={onApprove}
              disabled={isApproving}
              variant="default"
              size="default"
            >
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {agent.nextAction.icon && (
                    <IconRenderer 
                      iconName={agent.nextAction.icon} 
                      className="mr-2 h-4 w-4" 
                    />
                  )}
                  {agent.nextAction.label}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      <CodeViewer
        code={response}
        programmingLanguage={agent?.requiredOutputFormat === 'json' ? 'json' : 'text'}
        title="AI Generated Content"
        initialLineNumbers={30}
      />
    </div>
  );
}

