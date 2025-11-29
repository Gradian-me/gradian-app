/**
 * Helper utility for external apps to easily embed and interact with forms
 */

import {
  FormEmbedMessage,
  FormEmbedMode,
  FormSubmittedMessage,
  FormClosedMessage,
  FormErrorMessage,
  isFormEmbedMessage,
  validateMessageOrigin,
} from '../types/embed-messages';

export interface OpenFormEmbedOptions {
  /**
   * Base URL of the form embed server
   * @default window.location.origin (if in same domain) or must be provided
   */
  baseUrl?: string;

  /**
   * Schema ID to load
   */
  schemaId: string;

  /**
   * Form mode: 'create' or 'edit'
   * @default 'create'
   */
  mode?: FormEmbedMode;

  /**
   * Entity ID (required for edit mode)
   */
  entityId?: string;

  /**
   * Initial values to pre-fill the form
   */
  initialValues?: Record<string, any>;

  /**
   * Popup window features
   */
  popupFeatures?: {
    width?: number;
    height?: number;
    left?: number;
    top?: number;
  };

  /**
   * Allowed origins for postMessage (security)
   * If not provided, will use the baseUrl origin
   */
  allowedOrigins?: string[];

  /**
   * Timeout in milliseconds to wait for form submission
   * @default 300000 (5 minutes)
   */
  timeout?: number;
}

export interface FormEmbedResult {
  success: boolean;
  data?: Record<string, any>;
  entityId?: string;
  error?: string;
}

export interface FormEmbedPromise extends Promise<FormEmbedResult> {
  /**
   * Close the form popup programmatically
   */
  close: () => void;
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

      const message = event.data as FormEmbedMessage;

      switch (message.type) {
        case 'form-submitted': {
          const submittedMessage = message as FormSubmittedMessage;
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          window.removeEventListener('message', handleMessage);

          if (submittedMessage.payload?.success) {
            resolvePromise({
              success: true,
              data: submittedMessage.payload.data,
              entityId: submittedMessage.payload.entityId,
            });
          } else {
            resolvePromise({
              success: false,
              error: submittedMessage.payload?.error || 'Form submission failed',
            });
          }
          break;
        }

        case 'form-closed': {
          const closedMessage = message as FormClosedMessage;
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          window.removeEventListener('message', handleMessage);

          if (closedMessage.payload?.reason === 'success') {
            // Form was closed after successful submission (should have received form-submitted first)
            resolvePromise({
              success: true,
            });
          } else {
            // User closed the form without submitting
            resolvePromise({
              success: false,
              error: 'Form was closed without submission',
            });
          }
          break;
        }

        case 'form-error': {
          const errorMessage = message as FormErrorMessage;
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          window.removeEventListener('message', handleMessage);

          rejectPromise(new Error(errorMessage.payload?.error || 'Unknown error occurred'));
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
 * Example usage:
 *
 * ```typescript
 * import { openFormEmbed } from '@/gradian-ui/form-builder/utils/form-embed-helper';
 *
 * // Open a form in create mode
 * const result = await openFormEmbed({
 *   baseUrl: 'https://yourapp.com',
 *   schemaId: 'vendors',
 *   mode: 'create',
 *   initialValues: { name: 'New Vendor' },
 * });
 *
 * if (result.success) {
 *   console.log('Form submitted:', result.data);
 *   console.log('Entity ID:', result.entityId);
 * } else {
 *   console.error('Form error:', result.error);
 * }
 *
 * // Open a form in edit mode
 * const editResult = await openFormEmbed({
 *   baseUrl: 'https://yourapp.com',
 *   schemaId: 'vendors',
 *   mode: 'edit',
 *   entityId: '123',
 * });
 * ```
 */

