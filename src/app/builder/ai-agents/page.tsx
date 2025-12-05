import { Metadata } from 'next';
import { AiAgentManagerWrapper } from '@/domains/ai-builder/components/agent-management/AiAgentManagerWrapper';

export const metadata: Metadata = {
  title: 'AI Agents Builder | Gradian',
  description: 'Create, edit, and manage AI agents for your application.',
};

export default function AiAgentsBuilderPage() {
  return <AiAgentManagerWrapper />;
}

