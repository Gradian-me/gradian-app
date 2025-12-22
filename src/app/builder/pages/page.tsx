'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { ENABLE_BUILDER } from '@/gradian-ui/shared/configs/env-config';
import { AccessDenied } from '@/gradian-ui/schema-manager/components/AccessDenied';
import dynamic from 'next/dynamic';

// Dynamically import DynamicPageRenderer with SSR disabled
const DynamicPageRenderer = dynamic(
  () => import('@/gradian-ui/data-display/components').then(mod => ({ default: mod.DynamicPageRenderer })),
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

export default function PagesBuilderPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (!ENABLE_BUILDER) {
    return (
      <MainLayout title="Access Denied" subtitle="The builder is disabled in this environment." icon="OctagonMinus">
        <AccessDenied
          title="Access to Page Builder is Disabled"
          description="The page builder is not available in this environment."
          helperText="If you believe you should have access, please contact your system administrator."
          homeHref="/apps"
          showGoBackButton={false}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Page Builder" subtitle="Create and manage custom pages" icon="FileText">
      <DynamicPageRenderer schemaId="pages" entityName="Page" />
    </MainLayout>
  );
}

