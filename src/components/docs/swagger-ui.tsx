'use client';

import { useEffect } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

type SwaggerUIRendererProps = {
  url: string;
};

export default function SwaggerUIRenderer({ url }: SwaggerUIRendererProps) {
  useEffect(() => {
    // Suppress the UNSAFE_componentWillReceiveProps warning from swagger-ui-react
    // This is a known issue with the library and doesn't affect functionality
    const originalWarn = console.warn;
    const suppressedWarnings = [
      'UNSAFE_componentWillReceiveProps',
      'componentWillReceiveProps',
    ];

    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      if (
        !suppressedWarnings.some((warning) =>
          message.includes(warning)
        )
      ) {
        originalWarn.apply(console, args);
      }
    };

    return () => {
      console.warn = originalWarn;
    };
  }, []);

  return (
    <div className="rounded-lg border bg-background shadow-sm">
      <SwaggerUI
        url={url}
        docExpansion="list"
        defaultModelRendering="schema"
        defaultModelsExpandDepth={1}
        persistAuthorization
        showExtensions
      />
    </div>
  );
}


