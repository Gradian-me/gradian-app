'use client';

import React from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { AiBuilderWrapper } from '@/domains/ai-builder/components/AiBuilderWrapper';

export default function AiBuilderPage() {
  return (
    <MainLayout
      title="AI Builder"
      subtitle="Transform your ideas into reality with the power of AI"
      icon="Sparkles"
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        <AiBuilderWrapper mode="page" />
      </div>
    </MainLayout>
  );
}
