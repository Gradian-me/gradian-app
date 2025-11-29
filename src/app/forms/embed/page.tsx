import { Suspense } from 'react';
import { FormEmbedClient } from './FormEmbedClient';

export default function FormEmbedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <FormEmbedClient
        allowedOrigins={
          process.env.NEXT_PUBLIC_FORM_EMBED_ALLOWED_ORIGINS
            ? process.env.NEXT_PUBLIC_FORM_EMBED_ALLOWED_ORIGINS.split(',')
            : undefined
        }
      />
    </Suspense>
  );
}

