'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function ForbiddenClient() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  const description =
    code === 'VIEW_PERMISSION_REQUIRED'
      ? "You don't have permission to view this resource."
      : "You don't have permission to access this page.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
          Access Forbidden
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {description}
        </p>
        <div className="pt-2">
          <Link
            href="/apps"
            className="inline-flex items-center px-4 py-2 rounded-md bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
          >
            Go to Apps
          </Link>
        </div>
      </div>
    </div>
  );
}
