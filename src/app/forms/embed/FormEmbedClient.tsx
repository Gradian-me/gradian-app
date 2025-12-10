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

  // Check if we're in modal mode
  const isModalMode = searchParams?.get('modalMode') === 'true';

  const isOriginAllowed = useCallback(
    (origin: string | undefined | null): boolean => {
      if (!origin) return false;
      const originEvent = { origin } as MessageEvent;
      if (allowedOrigins && allowedOrigins.length > 0) {
        return validateMessageOrigin(originEvent, allowedOrigins);
      }
      if (returnOrigin && returnOrigin !== '*') {
        return validateMessageOrigin(originEvent, [returnOrigin]);
      }
      return false;
    },
    [allowedOrigins, returnOrigin]
  );

  // Send message to parent window with origin enforcement
  const sendMessage = useCallback(
    (message: FormEmbedMessage) => {
      if (typeof window === 'undefined') {
        return;
      }

      const targetWindow = isModalMode ? window.parent : window.opener;
      const originHint = returnOrigin || allowedOrigins?.[0];
      const targetOrigin = originHint && originHint !== '*' ? originHint : undefined;

      if (!targetWindow) {
        console.warn('[FormEmbed] No target window available for messaging');
        return;
      }

      const originToUse = targetOrigin || (typeof window !== 'undefined' ? window.origin : undefined);
      if (!originToUse) {
        console.warn('[FormEmbed] Unable to determine safe target origin; message not sent');
        return;
      }

      try {
        targetWindow.postMessage(message, originToUse);
      } catch (error) {
        console.error('[FormEmbed] Failed to send message:', error);
      }
    },
    [returnOrigin, allowedOrigins, isModalMode]
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

  // Handle form close (defined before useEffect that uses it)
  const handleClose = useCallback(() => {
    const closedMessage = createFormEmbedMessage<FormClosedMessage>('form-closed', {
      reason: 'user',
    });
    sendMessage(closedMessage);

    // Close the popup (only if not in modal mode)
    if (!isModalMode && typeof window !== 'undefined' && window.opener) {
      window.close();
    }
  }, [sendMessage, isModalMode]);

  // Handle form submission success
  const handleSuccess = useCallback(
    (data?: Record<string, any>) => {
      const submittedMessage = createFormEmbedMessage<FormSubmittedMessage>('form-submitted', {
        success: true,
        data,
        entityId: data?.id || entityId,
      });
      sendMessage(submittedMessage);

      // Close the popup after a short delay to allow message to be received (only if not in modal mode)
      if (!isModalMode) {
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.opener) {
            window.close();
          }
        }, 100);
      }
    },
    [sendMessage, entityId, isModalMode]
  );

  // Listen for messages from parent window (for modal mode close)
  useEffect(() => {
    if (!isModalMode) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (!isOriginAllowed(event.origin)) {
        console.warn('[FormEmbed] Ignoring message from untrusted origin:', event.origin);
        return;
      }
      // Handle close message from parent modal
      if (event.data && event.data.type === 'close-form') {
        handleClose();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isModalMode, handleClose]);

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


  // In modal mode, remove the full-screen background and hide duplicate headers/close buttons
  const containerStyle = isModalMode 
    ? { background: 'transparent', minHeight: 'auto' }
    : {};

  return (
    <div style={containerStyle} className={isModalMode ? '' : 'min-h-screen bg-gray-50 dark:bg-gray-900'}>
      <FormModal
        schemaId={schemaId}
        entityId={entityId}
        mode={mode}
        initialValues={initialValues}
        onSuccess={handleSuccess}
        onClose={handleClose}
        size="xl"
        hideDialogHeader={isModalMode}
        hideCloseButton={isModalMode}
      />
    </div>
  );
}

