// Dynamic Query Table Page
// Renders a dynamic query table based on the query ID
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { DynamicQueryPageClient } from './DynamicQueryPageClient';
import { readSchemaData } from '@/gradian-ui/shared/domain/utils/data-storage.util';

interface PageProps {
  params: Promise<{
    'dynamic-query-id': string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const revalidate = 0;

export default async function DynamicQueryPage({ params, searchParams }: PageProps) {
  const { 'dynamic-query-id': dynamicQueryId } = await params;
  const resolvedSearchParams = await searchParams;

  if (!dynamicQueryId || dynamicQueryId.trim() === '') {
    notFound();
  }

  // Extract query parameters (excluding flatten which is handled separately)
  const queryParams: Record<string, any> = {};
  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    // Skip flatten as it's handled separately by the component
    if (key !== 'flatten' && value !== undefined) {
      // Handle array values - take first value if array, otherwise use value directly
      queryParams[key] = Array.isArray(value) ? value[0] : value;
    }
  });

  // Load query metadata for page title and description
  let queryName: string | undefined;
  let queryDescription: string | undefined;
  let flattenedSchemas: string[] | undefined;
  
  try {
    const dynamicQueriesData = readSchemaData<any>('dynamic-queries') || [];
    const query = dynamicQueriesData.find(
      (q: any) => q.id === dynamicQueryId || q.name === dynamicQueryId
    );
    
    if (query) {
      queryName = query.name;
      queryDescription = query.description;
      flattenedSchemas = query.flattenedSchemas;
    } else if (dynamicQueriesData.length > 0) {
      // If we have queries data and the query doesn't exist, show 404
      notFound();
    }
  } catch (error) {
    // If we can't validate, continue anyway - component will handle errors
    console.warn('Could not validate dynamic query existence:', error);
  }

  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      </div>
    }>
      <DynamicQueryPageClient
        dynamicQueryId={dynamicQueryId}
        queryName={queryName}
        queryDescription={queryDescription}
        queryParams={queryParams}
        flattenedSchemas={flattenedSchemas}
      />
    </Suspense>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { 'dynamic-query-id': dynamicQueryId } = await params;

  // Try to load query metadata for page title
  try {
    const dynamicQueriesData = readSchemaData<any>('dynamic-queries') || [];
    const query = dynamicQueriesData.find(
      (q: any) => q.id === dynamicQueryId || q.name === dynamicQueryId
    );

    if (query?.name) {
      return {
        title: `${query.name} | Dynamic Query | Gradian`,
        description: query.description || `View results for dynamic query: ${query.name}`,
      };
    }
  } catch (error) {
    // Ignore errors in metadata generation
  }

  return {
    title: `Dynamic Query: ${dynamicQueryId} | Gradian`,
    description: `View results for dynamic query: ${dynamicQueryId}`,
  };
}

