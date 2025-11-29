'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { FormModal } from '@/gradian-ui/form-builder/components/FormModal';
import {
  createFormEmbedMessage,
  FormEmbedMessage,
  FormEmbedMode,
  FormReadyMessage,
  FormSubmittedMessage,
  FormClosedMessage,
  FormErrorMessage,
  FormLoadedMessage,
  validateMessageOrigin,
} from '@/gradian-ui/form-builder/types/embed-messages';

interface FormEmbedClientProps {
  allowedOrigins?: string[];
}

export function FormEmbedClient({ allowedOrigins }: FormEmbedClientProps) {
  const searchParams = useSearchParams();
  const [isReady, setIsReady] = useState(false);

  // Parse query parameters
  const schemaId = searchParams?.get('schemaId') || null;
  const mode = (searchParams?.get('mode') || 'create') as FormEmbedMode;
  const entityId = searchParams?.get('entityId') || undefined;
  const initialValuesParam = searchParams?.get('initialValues');
  const returnOrigin = searchParams?.get('returnOrigin') || undefined;

  // Parse initial values from query parameter
  const initialValues = useMemo(() => {
    if (!initialValuesParam) return undefined;
    try {
      const decoded = decodeURIComponent(initialValuesParam);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Failed to parse initialValues:', error);
      return undefined;
    }
  }, [initialValuesParam]);

  // Send message to parent window
  const sendMessage = useCallback(
    (message: FormEmbedMessage) => {
      if (typeof window === 'undefined' || !window.opener) {
        // If no opener, we're not in a popup - log for debugging
        console.log('[FormEmbed] Message (no opener):', message);
        return;
      }

      // Validate origin if returnOrigin is specified
      if (returnOrigin) {
        const targetOrigin = returnOrigin === '*' ? '*' : returnOrigin;
        try {
          window.opener.postMessage(message, targetOrigin);
        } catch (error) {
          console.error('[FormEmbed] Failed to send message:', error);
        }
      } else {
        // Send to any origin (less secure, but allows flexibility)
        // In production, this should be more restrictive
        try {
          window.opener.postMessage(message, '*');
        } catch (error) {
          console.error('[FormEmbed] Failed to send message:', error);
        }
      }
    },
    [returnOrigin]
  );

  // Notify parent that form is ready
  useEffect(() => {
    if (!schemaId) {
      const errorMessage = createFormEmbedMessage<FormErrorMessage>('form-error', {
        error: 'Schema ID is required',
      });
      sendMessage(errorMessage);
      return;
    }

    // Send ready message
    const readyMessage = createFormEmbedMessage<FormReadyMessage>('form-ready', {
      schemaId,
      mode,
      entityId,
    });
    sendMessage(readyMessage);

    // Send loaded message
    const loadedMessage = createFormEmbedMessage<FormLoadedMessage>('form-loaded', {
      schemaId,
      mode,
    });
    sendMessage(loadedMessage);

    setIsReady(true);
  }, [schemaId, mode, entityId, sendMessage]);

  // Listen for messages from parent window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin if allowedOrigins is specified
      if (allowedOrigins && allowedOrigins.length > 0) {
        if (!validateMessageOrigin(event, allowedOrigins)) {
          console.warn('[FormEmbed] Message from unauthorized origin:', event.origin);
          return;
        }
      }

      // Handle messages from parent if needed
      // For now, we only send messages, not receive them
      console.log('[FormEmbed] Received message from parent:', event.data);
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [allowedOrigins]);

  // Handle form submission success
  const handleSuccess = useCallback(
    (data?: Record<string, any>) => {
      const submittedMessage = createFormEmbedMessage<FormSubmittedMessage>('form-submitted', {
        success: true,
        data,
        entityId: data?.id || entityId,
      });
      sendMessage(submittedMessage);

      // Close the popup after a short delay to allow message to be received
      setTimeout(() => {
        window.close();
      }, 100);
    },
    [sendMessage, entityId]
  );

  // Handle form close
  const handleClose = useCallback(() => {
    const closedMessage = createFormEmbedMessage<FormClosedMessage>('form-closed', {
      reason: 'user',
    });
    sendMessage(closedMessage);

    // Close the popup
    window.close();
  }, [sendMessage]);

  // Handle form errors
  const handleError = useCallback(
    (error: string, statusCode?: number) => {
      const errorMessage = createFormEmbedMessage<FormErrorMessage>('form-error', {
        error,
        statusCode,
      });
      sendMessage(errorMessage);
    },
    [sendMessage]
  );

  if (!schemaId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Form Embed Error
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Schema ID is required. Please provide a valid schemaId parameter.
          </p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <FormModal
        schemaId={schemaId}
        entityId={entityId}
        mode={mode}
        initialValues={initialValues}
        onSuccess={handleSuccess}
        onClose={handleClose}
        size="xl"
      />
    </div>
  );
}

