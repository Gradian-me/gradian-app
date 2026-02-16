'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DynamicQueryBuilderPage } from '@/domains/dynamic-query-builder';
import { ENABLE_BUILDER } from '@/gradian-ui/shared/configs/env-config';
import { AccessDenied } from '@/gradian-ui/schema-manager/components/AccessDenied';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';

export default function DynamicQueryBuilderRoutePage() {
  const params = useParams();
  const dynamicQueryId = params['dynamic-query-id'] as string | undefined;
  const [initialEntity, setInitialEntity] = useState<Record<string, unknown> | null | undefined>(
    undefined
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !dynamicQueryId || dynamicQueryId === 'new') {
      setInitialEntity(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/data/dynamic-queries/${dynamicQueryId}`, {
          credentials: 'include',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          if (!cancelled) setInitialEntity(null);
          return;
        }
        const data = await res.json();
        const entity = data?.data ?? data;
        if (!cancelled) {
          setInitialEntity(entity && typeof entity === 'object' && entity.id ? entity : null);
        }
      } catch {
        if (!cancelled) setInitialEntity(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, dynamicQueryId]);

  const isLoading = dynamicQueryId && dynamicQueryId !== 'new' && initialEntity === undefined;
  useSetLayoutProps(
    !mounted ? {} : !ENABLE_BUILDER
      ? { title: 'Access Denied', subtitle: 'The builder is disabled in this environment.', icon: 'OctagonMinus', showEndLine: false }
      : { title: isLoading ? 'Dynamic Query Builder' : 'Dynamic Query Builder', subtitle: isLoading ? 'Loading...' : 'Design and manage dynamic query patterns', icon: 'GitBranch', showEndLine: false }
  );

  if (!mounted) {
    return null;
  }

  if (!ENABLE_BUILDER) {
    return (
      <AccessDenied
        title="Access to Dynamic Query Builder is Disabled"
        description="The dynamic query builder is not available in this environment."
        helperText="If you believe you should have access, please contact your system administrator."
        homeHref="/apps"
        showGoBackButton={false}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          <p className="text-sm text-muted-foreground">Loading dynamic query...</p>
        </div>
      </div>
    );
  }

  return (
      <DynamicQueryBuilderPage
        initialEntity={dynamicQueryId && dynamicQueryId !== 'new' ? initialEntity ?? null : null}
      />
  );
}
