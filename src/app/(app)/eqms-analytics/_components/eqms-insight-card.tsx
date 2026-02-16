'use client';

import { DynamicAiAgentResponseContainer } from '@/gradian-ui/data-display/components/DynamicAiAgentResponseContainer';
import type { QuickAction, FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';

type Props = {
  agentId: string;
  title: string;
  payload: Record<string, unknown>;
  prompt: string;
  runType?: 'automatic' | 'manual';
};

const schema: FormSchema = {
  id: 'eqms-analytics',
  name: 'EQMS Analytics',
  singular_name: 'EQMS Analytics',
  plural_name: 'EQMS Analytics',
  fields: [],
  sections: [],
};

export default function EqmsInsightCard({ agentId, title, payload, prompt, runType = 'manual' }: Props) {
  return (
    <DynamicAiAgentResponseContainer
      action={{
        id: `${title.toLowerCase().replace(/\s+/g, '-')}-insights`,
        label: title,
        action: 'runAiAgent',
        componentType: 'ai-agent-response',
        maxHeight: 800,
        agentId,
        runType,
        icon: 'Sparkles',
        variant: 'default',
        additionalSystemPrompt: prompt,
      } as QuickAction}
      schema={schema}
      data={payload}
      disableAnimation={false}
      index={0}
    />
  );
}

