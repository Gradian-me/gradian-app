'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { AiPromptHistory } from '@/domains/ai-prompts';

export default function AiPromptsPage() {
  const router = useRouter();

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
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to AI Builder
        </Button>

        <AiPromptHistory />
      </div>
    </MainLayout>
  );
}

