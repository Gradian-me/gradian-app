'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { ENABLE_BUILDER } from '@/gradian-ui/shared/configs/env-config';
import { AccessDenied } from '@/gradian-ui/schema-manager/components/AccessDenied';
import { DynamicDetailPageClient } from '@/app/(app)/page/[schema-id]/[data-id]/DynamicDetailPageClient';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import dynamic from 'next/dynamic';

interface PageEditorPageProps {
  params: Promise<{ 'page-id': string }>;
}

// Dynamically import with SSR disabled
const PageEditorClient = dynamic(
  () => import('./PageEditorClient').then(mod => ({ default: mod.PageEditorClient })),
  { 
    ssr: false,
    loading: () => (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      </div>
    ),
  }
);

export default function PageEditorPage({ params }: PageEditorPageProps) {
  const [pageId, setPageId] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    params.then((resolved) => {
      setPageId(resolved['page-id']);
    });
  }, [params]);

  useSetLayoutProps(
    !mounted ? {} : !ENABLE_BUILDER ? { title: 'Access Denied', subtitle: 'The builder is disabled in this environment.', icon: 'OctagonMinus' } : {}
  );

  if (!mounted) {
    return null;
  }

  if (!ENABLE_BUILDER) {
    return (
      <AccessDenied
        title="Access to Page Builder is Disabled"
        description="The page builder is not available in this environment."
        helperText="If you believe you should have access, please contact your system administrator."
        homeHref="/apps"
        showGoBackButton={false}
      />
    );
  }

  if (!pageId) {
    return null;
  }

  return <PageEditorClient pageId={pageId} />;
}

