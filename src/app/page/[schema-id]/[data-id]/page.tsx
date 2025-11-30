// Dynamic Detail Page Route
// Renders detail page for any entity based on schema ID and data ID
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { DynamicDetailPageClient } from './DynamicDetailPageClient';
import { getAllSchemasArray } from '@/gradian-ui/schema-manager/utils/schema-registry.server';

// Set revalidate to 0 to force dynamic rendering
// This ensures schema changes are reflected immediately when cache is cleared
// In production, you can change this to 60 for ISR caching
export const revalidate = 0;

interface PageProps {
  params: Promise<{
    'schema-id': string;
    'data-id': string;
  }>;
}

/**
 * Serialize schema to remove RegExp and other non-serializable objects
 */
function serializeSchema(schema: FormSchema): any {
  return JSON.parse(JSON.stringify(schema, (key, value) => {
    // Convert RegExp to a serializable format with marker
    if (value instanceof RegExp) {
      return {
        __regexp: true,
        source: value.source,
        flags: value.flags
      };
    }
    return value;
  }));
}

export default async function DynamicDetailPage({ params }: PageProps) {
  const { 'schema-id': schemaId, 'data-id': dataId } = await params;
  const navigationSchemas = await getAllSchemasArray();
  const schema = navigationSchemas.find((entry) => entry.id === schemaId) ?? null;

  if (!schema) {
    notFound();
  }

  // Serialize schema to make it safe for Client Component
  const serializedSchema = serializeSchema(schema);
  const serializedNavigationSchemas = navigationSchemas.map(serializeSchema);

  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    }>
      <DynamicDetailPageClient 
        schema={serializedSchema}
        dataId={dataId}
        schemaId={schemaId}
        entityName={schema.singular_name || 'Entity'}
        navigationSchemas={serializedNavigationSchemas}
      />
    </Suspense>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { 'schema-id': schemaId, 'data-id': dataId } = await params;
  // Use getAllSchemasArray and find schema for consistency and reliability
  const navigationSchemas = await getAllSchemasArray();
  const schema = navigationSchemas.find((entry) => entry.id === schemaId) ?? null;

  if (!schema) {
    return {
      title: 'Not Found',
    };
  }

  return {
    title: `${schema.singular_name || 'Entity'} Details | Gradian`,
    description: `View details for ${schema.singular_name?.toLowerCase() || 'entity'}`,
  };
}

