'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicDetailPageClient } from '@/app/(app)/page/[schema-id]/[data-id]/DynamicDetailPageClient';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { FormSchema, DetailPageMetadata } from '@/gradian-ui/schema-manager/types/form-schema';
import { getSchemaWithClientCache, getSchemasWithClientCache } from '@/gradian-ui/schema-manager/utils/client-schema-cache';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { PageEditorWrapper } from './PageEditorWrapper';

interface PageEditorClientProps {
  pageId: string;
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

export function PageEditorClient({ pageId }: PageEditorClientProps) {
  const router = useRouter();
  const [pagesSchema, setPagesSchema] = useState<FormSchema | null>(null);
  const [navigationSchemas, setNavigationSchemas] = useState<FormSchema[]>([]);
  const [pageEntity, setPageEntity] = useState<any>(null);
  const [pageEntityId, setPageEntityId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load pages schema and find page entity
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load pages schema via client-side cache helper
        const pagesSchemaFromCache = await getSchemaWithClientCache('pages');
        if (!pagesSchemaFromCache) {
          setError('Failed to load pages schema');
          return;
        }
        setPagesSchema(pagesSchemaFromCache);

        // Load all schemas for navigation using batch cache helper.
        // When called with an empty array, getSchemasWithClientCache will
        // return [] (no specific IDs), so fall back to just pages schema.
        const navSchemas = await getSchemasWithClientCache([]);
        setNavigationSchemas(navSchemas.length > 0 ? navSchemas : [pagesSchemaFromCache]);

        // Find page entity by pageId field
        const pagesResponse = await apiRequest<any[]>(`/api/data/pages`);
        if (pagesResponse.success && Array.isArray(pagesResponse.data)) {
          const foundPage = pagesResponse.data.find((p: any) => p.pageId === pageId);
          if (foundPage) {
            setPageEntity(foundPage);
            setPageEntityId(foundPage.id);
          } else {
            setError(`Page with ID "${pageId}" not found`);
          }
        } else {
          setError('Failed to load pages');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load page');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [pageId]);

  const handleRefreshData = async () => {
    if (!pageEntityId) return;
    try {
      const response = await apiRequest<any>(`/api/data/pages/${pageEntityId}`);
      if (response.success && response.data) {
        setPageEntity(response.data);
      }
    } catch (err) {
      console.error('Failed to refresh page data:', err);
    }
  };

  // Parse detailPageMetadata if it's a string
  const parsedPageEntity = useMemo(() => {
    if (pageEntity?.detailPageMetadata && typeof pageEntity.detailPageMetadata === 'string') {
      try {
        return {
          ...pageEntity,
          detailPageMetadata: JSON.parse(pageEntity.detailPageMetadata),
        };
      } catch {
        return pageEntity;
      }
    }
    return pageEntity;
  }, [pageEntity]);

  // Create schema with metadata for renderer
  const schemaWithMetadata = useMemo(() => {
    if (!pagesSchema) {
      return pagesSchema;
    }
    return {
      ...pagesSchema,
      detailPageMetadata: parsedPageEntity?.detailPageMetadata || {},
    };
  }, [pagesSchema, parsedPageEntity]);

  const serializedNavigationSchemas = navigationSchemas.map(serializeSchema);

  useSetLayoutProps({
    title: isLoading ? 'Loading...' : (error || !pagesSchema || !pageEntity || !pageEntityId ? 'Error' : (parsedPageEntity?.pageTitle || pageId)),
    subtitle: isLoading ? 'Loading page editor' : (error || !pagesSchema || !pageEntity || !pageEntityId ? (error || 'Page not found') : 'Page Editor'),
    icon: isLoading ? 'FileText' : (error || !pagesSchema || !pageEntity || !pageEntityId ? 'AlertCircle' : 'FileText'),
    navigationSchemas: serializedNavigationSchemas,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (error || !pagesSchema || !pageEntity || !pageEntityId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">{error || 'The page you\'re looking for doesn\'t exist.'}</p>
        <button
          onClick={() => router.push('/builder/pages')}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
        >
          Back to Pages
        </button>
      </div>
    );
  }

  return (
      <PageEditorWrapper
        schema={schemaWithMetadata!}
        data={parsedPageEntity}
        onRefreshData={handleRefreshData}
      />
  );
}

