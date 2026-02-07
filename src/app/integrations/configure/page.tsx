'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormModal } from '@/gradian-ui/form-builder/components/FormModal';
import { useBackIcon } from '@/gradian-ui/shared/hooks';
import { motion } from 'framer-motion';
import { LoadingSpinner } from '@/gradian-ui/layout/components';

function ConfigureIntegrationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const BackIcon = useBackIcon();
  const integrationId = searchParams.get('id');
  const isEdit = !!integrationId;

  return (
    <MainLayout title={isEdit ? 'Edit Integration' : 'Add Integration'}>
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <BackIcon className="h-4 w-4 me-2" />
            Back to Integrations
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>{isEdit ? 'Edit Integration' : 'Add New Integration'}</CardTitle>
            </CardHeader>
            <CardContent>
              <FormModal
                schemaId="integrations"
                entityId={integrationId || undefined}
                mode={isEdit ? 'edit' : 'create'}
                onSuccess={() => {
                  router.push('/integrations');
                }}
                onClose={() => {
                  router.back();
                }}
                size="xl"
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
}

export default function ConfigureIntegrationPage() {
  return (
    <Suspense fallback={
      <MainLayout title="Configure Integration">
        <LoadingSpinner centered containerClassName="h-64" />
      </MainLayout>
    }>
      <ConfigureIntegrationPageContent />
    </Suspense>
  );
}

