'use client';

import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { AccessDenied } from '@/gradian-ui/schema-manager/components/AccessDenied';

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <MainLayout
      title="Access Forbidden"
      subtitle="You don't have permission to access this page."
    >
      <AccessDenied
        title="Access Forbidden"
        description="This page is only available in development mode."
        helperText="This page is restricted to development environments only."
        onGoBack={() => router.push('/apps')}
        showGoBackButton={true}
        showHomeButton={true}
        homeHref="/apps"
      />
    </MainLayout>
  );
}

