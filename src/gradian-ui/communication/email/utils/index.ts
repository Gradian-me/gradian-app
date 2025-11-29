/**
 * Email Service Utilities
 * Utility functions for email communication services
 */

import type { SendEmailRequest, SendEmailResponse } from '../types';

/**
 * Get the email sending service URL from environment variables
 * Checks both NEXT_PUBLIC_URL_SEND_EMAIL and URL_SEND_EMAIL
 */
export function getSendEmailUrl(): string | null {
  if (typeof window !== 'undefined') {
    // Client-side: use NEXT_PUBLIC_ prefix
    return process.env.NEXT_PUBLIC_URL_SEND_EMAIL || null;
  } else {
    // Server-side: check both
    return process.env.URL_SEND_EMAIL || process.env.NEXT_PUBLIC_URL_SEND_EMAIL || null;
  }
}

/**
 * Send an email using the configured email service
 * @param request - Email request with templateId, recipients, and template data
 * @returns Promise with email sending response
 */
export async function sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
  const sendEmailUrl = getSendEmailUrl();

  try {
    // Prepare the email payload
    // Backend expects: templateId, to, cc (optional), templateData
    const emailPayload: any = {
      templateId: String(request.templateId),
      to: request.to,
      templateData: request.templateData || {},
    };

    // Only include cc if it's provided and not empty
    if (request.cc && Array.isArray(request.cc) && request.cc.length > 0) {
      emailPayload.cc = request.cc;
    }

    // Determine if we need to use an API route or direct URL
    let fetchUrl: string;
    if (sendEmailUrl) {
      // URL_SEND_EMAIL is set - use it directly
      if (sendEmailUrl.startsWith('http://') || sendEmailUrl.startsWith('https://')) {
        // External URL - use directly
        fetchUrl = sendEmailUrl;
      } else {
        // Relative path - construct absolute URL if on server
        if (typeof window === 'undefined') {
          const baseUrl = process.env.NEXTAUTH_URL || 
                         (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
          fetchUrl = `${baseUrl}${sendEmailUrl.startsWith('/') ? sendEmailUrl : `/${sendEmailUrl}`}`;
        } else {
          fetchUrl = sendEmailUrl.startsWith('/') ? sendEmailUrl : `/${sendEmailUrl}`;
        }
      }
    } else {
      // Fallback to API route if URL_SEND_EMAIL is not set
      fetchUrl = '/api/email-templates/send';
      
      // If we're on the server, construct absolute URL
      if (typeof window === 'undefined') {
        const baseUrl = process.env.NEXTAUTH_URL || 
                       (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        fetchUrl = `${baseUrl}${fetchUrl}`;
      }
    }

    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Format error response
      const formatMessage = (msg: any): string => {
        if (typeof msg === 'string') return msg;
        if (Array.isArray(msg)) return msg.join(', ');
        return String(msg || '');
      };

      const formatMessages = (msg: any): Array<{ path?: string; message: string }> | undefined => {
        if (Array.isArray(msg)) {
          return msg.map((m) => ({
            path: m.path,
            message: typeof m.message === 'string' ? m.message : formatMessage(m),
          }));
        }
        return undefined;
      };

      const errorMessage = formatMessage(responseData.message || responseData.error || 'Failed to send email');
      const errorMessages = formatMessages(responseData.messages) ||
        (Array.isArray(responseData.error)
          ? responseData.error.map((e: any) => ({ message: formatMessage(e) }))
          : undefined);

      return {
        success: false,
        message: errorMessage,
        messages: errorMessages,
        error: responseData.error,
      };
    }

    // Format success response
    const formatMessage = (msg: any): string => {
      if (typeof msg === 'string') return msg;
      if (Array.isArray(msg)) return msg.join(', ');
      return String(msg || '');
    };

    const formatMessages = (msg: any): Array<{ path?: string; message: string }> | undefined => {
      if (Array.isArray(msg)) {
        return msg.map((m) => ({
          path: m.path,
          message: typeof m.message === 'string' ? m.message : formatMessage(m),
        }));
      }
      return undefined;
    };

    const successMessage = formatMessage(responseData.message || `Email sent successfully to ${request.to.length} recipient(s)`);
    const successMessages = formatMessages(responseData.messages);

    // Extract backend response fields
    const { message: _, messages: __, data: backendData, ...backendFields } = responseData;

    return {
      success: true,
      message: successMessage,
      messages: successMessages,
      data: {
        ...backendData,
        ...backendFields,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

