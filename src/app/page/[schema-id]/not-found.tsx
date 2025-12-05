'use client';

import { MainLayout } from '../../../components/layout/main-layout';
import { SchemaNotFound } from '@/gradian-ui/schema-manager/components';

export default function NotFoundPage() {
  return (
    <MainLayout title="Page Not Found" showEndLine={false}>
      <SchemaNotFound />
    </MainLayout>
  );
}

