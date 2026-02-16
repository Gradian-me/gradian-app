'use client';

import { useState, useEffect } from 'react';
import SchemaBuilderClient from './SchemaBuilderClient';
import { ENABLE_BUILDER } from '@/gradian-ui/shared/configs/env-config';
import { AccessDenied } from '@/gradian-ui/schema-manager/components/AccessDenied';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';

export default function SchemaBuilderPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useSetLayoutProps(
    !mounted ? {} : !ENABLE_BUILDER ? { title: 'Access Denied', subtitle: 'The builder is disabled in this environment.', icon: 'OctagonMinus' } : {}
  );

  if (!mounted) {
    // Return null during SSR to prevent hydration mismatch
    return null;
  }

  if (!ENABLE_BUILDER) {
    return (
      <AccessDenied
          title="Access to Schema Builder is Disabled"
          description="The schema builder is not available in this environment."
          helperText="If you believe you should have access, please contact your system administrator."
          homeHref="/apps"
          showGoBackButton={false}
        />
    );
  }

  return <SchemaBuilderClient />;
}

