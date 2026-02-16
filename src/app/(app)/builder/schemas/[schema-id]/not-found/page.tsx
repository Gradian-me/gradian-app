'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { SchemaNotFound } from '@/gradian-ui/schema-manager/components';

export default function BuilderSchemaNotFoundPage({
  params,
}: {
  params: Promise<{ 'schema-id': string }>;
}) {
  const router = useRouter();
  const [schemaId, setSchemaId] = useState<string>('');

  useEffect(() => {
    params.then((resolvedParams) => {
      setSchemaId(resolvedParams['schema-id']);
    });
  }, [params]);

  useSetLayoutProps({
    title: 'Schema Not Found',
    subtitle: schemaId ? `We couldn't find a schema with the ID "${schemaId}".` : undefined,
    showEndLine: false,
  });

  return (
      <SchemaNotFound
        onGoBack={() => router.push('/builder/schemas')}
        showGoBackButton
        showHomeButton
        homeHref="/builder/schemas"
      />
  );
}
