'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const SwaggerUIRenderer = dynamic(() => import('@/components/docs/swagger-ui'), {
  ssr: false,
  loading: () => <p className="text-sm text-muted-foreground">Loading Swagger UI…</p>,
});

export default function ApiDocsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <section className="px-6 py-10 md:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">API</p>
            <h1 className="text-3xl font-semibold tracking-tight">Gradian REST API</h1>
            <p className="mt-2 text-base text-muted-foreground">
              Explore all available endpoints, schemas, and response objects. The documentation is automatically generated
              from a structured OpenAPI (Swagger) document and grouped by descriptive tags.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Loading Swagger UI…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-10 md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">API</p>
          <h1 className="text-3xl font-semibold tracking-tight">Gradian REST API</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Explore all available endpoints, schemas, and response objects. The documentation is automatically generated
            from a structured OpenAPI (Swagger) document and grouped by descriptive tags.
          </p>
        </div>

        <SwaggerUIRenderer url="/api/docs/swagger" />
      </div>
    </section>
  );
}


