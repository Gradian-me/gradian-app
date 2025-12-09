'use client';

import { MainLayout } from '@/components/layout/main-layout';

export default function MarkdownPage() {
  return (
    <MainLayout
      title="Markdown Component"
      subtitle="Markdown viewer and editor"
      icon="FileText"
    >
      <div className="container mx-auto px-4 py-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <p className="text-gray-600 dark:text-gray-400">
            Markdown component page - coming soon
          </p>
        </div>
      </div>
    </MainLayout>
  );
}

