'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { AiBuilderWrapper } from '@/domains/ai-builder/components/AiBuilderWrapper';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LOG_CONFIG, LogType } from '@/gradian-ui/shared/configs/log-config';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

function AiBuilderPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [showModelBadge, setShowModelBadge] = useState(false);
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();

  const initialAgentId = searchParams.get('agentId') ?? '';

  const handleAgentChange = useCallback(
    (agentId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (agentId) {
        params.set('agentId', agentId);
      } else {
        params.delete('agentId');
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    setMounted(true);
    setShowModelBadge(LOG_CONFIG[LogType.AI_MODEL_LOG] === true);
  }, []);

  useSetLayoutProps({
    title: getT(TRANSLATION_KEYS.AI_BUILDER_TITLE, language, defaultLang),
    subtitle: getT(TRANSLATION_KEYS.AI_BUILDER_SUBTITLE, language, defaultLang),
    icon: 'Sparkles',
    showEndLine: true,
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        {mounted && showModelBadge ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-violet-500" />
            <Badge
              variant="outline"
              className="text-xs font-medium bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800"
            >
              {getT(TRANSLATION_KEYS.AI_BUILDER_AI_MODEL_LOGGING_ENABLED, language, defaultLang)}
            </Badge>
          </div>
        ) : (
          <span />
        )}
        <Link href="/builder/ai-agents">
          <Button variant="outline" size="sm">
            <Bot className="h-4 w-4 me-2" />
            {getT(TRANSLATION_KEYS.AI_BUILDER_MANAGE_AGENTS, language, defaultLang)}
          </Button>
        </Link>
      </div>
      <AiBuilderWrapper mode="page" initialAgentId={initialAgentId} onAgentChange={handleAgentChange} />
    </div>
  );
}

export default function AiBuilderPage() {
  return (
    <Suspense fallback={<div className="space-y-6 max-w-5xl mx-auto animate-pulse h-48 rounded-md bg-muted" />}>
      <AiBuilderPageContent />
    </Suspense>
  );
}
