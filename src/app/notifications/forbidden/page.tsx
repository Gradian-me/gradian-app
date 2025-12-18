'use client';

import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { AccessDenied } from '@/gradian-ui/schema-manager/components/AccessDenied';

export default function NotificationsForbiddenPage() {
  const router = useRouter();

  return (
    <MainLayout
      title="Access Denied"
      subtitle="You don't have permission to access notifications."
    >
      <AccessDenied
        title="Access Denied"
        description="You don't have permission to access notifications in this environment."
        helperText="If you believe you should have access, please contact your system administrator."
        onGoBack={() => router.push('/apps')}
        showGoBackButton={true}
        showHomeButton={true}
        homeHref="/apps"
        accessCheck={undefined}
      />
    </MainLayout>
  );
}


