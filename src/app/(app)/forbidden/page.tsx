import { Suspense } from 'react';
import ForbiddenClient from './ForbiddenClient';

export default function ForbiddenPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
          <div className="max-w-md w-full text-center space-y-4">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
              Access Forbidden
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">Loading…</p>
          </div>
        </div>
      }
    >
      <ForbiddenClient />
    </Suspense>
  );
}

