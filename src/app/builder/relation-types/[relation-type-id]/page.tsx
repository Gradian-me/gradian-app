'use client';

import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { useBackIcon } from '@/gradian-ui/shared/hooks';
import { DynamicDetailPageClient } from '@/app/page/[schema-id]/[data-id]/DynamicDetailPageClient';
import { useEffect, useState } from 'react';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { ENABLE_BUILDER } from '@/gradian-ui/shared/configs/env-config';
import { AccessDenied } from '@/gradian-ui/schema-manager/components/AccessDenied';

/**
 * Process schema to convert string patterns to RegExp
 */
function processSchema(schema: any): FormSchema {
  const processedSchema = { ...schema };
  
  if (processedSchema.fields && Array.isArray(processedSchema.fields)) {
    processedSchema.fields = processedSchema.fields.map((field: any) => {
      const processedField = { ...field };
      
      // Convert pattern string to RegExp
      if (processedField.validation?.pattern && typeof processedField.validation.pattern === 'string') {
        try {
          processedField.validation.pattern = new RegExp(processedField.validation.pattern);
        } catch (error) {
          console.warn(`Invalid pattern: ${processedField.validation.pattern}`, error);
        }
      }
      
      return processedField;
    });
  }
  
  return processedSchema as FormSchema;
}

interface PageProps {
  params: Promise<{
    'relation-type-id': string;
  }>;
}

export default function RelationTypeDetailPage({ params }: { params: PageProps['params'] }) {
  const router = useRouter();
  const BackIcon = useBackIcon();
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [relationTypeId, setRelationTypeId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const resolvedParams = await params;
        const id = resolvedParams['relation-type-id'];
        setRelationTypeId(id);

        const response = await fetch('/api/schemas/relation-types');
        
        if (!response.ok) {
          throw new Error('Failed to fetch schema');
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          // Process the schema to convert string patterns to RegExp
          const processedSchema = processSchema(result.data);
          setSchema(processedSchema);
        }
      } catch (error) {
        console.error('Error loading relation type:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params]);

  if (!mounted) {
    return null;
  }

  if (!ENABLE_BUILDER) {
    return (
      <MainLayout title="Access Denied" subtitle="The builder is disabled in this environment." icon="OctagonMinus">
        <AccessDenied
          title="Access to Relation Types Builder is Disabled"
          description="The relation types builder is not available in this environment."
          helperText="If you believe you should have access, please contact your system administrator."
          homeHref="/apps"
          showGoBackButton={false}
        />
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout
        title="Relation Type"
        subtitle="Edit relation type details"
        icon="Link2"
      >
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  if (!schema || !relationTypeId) {
    return (
      <MainLayout
        title="Relation Type"
        subtitle="Edit relation type details"
        icon="Link2"
      >
        <div className="text-center py-20">
          <h3 className="text-xl font-semibold mb-4">Relation Type not found</h3>
          <p className="text-gray-600 mb-6">Please check the relation type ID.</p>
          <Button
            variant="outline"
            onClick={() => router.push('/builder/relation-types')}
            className="mt-4"
          >
            <BackIcon className="h-4 w-4 me-2" />
            Back to Relation Types
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Relation Type"
      subtitle="Edit relation type details"
      icon="Link2"
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.push('/builder/relation-types')}
          className="mb-2"
        >
          <BackIcon className="h-4 w-4 me-2" />
          Back to Relation Types
        </Button>

        {/* Relation Type Detail */}
        <DynamicDetailPageClient 
          schema={schema}
          dataId={relationTypeId}
          schemaId="relation-types"
          entityName={schema.singular_name || 'Relation Type'}
        />
      </div>
    </MainLayout>
  );
}

