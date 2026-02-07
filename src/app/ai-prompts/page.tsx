'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { useBackIcon } from '@/gradian-ui/shared/hooks';
import { AiPromptHistory } from '@/domains/ai-prompts';

export default function AiPromptsPage() {
  const router = useRouter();
  const BackIcon = useBackIcon();

  return (
    <MainLayout
      title="AI Prompt History"
      subtitle="View and search through your AI prompt history"
      icon="History"
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.push('/ai-builder')}
          className="mb-2"
        >
          <BackIcon className="h-4 w-4 me-2" />
          Back to AI Builder
        </Button>

        <AiPromptHistory />
      </div>
    </MainLayout>
  );
}

