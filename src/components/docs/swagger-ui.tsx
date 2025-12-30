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
    const originalError = console.error;
    const suppressedMessages = [
      'UNSAFE_componentWillReceiveProps',
      'componentWillReceiveProps',
      'ModelCollapse',
    ];

    const shouldSuppress = (message: string): boolean => {
      return suppressedMessages.some((suppressed) =>
        message.includes(suppressed)
      );
    };

    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      if (!shouldSuppress(message)) {
        originalWarn.apply(console, args);
      }
    };

    console.error = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      if (!shouldSuppress(message)) {
        originalError.apply(console, args);
      }
    };

    return () => {
      console.warn = originalWarn;
      console.error = originalError;
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


