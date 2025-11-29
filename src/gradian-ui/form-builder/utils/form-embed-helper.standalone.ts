/**
 * Standalone version of form-embed-helper for third-party apps
 * 
 * Copy this file to your third-party application.
 * This version has minimal dependencies and can be used independently.
 */

/**
 * Type definitions (minimal version for standalone use)
 */
export type FormEmbedMode = 'create' | 'edit';

export interface FormEmbedResult {
  success: boolean;
  data?: Record<string, any>;
  entityId?: string;
  error?: string;
}

export interface OpenFormEmbedOptions {
  baseUrl?: string;
  schemaId: string;
  mode?: FormEmbedMode;
  entityId?: string;
  initialValues?: Record<string, any>;
  popupFeatures?: {
    width?: number;
    height?: number;
    left?: number;
    top?: number;
  };
  allowedOrigins?: string[];
  timeout?: number;
}

export interface FormEmbedPromise extends Promise<FormEmbedResult> {
  close: () => void;
}

/**
 * Validate message origin (security check)
 */
function validateMessageOrigin(
  event: MessageEvent,
  allowedOrigins?: string[]
): boolean {
  if (!allowedOrigins || allowedOrigins.length === 0) {
    return true; // Allow all for development
  }

  const origin = event.origin;
  return allowedOrigins.some((allowed) => {
    if (allowed === '*') return true;
    if (allowed.includes('*')) {
      const pattern = allowed.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }
    return origin === allowed;
  });
}

/**
 * Check if message is a valid form embed message
 */
function isFormEmbedMessage(message: any): boolean {
  return (
    message &&
    typeof message === 'object' &&
    'type' in message &&
    'timestamp' in message &&
    typeof message.type === 'string' &&
    typeof message.timestamp === 'number'
  );
}

/**
 * Open a form in a popup window and return a promise that resolves when the form is submitted
 */
export function openFormEmbed(options: OpenFormEmbedOptions): FormEmbedPromise {
  const {
    baseUrl,
    schemaId,
    mode = 'create',
    entityId,
    initialValues,
    popupFeatures = {},
    allowedOrigins,
    timeout = 300000,
  } = options;

  // Determine base URL
  const embedBaseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!embedBaseUrl) {
    throw new Error('baseUrl is required when not running in a browser environment');
  }

  // Build URL with query parameters
  const url = new URL('/forms/embed', embedBaseUrl);
  url.searchParams.set('schemaId', schemaId);
  url.searchParams.set('mode', mode);

  if (entityId) {
    url.searchParams.set('entityId', entityId);
  }

  if (initialValues) {
    try {
      const encoded = encodeURIComponent(JSON.stringify(initialValues));
      url.searchParams.set('initialValues', encoded);
    } catch (error) {
      console.error('Failed to encode initialValues:', error);
    }
  }

  // Set return origin for postMessage
  if (typeof window !== 'undefined') {
    url.searchParams.set('returnOrigin', window.location.origin);
  }

  // Determine allowed origins for message validation
  const messageOrigins = allowedOrigins || [embedBaseUrl];

  // Configure popup window
  const width = popupFeatures.width || 900;
  const height = popupFeatures.height || 700;
  const left = popupFeatures.left || (typeof window !== 'undefined' ? (window.screen.width - width) / 2 : 0);
  const top = popupFeatures.top || (typeof window !== 'undefined' ? (window.screen.height - height) / 2 : 0);

  const popupWindow = window.open(
    url.toString(),
    'formEmbed',
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );

  if (!popupWindow) {
    throw new Error('Failed to open popup window. Please check your popup blocker settings.');
  }

  // Create promise that resolves when form is submitted or closed
  let resolvePromise: (value: FormEmbedResult) => void;
  let rejectPromise: (reason: Error) => void;
  let timeoutId: NodeJS.Timeout | null = null;

  const promise = new Promise<FormEmbedResult>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;

    // Set timeout
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        popupWindow.close();
        reject(new Error(`Form embed timeout after ${timeout}ms`));
      }, timeout);
    }

    // Listen for messages from the popup
    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      if (!validateMessageOrigin(event, messageOrigins)) {
        console.warn('[FormEmbedHelper] Message from unauthorized origin:', event.origin);
        return;
      }

      // Validate message structure
      if (!isFormEmbedMessage(event.data)) {
        return;
      }

      const message = event.data;

      switch (message.type) {
        case 'form-submitted': {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          window.removeEventListener('message', handleMessage);

          if (message.payload?.success) {
            resolvePromise({
              success: true,
              data: message.payload.data,
              entityId: message.payload.entityId,
            });
          } else {
            resolvePromise({
              success: false,
              error: message.payload?.error || 'Form submission failed',
            });
          }
          break;
        }

        case 'form-closed': {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          window.removeEventListener('message', handleMessage);

          if (message.payload?.reason === 'success') {
            resolvePromise({
              success: true,
            });
          } else {
            resolvePromise({
              success: false,
              error: 'Form was closed without submission',
            });
          }
          break;
        }

        case 'form-error': {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          window.removeEventListener('message', handleMessage);

          rejectPromise(new Error(message.payload?.error || 'Unknown error occurred'));
          break;
        }

        default:
          // Ignore other message types
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // Also listen for popup close (in case user closes without sending message)
    const checkClosed = setInterval(() => {
      if (popupWindow.closed) {
        clearInterval(checkClosed);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        window.removeEventListener('message', handleMessage);
        resolvePromise({
          success: false,
          error: 'Form window was closed',
        });
      }
    }, 500);
  }) as FormEmbedPromise;

  // Add close method to promise
  promise.close = () => {
    if (popupWindow && !popupWindow.closed) {
      popupWindow.close();
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };

  return promise;
}

/**
 * Generic helper functions for common use cases
 */

/**
 * Create data for any schema
 */
export async function createData(
  schemaId: string,
  options?: {
    baseUrl?: string;
    initialValues?: Record<string, any>;
    popupFeatures?: OpenFormEmbedOptions['popupFeatures'];
    timeout?: number;
  }
): Promise<FormEmbedResult> {
  return openFormEmbed({
    baseUrl: options?.baseUrl,
    schemaId,
    mode: 'create',
    initialValues: options?.initialValues,
    popupFeatures: options?.popupFeatures,
    timeout: options?.timeout,
  });
}

/**
 * Edit data for any schema
 */
export async function editData(
  schemaId: string,
  entityId: string,
  options?: {
    baseUrl?: string;
    popupFeatures?: OpenFormEmbedOptions['popupFeatures'];
    timeout?: number;
  }
): Promise<FormEmbedResult> {
  return openFormEmbed({
    baseUrl: options?.baseUrl,
    schemaId,
    mode: 'edit',
    entityId,
    popupFeatures: options?.popupFeatures,
    timeout: options?.timeout,
  });
}

