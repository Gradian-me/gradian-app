'use client';

import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';

export default function DataGridPage() {
  useSetLayoutProps({
    title: 'Data Grid Component',
    subtitle: 'Data grid viewer and editor',
    icon: 'Table',
  });

  return (
      <div className="container mx-auto px-4 py-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <p className="text-gray-600 dark:text-gray-400">
            Data Grid component page - coming soon
          </p>
        </div>
      </div>
  );
}

