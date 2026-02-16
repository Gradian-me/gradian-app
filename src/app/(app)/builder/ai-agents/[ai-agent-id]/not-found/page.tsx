'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { AiAgentNotFound } from '@/domains/ai-builder';

export default function AiAgentNotFoundPage({
  params,
}: {
  params: Promise<{ 'ai-agent-id': string }>;
}) {
  const router = useRouter();
  const [agentId, setAgentId] = useState<string>('');

  useEffect(() => {
    params.then((resolvedParams) => {
      setAgentId(resolvedParams['ai-agent-id']);
    });
  }, [params]);

  useSetLayoutProps({
    title: 'Agent Not Found',
    subtitle: agentId ? `We couldn't find an AI agent with the ID "${agentId}".` : undefined,
    showEndLine: false,
  });

  return (
      <AiAgentNotFound
        onGoBack={() => router.push('/builder/ai-agents')}
        showGoBackButton
        showHomeButton
        homeHref="/builder/ai-agents"
      />
  );
}

