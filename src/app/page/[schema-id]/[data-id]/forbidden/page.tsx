'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { AccessDenied } from '@/gradian-ui/schema-manager/components/AccessDenied';
import { AccessCheckResult } from '@/gradian-ui/shared/utils/access-control';

export default function DataForbiddenPage({
  params,
}: {
  params: Promise<{ 'schema-id': string; 'data-id': string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const schemaId = resolvedParams['schema-id'];
  const dataId = resolvedParams['data-id'];

  // Parse accessCheck from URL search params if provided
  const [accessCheck, setAccessCheck] = useState<AccessCheckResult | undefined>(undefined);

  useEffect(() => {
    const reason = searchParams.get('reason');
    const code = searchParams.get('code') as AccessCheckResult['code'] | null;
    const requiredRole = searchParams.get('requiredRole');

    if (reason || code) {
      setAccessCheck({
        hasAccess: false,
        reason: reason || undefined,
        code: code || undefined,
        requiredRole: requiredRole || undefined,
        schemaId: schemaId,
        dataId: dataId,
      });
    }
  }, [searchParams, schemaId, dataId]);

  return (
    <MainLayout
      title="Access Denied"
      subtitle={schemaId ? `You don't have permission to access this record in "${schemaId}".` : undefined}
    >
      <AccessDenied
        title="Access Denied"
        description={accessCheck?.reason || `You don't have permission to access this record${dataId ? ` (${dataId})` : ''}${schemaId ? ` in schema "${schemaId}"` : ''}.`}
        helperText="If you believe you should have access, please contact your system administrator."
        onGoBack={() => router.push(`/page/${schemaId}`)}
        showGoBackButton={true}
        showHomeButton={true}
        homeHref="/apps"
        accessCheck={accessCheck}
      />
    </MainLayout>
  );
}

