'use client';

import { useState, useEffect } from 'react';
import { AiAgentManagerWrapper } from '@/domains/ai-builder/components/agent-management/AiAgentManagerWrapper';
import { ENABLE_BUILDER } from '@/gradian-ui/shared/configs/env-config';
import { AccessDenied } from '@/gradian-ui/schema-manager/components/AccessDenied';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';

export default function AiAgentsBuilderPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useSetLayoutProps(
    !mounted ? {} : !ENABLE_BUILDER ? { title: 'Access Denied', subtitle: 'The builder is disabled in this environment.', icon: 'OctagonMinus' } : {}
  );

  if (!mounted) {
    return null;
  }

  if (!ENABLE_BUILDER) {
    return (
      <AccessDenied
          title="Access to AI Agents Builder is Disabled"
          description="The AI agents builder is not available in this environment."
          helperText="If you believe you should have access, please contact your system administrator."
          homeHref="/apps"
          showGoBackButton={false}
        />
    );
  }

  return <AiAgentManagerWrapper />;
}

