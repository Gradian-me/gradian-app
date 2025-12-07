'use client';

import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { DynamicDetailPageClient } from '@/app/page/[schema-id]/[data-id]/DynamicDetailPageClient';
import { useEffect, useState } from 'react';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';

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
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [relationTypeId, setRelationTypeId] = useState<string>('');
  const [loading, setLoading] = useState(true);

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
            <ArrowLeft className="h-4 w-4 me-2" />
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
          <ArrowLeft className="h-4 w-4 me-2" />
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

