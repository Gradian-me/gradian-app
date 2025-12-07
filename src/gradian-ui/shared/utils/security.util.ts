/**
 * Security utilities for protecting sensitive data from client-side exposure
 * and preventing React DevTools from accessing sensitive information
 */

'use client';

/**
 * Check if the application is running in production mode
 */
export const isProduction = (): boolean => {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'production';
  }
  
  // Check environment variables first
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
    return true;
  }
  
  // Check hostname - production if not localhost or dev domains
  const hostname = window.location.hostname;
  return (
    hostname !== 'localhost' &&
    !hostname.includes('127.0.0.1') &&
    !hostname.includes('dev') &&
    !hostname.includes('localhost')
  );
};

/**
 * Disable React DevTools in production builds
 * This prevents inspection of React component state and props
 */
export const disableReactDevTools = (): void => {
  if (typeof window === 'undefined' || !isProduction()) {
    return;
  }

  // Disable React DevTools by overriding the __REACT_DEVTOOLS_GLOBAL_HOOK__
  try {
    const noop = () => undefined;
    const devtools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;

    if (devtools) {
      // Override DevTools methods to prevent access
      devtools.inject = noop;
      devtools.onCommitFiberRoot = noop;
      devtools.onCommitFiberUnmount = noop;
      devtools.renderers = new Map();
      devtools.renderers.set(1, {
        supportsFiber: false,
        render: noop,
        findFiberByHostInstance: noop,
        version: '0.0.0',
      });

      // Make the hook read-only
      Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
        get: () => devtools,
        set: () => {},
        configurable: false,
        enumerable: false,
      });
    }
  } catch (error) {
    // Silently fail if DevTools cannot be disabled
    console.warn('[Security] Could not disable React DevTools:', error);
  }
};

/**
 * Remove React DevTools from the DOM
 */
export const removeReactDevTools = (): void => {
  if (typeof window === 'undefined' || !isProduction()) {
    return;
  }

  try {
    // Remove DevTools panel if injected
    const devtools = document.getElementById('__REACT_DEVTOOLS_GLOBAL_HOOK__');
    if (devtools) {
      devtools.remove();
    }
  } catch (error) {
    // Silently fail
  }
};

/**
 * Sanitize sensitive data before storing in React state
 * Removes or masks sensitive fields
 */
export const sanitizeUserData = <T extends Record<string, any>>(data: T): T => {
  const sensitiveKeys = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'privateKey',
    'creditCard',
    'ssn',
    'socialSecurityNumber',
    'passport',
  ];

  const sanitized = { ...data };

  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      delete sanitized[key];
    }
  }

  return sanitized;
};

/**
 * Sanitize nested objects recursively
 */
export const sanitizeNestedData = <T>(data: T): T => {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeNestedData) as unknown as T;
  }

  if (typeof data === 'object') {
    const sanitized = sanitizeUserData(data as Record<string, any>);
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(sanitized)) {
      result[key] = sanitizeNestedData(value);
    }

    return result as T;
  }

  return data;
};

/**
 * Mask sensitive string values (e.g., tokens, keys)
 */
export const maskSensitiveValue = (value: string, visibleChars = 4): string => {
  if (!value || value.length <= visibleChars * 2) {
    return '***';
  }
  const start = value.substring(0, visibleChars);
  const end = value.substring(value.length - visibleChars);
  const middle = '*'.repeat(Math.min(value.length - visibleChars * 2, 20));
  return `${start}${middle}${end}`;
};

/**
 * Check if DevTools are open (basic detection)
 */
export const detectDevTools = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;
    
    if (widthThreshold || heightThreshold) {
      return true;
    }
  } catch (error) {
    // Silently fail
  }

  return false;
};

/**
 * Initialize security measures on client-side
 */
export const initializeSecurity = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  // Disable React DevTools in production
  if (isProduction()) {
    disableReactDevTools();
    removeReactDevTools();

    // Monitor for DevTools opening
    setInterval(() => {
      if (detectDevTools()) {
        console.warn('[Security] Developer tools detected. Sensitive operations may be logged.');
      }
    }, 1000);
  }
};

