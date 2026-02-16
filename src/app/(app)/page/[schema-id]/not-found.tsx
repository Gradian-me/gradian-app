'use client';

'use client';

import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { SchemaNotFound } from '@/gradian-ui/schema-manager/components';

export default function NotFoundPage() {
  useSetLayoutProps({ title: 'Page Not Found', showEndLine: false });

  return <SchemaNotFound />;
}

