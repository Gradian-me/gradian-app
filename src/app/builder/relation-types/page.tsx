'use client';

import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { DynamicPageRenderer } from '@/gradian-ui/data-display/components/DynamicPageRenderer';
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

export default function RelationTypesBuilderPage() {
  const router = useRouter();
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSchema() {
      try {
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
        console.error('Error loading relation-types schema:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSchema();
  }, []);

  if (loading) {
    return (
      <MainLayout
        title="Relation Types"
        subtitle="Define and manage relationships between entities"
        icon="Link2"
      >
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  if (!schema) {
    return (
      <MainLayout
        title="Relation Types"
        subtitle="Define and manage relationships between entities"
        icon="Link2"
      >
        <div className="text-center py-20">
          <h3 className="text-xl font-semibold mb-4">Schema not found</h3>
          <p className="text-gray-600">Please configure the relation-types schema first.</p>
          <Button
            variant="outline"
            onClick={() => router.push('/builder')}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 me-2" />
            Back to Builder
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Relation Types"
      subtitle="Define and manage relationships between entities in your application"
      icon="Link2"
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.push('/builder')}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 me-2" />
          Back to Builder
        </Button>

        {/* Relation Types CRUD Interface */}
        <DynamicPageRenderer 
          schema={schema} 
          entityName={schema.singular_name || 'Relation Type'}
        />
      </div>
    </MainLayout>
  );
}

