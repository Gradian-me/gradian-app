'use client';

import React from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { AiBuilderWrapper } from '@/domains/ai-builder/components/AiBuilderWrapper';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';

export default function AiBuilderPage() {
  return (
    <MainLayout
      title="AI Builder"
      subtitle="Transform your ideas into reality with the power of AI"
      icon="Sparkles"
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex justify-end">
          <Link href="/builder/ai-agents">
            <Button variant="outline" size="sm">
              <Bot className="h-4 w-4 me-2" />
              Manage AI Agents
            </Button>
          </Link>
        </div>
        <AiBuilderWrapper mode="page" />
      </div>
    </MainLayout>
  );
}
