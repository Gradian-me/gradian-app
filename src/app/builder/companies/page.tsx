'use client';

import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { useBackIcon } from '@/gradian-ui/shared/hooks';
import { DynamicPageRenderer } from '@/gradian-ui/data-display/components/DynamicPageRenderer';
import { useEffect, useRef, useState } from 'react';
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

export default function CompaniesBuilderPage() {
  const router = useRouter();
  const BackIcon = useBackIcon();
  const [mounted, setMounted] = useState(false);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (hasFetchedRef.current) {
      return;
    }

    hasFetchedRef.current = true;

    const loadSchema = async () => {
      try {
        const response = await fetch('/api/schemas/companies');

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
        console.error('Error loading companies schema:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSchema();
  }, []);

  if (!mounted) {
    return null;
  }

  if (!ENABLE_BUILDER) {
    return (
      <MainLayout title="Access Denied" subtitle="The builder is disabled in this environment." icon="OctagonMinus">
        <AccessDenied
          title="Access to Companies Builder is Disabled"
          description="The companies builder is not available in this environment."
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
        title="Companies"
        subtitle="Manage company information"
        icon="Building2"
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
        title="Companies"
        subtitle="Manage company information"
        icon="Building2"
      >
        <div className="text-center py-20">
          <h3 className="text-xl font-semibold mb-4">Schema not found</h3>
          <p className="text-gray-600">Please configure the companies schema first.</p>
          <Button
            variant="outline"
            onClick={() => router.push('/builder')}
            className="mt-4"
          >
            <BackIcon className="h-4 w-4 me-2" />
            Back to Builder
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Companies"
      subtitle="Manage company information including registration, address, and contact details"
      icon="Building2"
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.push('/builder')}
          className="mb-2"
        >
          <BackIcon className="h-4 w-4 me-2" />
          Back to Builder
        </Button>

        {/* Companies CRUD Interface */}
        <DynamicPageRenderer 
          schema={schema} 
          entityName={schema.singular_name || 'Company'}
        />
      </div>
    </MainLayout>
  );
}

