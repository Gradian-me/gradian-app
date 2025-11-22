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
import { MetricCard } from '@/gradian-ui/analytics';
import { ResponseCardViewer } from './ResponseCardViewer';
import { ResponseAnnotationViewer } from './ResponseAnnotationViewer';
import type { AiAgent, TokenUsage, SchemaAnnotation, AnnotationItem } from '../types';

interface AiBuilderResponseProps {
  response: string;
  agent: AiAgent | null;
  tokenUsage: TokenUsage | null;
  isApproving: boolean;
  onApprove: () => void;
  onCardClick?: (cardData: { id: string; label: string; icon?: string }, schemaData: any) => void;
  annotations?: SchemaAnnotation[];
  onAnnotationsChange?: (schemaId: string, annotations: AnnotationItem[]) => void;
  onRemoveSchema?: (schemaId: string) => void;
  onApplyAnnotations?: (annotations: SchemaAnnotation[]) => void;
}

export function AiBuilderResponse({
  response,
  agent,
  tokenUsage,
  isApproving,
  onApprove,
  onCardClick,
  annotations = [],
  onAnnotationsChange,
  onRemoveSchema,
  onApplyAnnotations,
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

      {/* Token Usage & Pricing - MetricCard */}
      {tokenUsage && (
        <MetricCard
          metrics={[
            {
              id: 'total-tokens',
              label: 'Total Tokens',
              value: tokenUsage.total_tokens,
              unit: 'tokens',
              icon: 'Hash',
              iconColor: 'violet',
              format: 'number',
            },
            {
              id: 'total-cost',
              label: 'Total Cost',
              value: tokenUsage.pricing?.total_cost || 0,
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
      )}

      {agent?.responseCards && agent.responseCards.length > 0 && onCardClick && (
        <ResponseCardViewer
          response={response}
          responseCards={agent.responseCards}
          onCardClick={onCardClick}
        />
      )}

      {/* Schema Annotations - shown on top of AI generated content */}
      {annotations.length > 0 && onAnnotationsChange && onRemoveSchema && (
        <ResponseAnnotationViewer
          annotations={annotations}
          onAnnotationsChange={onAnnotationsChange}
          onRemoveSchema={onRemoveSchema}
          onApply={onApplyAnnotations}
        />
      )}

      <CodeViewer
        code={response}
        programmingLanguage={agent?.requiredOutputFormat === 'json' ? 'json' : 'text'}
        title="AI Generated Content"
        initialLineNumbers={10}
      />
    </div>
  );
}

