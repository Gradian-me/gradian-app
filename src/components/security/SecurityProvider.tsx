'use client';

import { useEffect } from 'react';
import { initializeSecurity } from '@/gradian-ui/shared/utils/security.util';
import { initializeSkipKeyStorage } from '@/gradian-ui/shared/utils/skip-key-storage';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

/**
 * SecurityProvider - Initializes security measures on client-side
 * Should be placed at the root of your application
 */
export function SecurityProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize security measures
    initializeSecurity();
    
    // Initialize skip key storage (encrypts NEXT_PUBLIC_SKIP_KEY and stores in localStorage)
    initializeSkipKeyStorage().catch((error) => {
      loggingCustom(LogType.CLIENT_LOG, 'warn', `[SecurityProvider] Failed to initialize skip key storage: ${error instanceof Error ? error.message : String(error)}`);
    });

    // Optional: Disable console methods in production to prevent information leakage
    // Note: This can be aggressive and may interfere with error tracking services
    // Consider using environment variable to control this behavior
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.NEXT_PUBLIC_DISABLE_CONSOLE === 'true'
    ) {
      // Keep console.error for error tracking
      const originalError = console.error;
      
      // Override console methods to prevent information leakage
      console.log = () => {};
      console.debug = () => {};
      console.info = () => {};
      console.warn = () => {};
      
      // Keep console.error for critical errors but sanitize
      console.error = (...args: any[]) => {
        // Only log errors in production, but sanitize sensitive data
        const sanitizedArgs = args.map((arg) => {
          if (typeof arg === 'string') {
            // Remove potential sensitive patterns
            return arg.replace(/(token|password|secret|key)=[^&\s]+/gi, '$1=***');
          }
          return arg;
        });
        originalError(...sanitizedArgs);
      };
    }
  }, []);

  return <>{children}</>;
}

