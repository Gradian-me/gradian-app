'use client';

import { DynamicAiAgentResponseContainer } from '@/gradian-ui/data-display/components/DynamicAiAgentResponseContainer';
import type { QuickAction, FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';

type Props = {
  title: string;
  payload: Record<string, unknown>;
  prompt: string;
  runType?: 'automatic' | 'manual';
};

const schema: FormSchema = {
  id: 'cost-intelligence',
  name: 'Cost Intelligence',
  singular_name: 'Cost Intelligence',
  plural_name: 'Cost Intelligence',
  fields: [],
  sections: [],
};

export default function CostInsightCard({ title, payload, prompt, runType = 'manual' }: Props) {
  return (
    <DynamicAiAgentResponseContainer
      action={{
        id: `${title.toLowerCase().replace(/\s+/g, '-')}-insights`,
        label: title,
        action: 'runAiAgent',
        componentType: 'ai-agent-response',
        maxHeight: 600,
        agentId: 'cost-intelligence',
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
