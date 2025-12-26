'use client';

import { useEffect } from 'react';
import { initializeSecurity } from '@/gradian-ui/shared/utils/security.util';
import { initializeSkipKeyStorage } from '@/gradian-ui/shared/utils/skip-key-storage';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

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

    // Suppress browser extension errors (harmless errors from wallet extensions, etc.)
    const originalError = console.error;
    const originalWarn = console.warn;
    
    const isExtensionError = (error: any): boolean => {
      if (!error) return false;
      
      const errorString = String(error);
      const errorStack = error?.stack || '';
      const errorMessage = error?.message || '';
      const errorName = error?.name || '';
      
      // Check if error is from a browser extension
      const hasExtensionUrl = (
        errorString.includes('chrome-extension://') ||
        errorStack.includes('chrome-extension://') ||
        errorMessage.includes('chrome-extension://') ||
        errorString.includes('moz-extension://') ||
        errorStack.includes('moz-extension://') ||
        errorMessage.includes('moz-extension://')
      );
      
      // Check for common extension error patterns
      const hasExtensionErrorPattern = (
        (errorMessage.includes('addListener') && (errorString.includes('undefined') || errorStack.includes('undefined'))) ||
        (errorMessage.includes('emit') && (errorString.includes('undefined') || errorStack.includes('undefined'))) ||
        (errorString.includes('Cannot read properties of undefined') && 
         (errorString.includes('addListener') || errorString.includes('emit'))) ||
        (errorName === 'TypeError' && errorMessage.includes('addListener') && errorStack.includes('chrome-extension://')) ||
        (errorName === 'TypeError' && errorMessage.includes('emit') && errorStack.includes('chrome-extension://'))
      );
      
      return hasExtensionUrl || hasExtensionErrorPattern;
    };

    // Override console.error to filter extension errors (works in all environments)
    const originalErrorOverride = console.error;
    console.error = (...args: any[]) => {
      // Check if any argument contains extension error patterns
      // Check both individual args and the combined error string
      const combinedErrorString = args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack}`;
        return String(arg);
      }).join(' ');
      
      const hasExtensionError = 
        args.some(arg => isExtensionError(arg)) ||
        isExtensionError({ message: combinedErrorString, stack: combinedErrorString, name: 'Error' });
      
      if (!hasExtensionError) {
        // If production mode with console disabled, use sanitized version
        if (
          process.env.NODE_ENV === 'production' &&
          process.env.NEXT_PUBLIC_DISABLE_CONSOLE === 'true'
        ) {
          const sanitizedArgs = args.map((arg) => {
            if (typeof arg === 'string') {
              return arg.replace(/(token|password|secret|key)=[^&\s]+/gi, '$1=***');
            }
            return arg;
          });
          originalError(...sanitizedArgs);
        } else {
          originalError(...args);
        }
      }
      // Silently ignore extension errors
    };

    // Override console.warn to filter extension warnings
    console.warn = (...args: any[]) => {
      // Check both individual args and the combined warning string
      const combinedWarningString = args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack}`;
        return String(arg);
      }).join(' ');
      
      const hasExtensionError = 
        args.some(arg => isExtensionError(arg)) ||
        isExtensionError({ message: combinedWarningString, stack: combinedWarningString, name: 'Error' });
      
      if (!hasExtensionError) {
        // If production mode with console disabled, don't show warnings
        if (
          process.env.NODE_ENV === 'production' &&
          process.env.NEXT_PUBLIC_DISABLE_CONSOLE === 'true'
        ) {
          // Suppress warnings in production
          return;
        }
        originalWarn(...args);
      }
      // Silently ignore extension warnings
    };

    // Also handle unhandled promise rejections from extensions
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (isExtensionError(reason)) {
        event.preventDefault(); // Suppress the error
        return;
      }
    };

    // Handle global errors (catches errors before they reach console.error)
    const handleError = (event: ErrorEvent) => {
      const error = event.error || { message: event.message, stack: event.error?.stack || '', name: event.error?.name || 'Error' };
      if (isExtensionError(error) || isExtensionError({ message: event.message, stack: event.filename || '', name: 'Error' })) {
        event.preventDefault(); // Suppress the error
        return;
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError, true); // Use capture phase to catch early

    // Cleanup
    return () => {
      console.error = originalErrorOverride;
      console.warn = originalWarn;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError, true);
    };

    // Optional: Disable console methods in production to prevent information leakage
    // Note: This can be aggressive and may interfere with error tracking services
    // Consider using environment variable to control this behavior
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.NEXT_PUBLIC_DISABLE_CONSOLE === 'true'
    ) {
      // Override console methods to prevent information leakage
      // Note: console.error and console.warn are already handled above with extension filtering
      console.log = () => {};
      console.debug = () => {};
      console.info = () => {};
      // console.warn is already overridden above
    }
  }, []);

  return <>{children}</>;
}

