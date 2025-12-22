'use client';

import { useState, useEffect, useMemo } from 'react';
import { DynamicDetailPageRenderer } from '@/gradian-ui/data-display/components/DynamicDetailPageRenderer';
import { FormSchema, DetailPageMetadata } from '@/gradian-ui/schema-manager/types/form-schema';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanyStore } from '@/stores/company.store';

interface CustomPageClientProps {
  pageEntity: any;
  pageMetadata: DetailPageMetadata;
  pagesSchema: FormSchema;
  targetSchema: FormSchema | null;
  navigationSchemas: FormSchema[];
}

function reconstructRegExp(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => reconstructRegExp(item));
  }
  
  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (value && typeof value === 'object' && value.__regexp) {
        result[key] = new RegExp(value.source, value.flags);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = reconstructRegExp(value);
      } else {
        result[key] = value;
      }
    }
  }
  
  return result;
}

export function CustomPageClient({
  pageEntity,
  pageMetadata,
  pagesSchema: rawPagesSchema,
  targetSchema: rawTargetSchema,
  navigationSchemas: rawNavigationSchemas,
}: CustomPageClientProps) {
  const [targetData, setTargetData] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const getCompanyId = useCompanyStore((state) => state.getCompanyId);

  const pagesSchema = useMemo(() => reconstructRegExp(rawPagesSchema) as FormSchema, [rawPagesSchema]);
  const targetSchema = useMemo(() => 
    rawTargetSchema ? (reconstructRegExp(rawTargetSchema) as FormSchema) : null,
    [rawTargetSchema]
  );
  const navigationSchemas = useMemo(() => 
    rawNavigationSchemas.map(s => reconstructRegExp(s) as FormSchema),
    [rawNavigationSchemas]
  );

  // Create a minimal schema wrapper with the page metadata
  const pageSchema = useMemo<FormSchema>(() => {
    return {
      ...pagesSchema,
      id: pageEntity.pageId,
      singular_name: pageEntity.pageTitle || 'Page',
      plural_name: pageEntity.pageTitle || 'Page',
      title: pageEntity.pageTitle || 'Custom Page',
      description: pageEntity.pageDescription || '',
      icon: pageEntity.icon,
      detailPageMetadata: pageMetadata,
      // Use target schema fields if available, otherwise use empty fields
      fields: targetSchema?.fields || [],
      sections: targetSchema?.sections || [],
    };
  }, [pagesSchema, pageEntity, pageMetadata, targetSchema]);

  // Load data from target schema if specified
  useEffect(() => {
    const loadTargetData = async () => {
      if (!pageEntity.targetSchema || !targetSchema) {
        // Standalone page - no data to load
        setTargetData({});
        return;
      }

      setIsLoadingData(true);
      setDataError(null);

      try {
        // Get company ID from store to include in the request
        const companyId = getCompanyId();
        
        // Build query parameters
        // Don't set limit - let the API return all data or use default pagination
        const params: Record<string, string> = {};
        
        // Add companyId if available (required for company-based schemas)
        // Note: apiRequest should automatically add companyIds via enrichDataEndpoint,
        // but we explicitly add it here to ensure it's always included
        if (companyId) {
          params.companyIds = String(companyId);
        }
        
        // Load data from target schema
        // If page configuration specifies which entity to load, it can be extended here
        // For example, pages could specify which entity to load via query params or configuration
        const response = await apiRequest<any[]>(`/api/data/${pageEntity.targetSchema}`, {
          params,
          callerName: 'CustomPageClient',
        });
        
        if (response.success && Array.isArray(response.data)) {
          // If we have data, use the first item (or could be configured per page)
          // For standalone pages without specific entity, use empty object
          if (response.data.length > 0) {
            setTargetData(response.data[0]);
          } else {
            setTargetData({});
          }
        } else {
          // No data available - create empty data object
          setTargetData({});
        }
      } catch (err) {
        console.error('Failed to load target data:', err);
        setDataError(err instanceof Error ? err.message : 'Failed to load data');
        setTargetData({});
      } finally {
        setIsLoadingData(false);
      }
    };

    loadTargetData();
  }, [pageEntity.targetSchema, targetSchema]);

  if (isLoadingData) {
    return (
      <MainLayout
        title={pageEntity.pageTitle || 'Loading...'}
        subtitle={pageEntity.pageDescription || ''}
        icon={pageEntity.icon}
        navigationSchemas={navigationSchemas}
      >
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title={pageEntity.pageTitle || 'Custom Page'}
      subtitle={pageEntity.pageDescription || ''}
      icon={pageEntity.icon}
      navigationSchemas={navigationSchemas}
    >
      <DynamicDetailPageRenderer
        schema={pageSchema}
        data={targetData}
        isLoading={isLoadingData}
        error={dataError}
        disableAnimation={false}
        preloadedSchemas={targetSchema ? [targetSchema] : []}
      />
    </MainLayout>
  );
}

