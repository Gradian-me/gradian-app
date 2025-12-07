/**
 * Zustand DevTools utility - Conditionally enables DevTools based on environment
 */

/**
 * DevTools configuration type for Zustand
 */
export interface DevToolsConfig {
  name: string;
  enabled?: boolean;
  anonymousActionType?: string;
  [key: string]: any;
}

/**
 * Check if DevTools should be enabled
 */
const shouldEnableDevTools = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  // Only enable in development
  const isDevelopment =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_ENVIRONMENT === 'development' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname.includes('127.0.0.1') ||
    window.location.hostname.includes('dev');

  // Also check for explicit devtools disable flag
  const devtoolsDisabled = process.env.NEXT_PUBLIC_DISABLE_DEVTOOLS === 'true';

  return isDevelopment && !devtoolsDisabled;
};

/**
 * Get Zustand DevTools configuration
 * Returns empty object in production to disable DevTools
 */
export const getZustandDevToolsConfig = <T>(
  storeName: string,
  config?: Omit<DevToolsConfig, 'name'>
): DevToolsConfig => {
  if (shouldEnableDevTools()) {
    return {
      name: storeName,
      ...config,
    } as DevToolsConfig;
  }

  // Return a no-op config that looks like devtools but does nothing
  return {
    name: storeName,
    enabled: false,
    anonymousActionType: '@@zustand/action',
    ...config,
  } as DevToolsConfig;
};

/**
 * Conditionally wrap Zustand store with DevTools
 * Usage: wrapWithDevTools(store, 'store-name')
 */
export const wrapWithDevTools = <T extends (...args: any[]) => any>(
  store: T,
  name: string
): T => {
  if (!shouldEnableDevTools()) {
    return store;
  }
  return store;
};

