'use client';

import dynamic from 'next/dynamic';

// Dynamically import SchemaManagerWrapper with SSR disabled to prevent hydration mismatches
// This is necessary because Radix UI components generate random IDs that differ between server and client
const SchemaManagerWrapper = dynamic(
  () => import('@/gradian-ui/schema-manager/components').then(mod => ({ default: mod.SchemaManagerWrapper })),
  { 
    ssr: false,
    loading: () => (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      </div>
    ),
  }
);

export default function SchemaBuilderClient() {
  return <SchemaManagerWrapper />;
}

