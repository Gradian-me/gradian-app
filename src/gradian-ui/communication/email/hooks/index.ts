/**
 * Email Service Hooks
 * React hooks for email communication services
 */

'use client';

import { useState, useCallback } from 'react';
import { sendEmail } from '../utils';
import type { SendEmailRequest, SendEmailResponse } from '../types';

export interface UseSendEmailReturn {
  sendEmail: (request: SendEmailRequest) => Promise<SendEmailResponse>;
  loading: boolean;
  error: string | null;
  lastResponse: SendEmailResponse | null;
}

/**
 * Hook for sending emails
 * Provides loading state, error handling, and response tracking
 */
export function useSendEmail(): UseSendEmailReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<SendEmailResponse | null>(null);

  const handleSendEmail = useCallback(async (request: SendEmailRequest): Promise<SendEmailResponse> => {
    setLoading(true);
    setError(null);
    setLastResponse(null);

    try {
      const response = await sendEmail(request);
      setLastResponse(response);

      if (!response.success) {
        setError(response.message || 'Failed to send email');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send email';
      setError(errorMessage);
      const errorResponse: SendEmailResponse = {
        success: false,
        message: errorMessage,
        error: errorMessage,
      };
      setLastResponse(errorResponse);
      return errorResponse;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    sendEmail: handleSendEmail,
    loading,
    error,
    lastResponse,
  };
}

