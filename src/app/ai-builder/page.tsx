'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { AiBuilderWrapper } from '@/domains/ai-builder/components/AiBuilderWrapper';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LOG_CONFIG, LogType } from '@/gradian-ui/shared/configs/log-config';

export default function AiBuilderPage() {
  const [mounted, setMounted] = useState(false);
  const [showModelBadge, setShowModelBadge] = useState(false);

  useEffect(() => {
    setMounted(true);
    setShowModelBadge(LOG_CONFIG[LogType.AI_MODEL_LOG] === true);
  }, []);

  return (
    <MainLayout
      title="AI Builder"
      subtitle="Transform your ideas into reality with the power of AI"
      icon="Sparkles"
      showEndLine={true}
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          {mounted && showModelBadge ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-violet-500" />
              <Badge
                variant="outline"
                className="text-xs font-medium bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800"
              >
                AI Model Logging Enabled
              </Badge>
            </div>
          ) : (
            <span />
          )}
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
