// Dynamic Detail Page Route
// Renders detail page for any entity based on schema ID and data ID
import { notFound, redirect } from 'next/navigation';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { DynamicDetailPageClient } from './DynamicDetailPageClient';
import { findSchemaById, getAllSchemasArray } from '@/gradian-ui/schema-manager/utils/schema-registry.server';
import { checkDataAccess } from '@/gradian-ui/shared/utils/access-control';
import { getCurrentUser } from '@/gradian-ui/shared/utils/server-auth.util';

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
  
  // Load the specific schema from API endpoint /api/schemas/[schema-id]
  const schema = await findSchemaById(schemaId);

  if (!schema) {
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
  const accessCheck = await checkDataAccess(schema, dataId, user);
  
  if (!accessCheck.hasAccess) {
    // Missing view permission → app-level forbidden (clean URL); other denials → schema/data-level forbidden
    if (accessCheck.code === 'VIEW_PERMISSION_REQUIRED') {
      redirect('/forbidden');
    }
    const searchParams = new URLSearchParams();
    if (accessCheck.code) searchParams.set('code', accessCheck.code);
    if (accessCheck.requiredPermission) searchParams.set('requiredPermission', accessCheck.requiredPermission);
    if (accessCheck.reason) searchParams.set('reason', accessCheck.reason);
    if (accessCheck.requiredRole) searchParams.set('requiredRole', accessCheck.requiredRole);
    const queryString = searchParams.toString();
    redirect(`/page/${schemaId}/${dataId}/forbidden${queryString ? `?${queryString}` : ''}`);
  }

  // Serialize schema to make it safe for Client Component
  const serializedSchema = serializeSchema(schema);
  const serializedNavigationSchemas = navigationSchemas.map(serializeSchema);

  return (
    <DynamicDetailPageClient 
      schema={serializedSchema}
      dataId={dataId}
      schemaId={schemaId}
      entityName={schema.singular_name || 'Entity'}
      navigationSchemas={serializedNavigationSchemas}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { 'schema-id': schemaId, 'data-id': dataId } = await params;
  
  // Load the specific schema from API endpoint /api/schemas/[schema-id]
  const schema = await findSchemaById(schemaId);

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

