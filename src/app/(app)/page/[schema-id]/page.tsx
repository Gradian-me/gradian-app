// Dynamic Page Route
// Renders any entity page based on schema ID
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { DynamicEntityPageClient } from './DynamicEntityPageClient';
import { findSchemaById, getAvailableSchemaIds, getAllSchemasArray } from '@/gradian-ui/schema-manager/utils/schema-registry.server';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { checkSchemaAccess } from '@/gradian-ui/shared/utils/access-control';
import { getCurrentUser } from '@/gradian-ui/shared/utils/server-auth.util';

// Set revalidate to 0 to force dynamic rendering
// This ensures schema changes are reflected immediately when cache is cleared
// In production, you can change this to 60 for ISR caching
export const revalidate = 0;

interface PageProps {
  params: Promise<{
    'schema-id': string;
  }>;
}

export async function generateStaticParams() {
  const schemaIds = await getAvailableSchemaIds();
  
  return schemaIds.map((schemaId) => ({
    'schema-id': schemaId,
  }));
}

/**
 * Serialize schema to remove RegExp and other non-serializable objects
 * This is required when passing data from Server Components to Client Components
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

export default async function DynamicEntityPage({ params }: PageProps) {
  const { 'schema-id': schemaId } = await params;
  
  // Load the specific schema from API endpoint /api/schemas/[schema-id]
  const schema = await findSchemaById(schemaId);

  if (!schema) {
    notFound();
  }

  // Block action-form schemas from page rendering (no list/detail pages for action forms)
  if (schema.schemaType === 'action-form') {
    notFound();
  }
  
  // Load navigation schemas separately (for sidebar/navigation)
  // This is done after schema validation to avoid unnecessary loading if schema doesn't exist
  let navigationSchemas: FormSchema[] = [];
  try {
    navigationSchemas = await getAllSchemasArray();
  } catch (error) {
    // If loading all schemas fails, use just the current schema for navigation
    console.warn('Failed to load all schemas for navigation:', error);
    navigationSchemas = [schema];
  }

  // Check access permissions
  const user = await getCurrentUser();
  const accessCheck = checkSchemaAccess(schema, user);
  
  if (!accessCheck.hasAccess) {
    // Missing view permission → app-level forbidden (clean URL); other denials → schema-level forbidden
    if (accessCheck.code === 'VIEW_PERMISSION_REQUIRED') {
      redirect('/forbidden');
    }
    const searchParams = new URLSearchParams();
    if (accessCheck.code) searchParams.set('code', accessCheck.code);
    if (accessCheck.requiredPermission) searchParams.set('requiredPermission', accessCheck.requiredPermission);
    if (accessCheck.reason) searchParams.set('reason', accessCheck.reason);
    if (accessCheck.requiredRole) searchParams.set('requiredRole', accessCheck.requiredRole);
    const queryString = searchParams.toString();
    redirect(`/page/${schemaId}/forbidden${queryString ? `?${queryString}` : ''}`);
  }

  // Serialize schema to make it safe for Client Component (removes RegExp objects)
  const serializedSchema = serializeSchema(schema);
  const serializedNavigationSchemas = navigationSchemas.map(serializeSchema);

  // Pass schema to client component which will handle caching
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      </div>
    }>
      <DynamicEntityPageClient 
        initialSchema={serializedSchema}
        schemaId={schemaId}
        navigationSchemas={serializedNavigationSchemas}
      />
    </Suspense>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { 'schema-id': schemaId } = await params;
  
  // Load the specific schema from API endpoint /api/schemas/[schema-id]
  const schema = await findSchemaById(schemaId);

  if (!schema) {
    return {
      title: 'Not Found',
    };
  }

  return {
    title: `${schema.plural_name || 'Entities'} | Gradian`,
    description: schema.description || `Manage ${schema.plural_name?.toLowerCase() || 'entities'} in your business`,
  };
}

