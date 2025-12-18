import { NextRequest, NextResponse } from 'next/server';
import {
  ensureTemplatesSeeded,
} from '@/domains/email-templates/server';
import { Email } from '@/gradian-ui/communication';
import type { SendEmailResponse } from '@/gradian-ui/communication/email/types';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { readFile } from 'fs/promises';
import { join } from 'path';

const errorResponse = (message: string, status = 500) =>
  NextResponse.json({ success: false, message, error: message }, { status });

/**
 * Load environment variables from .env.prod file
 * This function reads .env.prod and sets process.env variables
 * .env.prod values will override existing .env values
 */
async function loadEnvProd(): Promise<void> {
  try {
    const envProdPath = join(process.cwd(), '.env.production');
    const envContent = await readFile(envProdPath, 'utf-8');
    
    // Parse .env file format (key=value, support quotes)
    const lines = envContent.split('\n');
    let loadedCount = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Parse KEY=VALUE format
      const match = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // Always override with .env.prod values (even if empty, to clear .env values)
        if (value !== '') {
          process.env[key] = value;
          loadedCount++;
        }
      }
    }
    
    loggingCustom(LogType.EMAIL_LOG, 'info', `Loaded ${loadedCount} environment variables from .env.prod (overriding .env)`);
  } catch (error) {
    // If .env.prod doesn't exist, that's okay - use default env vars
    loggingCustom(LogType.EMAIL_LOG, 'warn', `Could not load .env.prod: ${error instanceof Error ? error.message : 'Unknown error'}. Using .env or default values.`);
  }
}

/**
 * Send email directly to external service (server-side only)
 * This function is used by the API route to avoid circular dependency
 */
async function sendEmailToExternalService(
  templateId: string,
  to: string[],
  cc: string[] | undefined,
  templateData: Record<string, any>
): Promise<SendEmailResponse> {
  loggingCustom(LogType.EMAIL_LOG, 'info', `Starting email send - templateId: ${templateId}, to: ${to.join(', ')}`);
  
  const sendEmailUrl = Email.getSendEmailUrl();
  loggingCustom(LogType.EMAIL_LOG, 'debug', `Email service URL: ${sendEmailUrl || 'NOT CONFIGURED'}`);

  if (!sendEmailUrl) {
    loggingCustom(LogType.EMAIL_LOG, 'error', 'URL_SEND_EMAIL environment variable is not configured');
    return {
      success: false,
      message: 'Email service URL is not configured. Please set URL_SEND_EMAIL environment variable.',
      error: 'URL_SEND_EMAIL not configured',
    };
  }

  try {
    // Prepare the email payload
    const emailPayload: any = {
      templateId: String(templateId),
      to,
      templateData: templateData || {},
    };

    // Only include cc if it's provided and not empty
    if (cc && Array.isArray(cc) && cc.length > 0) {
      emailPayload.cc = cc;
      loggingCustom(LogType.EMAIL_LOG, 'debug', `CC recipients: ${cc.join(', ')}`);
    }

    // Construct absolute URL if needed
    let fetchUrl: string;
    if (sendEmailUrl.startsWith('http://') || sendEmailUrl.startsWith('https://')) {
      fetchUrl = sendEmailUrl;
    } else {
      const baseUrl = process.env.NEXTAUTH_URL || 
                     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      fetchUrl = `${baseUrl}${sendEmailUrl.startsWith('/') ? sendEmailUrl : `/${sendEmailUrl}`}`;
    }

    loggingCustom(LogType.EMAIL_LOG, 'debug', `Sending POST request to: ${fetchUrl}`);
    loggingCustom(LogType.EMAIL_LOG, 'debug', `Email payload: ${JSON.stringify(emailPayload, null, 2)}`);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let response: Response;
    try {
      response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Extract all possible error information
      const errorInfo: any = {
        name: fetchError?.name || 'Unknown',
        message: fetchError?.message || 'Unknown error',
        code: fetchError?.code || null,
        errno: fetchError?.errno || null,
        syscall: fetchError?.syscall || null,
        hostname: fetchError?.hostname || null,
        port: fetchError?.port || null,
        cause: fetchError?.cause || null,
        stack: fetchError?.stack || null,
      };
      
      // Try to extract error from cause if it exists
      if (errorInfo.cause) {
        if (typeof errorInfo.cause === 'object') {
          errorInfo.causeCode = errorInfo.cause.code || null;
          errorInfo.causeMessage = errorInfo.cause.message || null;
          errorInfo.causeErrno = errorInfo.cause.errno || null;
        }
      }
      
      // Log full error details
      loggingCustom(LogType.EMAIL_LOG, 'error', `Fetch error - Full details: ${JSON.stringify(errorInfo, null, 2)}`);
      
      // Provide more detailed error information
      const errorDetails = errorInfo.message || 'Unknown fetch error';
      let userFriendlyMessage = errorDetails;
      
      // Check error code (might be in cause)
      const errorCode = errorInfo.code || errorInfo.causeCode;
      const errorName = errorInfo.name;
      
      if (errorName === 'AbortError') {
        userFriendlyMessage = 'Request timeout after 30 seconds';
      } else if (errorCode === 'ECONNREFUSED') {
        userFriendlyMessage = `Connection refused - server at ${fetchUrl} is not accepting connections. The service may be down or the port may be blocked.`;
      } else if (errorCode === 'ENOTFOUND') {
        userFriendlyMessage = `DNS lookup failed - cannot resolve hostname in ${fetchUrl}. Please check the URL.`;
      } else if (errorCode === 'ETIMEDOUT') {
        userFriendlyMessage = `Connection timeout - server at ${fetchUrl} did not respond in time.`;
      } else if (errorCode === 'ECONNRESET') {
        userFriendlyMessage = `Connection reset by server at ${fetchUrl}.`;
      } else if (errorCode === 'EAI_AGAIN') {
        userFriendlyMessage = `DNS lookup temporary failure for ${fetchUrl}. Please try again.`;
      } else if (errorCode) {
        userFriendlyMessage = `Network error (${errorCode}): ${errorDetails}`;
      } else if (errorInfo.message?.includes('fetch failed')) {
        // Generic fetch failed - try to provide helpful context
        userFriendlyMessage = `Failed to connect to email service at ${fetchUrl}. This could be due to:\n- Server is down or unreachable\n- Network connectivity issues\n- Firewall blocking the connection\n- Incorrect URL or port\n\nError: ${errorDetails}`;
      }
      
      loggingCustom(LogType.EMAIL_LOG, 'error', `Error code: ${errorCode || 'N/A'}`);
      loggingCustom(LogType.EMAIL_LOG, 'error', `Error name: ${errorName || 'N/A'}`);
      loggingCustom(LogType.EMAIL_LOG, 'error', `User-friendly message: ${userFriendlyMessage}`);
      
      return {
        success: false,
        message: userFriendlyMessage,
        error: errorDetails,
      };
    }

    loggingCustom(LogType.EMAIL_LOG, 'info', `Email service response status: ${response.status} ${response.statusText}`);

    const responseData = await response.json().catch((error) => {
      loggingCustom(LogType.EMAIL_LOG, 'error', `Failed to parse response JSON: ${error}`);
      return {};
    });
    
    loggingCustom(LogType.EMAIL_LOG, 'debug', `Email service response data: ${JSON.stringify(responseData, null, 2)}`);

    // Format response
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

    if (!response.ok) {
      const errorMessage = formatMessage(responseData.message || responseData.error || 'Failed to send email');
      const errorMessages = formatMessages(responseData.messages) ||
        (Array.isArray(responseData.error)
          ? responseData.error.map((e: any) => ({ message: formatMessage(e) }))
          : undefined);

      loggingCustom(LogType.EMAIL_LOG, 'error', `Email send failed - Status: ${response.status}, Message: ${errorMessage}`);
      if (errorMessages) {
        loggingCustom(LogType.EMAIL_LOG, 'error', `Error messages: ${JSON.stringify(errorMessages)}`);
      }

      return {
        success: false,
        message: errorMessage,
        messages: errorMessages,
        error: responseData.error,
      };
    }

    const successMessage = formatMessage(responseData.message || `Email sent successfully to ${to.length} recipient(s)`);
    const successMessages = formatMessages(responseData.messages);

    const { message: _, messages: __, data: backendData, ...backendFields } = responseData;

    loggingCustom(LogType.EMAIL_LOG, 'info', `Email sent successfully - ${successMessage}`);

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
    let errorMessage = 'Failed to send email';
    let errorDetails: any = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
      
      // Check for specific error types
      if ('code' in error) {
        errorDetails.code = (error as any).code;
      }
      if ('cause' in error) {
        errorDetails.cause = (error as any).cause;
      }
    } else {
      errorDetails = { rawError: String(error) };
    }
    
    loggingCustom(LogType.EMAIL_LOG, 'error', `Exception during email send: ${errorMessage}`);
    loggingCustom(LogType.EMAIL_LOG, 'error', `Error details: ${JSON.stringify(errorDetails, null, 2)}`);
    
    // Provide more helpful error message based on error type
    let userFriendlyMessage = errorMessage;
    if (errorDetails.code === 'ECONNREFUSED') {
      userFriendlyMessage = `Cannot connect to email service at ${sendEmailUrl}. The server may be down or not accepting connections.`;
    } else if (errorDetails.code === 'ENOTFOUND') {
      userFriendlyMessage = `Cannot resolve hostname in ${sendEmailUrl}. Please check the URL.`;
    } else if (errorDetails.code === 'ETIMEDOUT') {
      userFriendlyMessage = `Connection to ${sendEmailUrl} timed out. The server may be slow or unreachable.`;
    } else if (errorDetails.name === 'AbortError') {
      userFriendlyMessage = `Request to ${sendEmailUrl} timed out after 30 seconds.`;
    }
    
    return {
      success: false,
      message: userFriendlyMessage,
      error: errorMessage,
    };
  }
}

export async function POST(request: NextRequest) {
  loggingCustom(LogType.EMAIL_LOG, 'info', 'POST /api/email-templates/send - Request received');
  
  // Load .env.prod before processing request
  await loadEnvProd();
  
  try {
    const body = await request.json();
    loggingCustom(LogType.EMAIL_LOG, 'debug', `Request body: ${JSON.stringify(body, null, 2)}`);
    
    const { templateId, to, cc, bcc, templateData = {} } = body;

    // Validate required fields
    if (!templateId) {
      loggingCustom(LogType.EMAIL_LOG, 'warn', 'Validation failed: Template ID is required');
      return errorResponse('Template ID is required.', 400);
    }

    if (!to || !Array.isArray(to) || to.length === 0) {
      loggingCustom(LogType.EMAIL_LOG, 'warn', 'Validation failed: At least one recipient email address is required');
      return errorResponse('At least one recipient email address is required.', 400);
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const allRecipients = [...to, ...(cc || []), ...(bcc || [])];
    const invalidEmails = allRecipients.filter((email) => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      loggingCustom(LogType.EMAIL_LOG, 'warn', `Validation failed: Invalid email address(es): ${invalidEmails.join(', ')}`);
      return errorResponse(`Invalid email address(es): ${invalidEmails.join(', ')}`, 400);
    }

    // Load templates and find the requested template
    loggingCustom(LogType.EMAIL_LOG, 'debug', 'Loading email templates...');
    const templates = await ensureTemplatesSeeded();
    loggingCustom(LogType.EMAIL_LOG, 'debug', `Found ${templates.length} templates`);
    
    const template = templates.find((t) => t.id === templateId);

    if (!template) {
      loggingCustom(LogType.EMAIL_LOG, 'warn', `Template with id "${templateId}" not found`);
      return errorResponse(`Template with id "${templateId}" not found.`, 404);
    }

    loggingCustom(LogType.EMAIL_LOG, 'info', `Template found: ${template.name} (${template.id})`);

    // Send email using the communication service utility (direct external call)
    loggingCustom(LogType.EMAIL_LOG, 'info', 'Calling sendEmailToExternalService...');
    const emailResponse = await sendEmailToExternalService(
      String(templateId),
      to,
      cc && Array.isArray(cc) && cc.length > 0 ? cc : undefined,
      templateData
    );

    // Return the response
    if (!emailResponse.success) {
      loggingCustom(LogType.EMAIL_LOG, 'error', `Email send failed in route handler: ${emailResponse.message}`);
      return NextResponse.json(
        {
          success: false,
          message: emailResponse.message,
          error: emailResponse.error,
          messages: emailResponse.messages,
        },
        { status: 500 }
      );
    }

    loggingCustom(LogType.EMAIL_LOG, 'info', 'Email sent successfully via route handler');
    return NextResponse.json({
      success: true,
      message: emailResponse.message,
      messages: emailResponse.messages,
      data: emailResponse.data,
    });
  } catch (error) {
    loggingCustom(LogType.EMAIL_LOG, 'error', `Exception in POST /api/email-templates/send: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error) {
      loggingCustom(LogType.EMAIL_LOG, 'error', `Error stack: ${error.stack}`);
    }
    console.error('Failed to send test email:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to send test email.',
      500
    );
  }
}

