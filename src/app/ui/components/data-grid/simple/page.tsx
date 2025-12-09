'use client';

import { MainLayout } from '@/components/layout/main-layout';

export default function SimpleDataGridPage() {
  return (
    <MainLayout
      title="Simple Data Grid Component"
      subtitle="Simple data grid viewer and editor"
      icon="Table"
    >
      <div className="container mx-auto px-4 py-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <p className="text-gray-600 dark:text-gray-400">
            Simple Data Grid component page - coming soon
          </p>
        </div>
      </div>
    </MainLayout>
  );
}

