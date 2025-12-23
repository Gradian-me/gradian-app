import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { findSchemaById, getAllSchemasArray } from '@/gradian-ui/schema-manager/utils/schema-registry.server';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { readSchemaData } from '@/gradian-ui/shared/domain/utils/data-storage.util';
import { CustomPageClient } from './CustomPageClient';

interface PageProps {
  params: Promise<{
    'page-id': string;
  }>;
}

function serializeSchema(schema: FormSchema): any {
  return JSON.parse(JSON.stringify(schema, (key, value) => {
    if (value instanceof RegExp) {
      return {
        __regexp: true,
        source: value.source,
        flags: value.flags,
      };
    }
    return value;
  }));
}

export default async function CustomPage({ params }: PageProps) {
  const { 'page-id': pageId } = await params;

  // Load pages schema
  const pagesSchema = await findSchemaById('pages');
  if (!pagesSchema) {
    notFound();
  }

  // Find page entity by pageId field - load directly from server-side data
  const pagesData = readSchemaData<any>('pages') || [];
  const pageEntity = pagesData.find((p: any) => p.pageId === pageId && p.isActive !== false);

  if (!pageEntity) {
    notFound();
  }

  // Parse detailPageMetadata if it's a string
  let pageMetadata = {};
  if (pageEntity.detailPageMetadata) {
    try {
      pageMetadata = typeof pageEntity.detailPageMetadata === 'string'
        ? JSON.parse(pageEntity.detailPageMetadata)
        : pageEntity.detailPageMetadata;
    } catch (err) {
      console.error('Failed to parse page metadata:', err);
    }
  }

  // Load target schema if specified
  let targetSchema: FormSchema | null = null;
  if (pageEntity.targetSchema) {
    try {
      targetSchema = await findSchemaById(pageEntity.targetSchema);
      // For now, we'll load data in the client component
      // This allows for more flexible data loading based on page configuration
    } catch (err) {
      console.warn('Failed to load target schema:', err);
    }
  }

  // Load navigation schemas
  let navigationSchemas: FormSchema[] = [];
  try {
    navigationSchemas = await getAllSchemasArray();
  } catch (error) {
    console.warn('Failed to load all schemas for navigation:', error);
    navigationSchemas = pagesSchema ? [pagesSchema] : [];
  }

  const serializedPagesSchema = serializeSchema(pagesSchema);
  const serializedTargetSchema = targetSchema ? serializeSchema(targetSchema) : null;
  const serializedNavigationSchemas = navigationSchemas.map(serializeSchema);

  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    }>
      <CustomPageClient
        pageEntity={pageEntity}
        pageMetadata={pageMetadata}
        pagesSchema={serializedPagesSchema}
        targetSchema={serializedTargetSchema}
        navigationSchemas={serializedNavigationSchemas}
      />
    </Suspense>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { 'page-id': pageId } = await params;
  
  // Load page entity directly from server-side data
  const pagesData = readSchemaData<any>('pages') || [];
  const pageEntity = pagesData.find((p: any) => p.pageId === pageId);

  return {
    title: pageEntity?.pageTitle ? `${pageEntity.pageTitle} | Gradian` : `Custom Page | Gradian`,
    description: pageEntity?.pageDescription || 'Custom page',
  };
}

