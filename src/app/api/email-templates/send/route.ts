import { NextRequest, NextResponse } from 'next/server';
import {
  ensureTemplatesSeeded,
} from '@/domains/email-templates/server';

const errorResponse = (message: string, status = 500) =>
  NextResponse.json({ success: false, message, error: message }, { status });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, to, cc, bcc, templateData = {} } = body;

    // Validate required fields
    if (!templateId) {
      return errorResponse('Template ID is required.', 400);
    }

    if (!to || !Array.isArray(to) || to.length === 0) {
      return errorResponse('At least one recipient email address is required.', 400);
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const allRecipients = [...to, ...(cc || []), ...(bcc || [])];
    const invalidEmails = allRecipients.filter((email) => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      return errorResponse(`Invalid email address(es): ${invalidEmails.join(', ')}`, 400);
    }

    // Load templates and find the requested template
    const templates = await ensureTemplatesSeeded();
    const template = templates.find((t) => t.id === templateId);

    if (!template) {
      return errorResponse(`Template with id "${templateId}" not found.`, 404);
    }

    // Get the email sending service URL from environment variables
    const sendEmailUrl = process.env.URL_SEND_EMAIL || process.env.NEXT_PUBLIC_URL_SEND_EMAIL;
    
    if (!sendEmailUrl) {
      return errorResponse('Email service URL is not configured. Please set URL_SEND_EMAIL environment variable.', 500);
    }

    // Prepare the email payload for the external service
    // Backend expects: templateId, to, cc (optional), templateData
    // Backend does NOT want: bcc, subject, html (it renders the template itself)
    const emailPayload: any = {
      templateId: String(templateId),
      to,
      templateData,
    };

    // Only include cc if it's provided and not empty
    if (cc && Array.isArray(cc) && cc.length > 0) {
      emailPayload.cc = cc;
    }

    // Forward the request to the external email service
    const emailResponse = await fetch(sendEmailUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const emailResponseData = await emailResponse.json().catch(() => ({}));

    // Format backend response for MessageBox
    // Backend may return message/error as string or array
    const formatMessage = (msg: any): string => {
      if (typeof msg === 'string') return msg;
      if (Array.isArray(msg)) return msg.join(', ');
      return String(msg || '');
    };

    const formatMessages = (msg: any): Array<{ path?: string; message: string }> | undefined => {
      if (Array.isArray(msg)) {
        return msg.map((m, index) => ({
          path: m.path,
          message: typeof m.message === 'string' ? m.message : formatMessage(m),
        }));
      }
      return undefined;
    };

    if (!emailResponse.ok) {
      // Backend error response
      const errorMessage = formatMessage(emailResponseData.message || emailResponseData.error || 'Failed to send email');
      const errorMessages = formatMessages(emailResponseData.messages) || 
        (Array.isArray(emailResponseData.error) 
          ? emailResponseData.error.map((e: any) => ({ message: formatMessage(e) }))
          : undefined);

      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
          error: emailResponseData.error,
          messages: errorMessages,
        },
        { status: emailResponse.status }
      );
    }

    // Backend success response
    const successMessage = formatMessage(emailResponseData.message || `Test email sent successfully to ${to.length} recipient(s)`);
    const successMessages = formatMessages(emailResponseData.messages);

    // Extract backend response fields (jobId, status, attempts, etc.) and put them in data
    // Only include what comes from the backend, not our own fields
    const { message: _, messages: __, data: backendData, ...backendFields } = emailResponseData;

    return NextResponse.json({
      success: true,
      message: successMessage,
      messages: successMessages,
      data: {
        ...backendData,
        ...backendFields, // Include jobId, status, attempts, etc. from backend
      },
    });
  } catch (error) {
    console.error('Failed to send test email:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to send test email.',
      500
    );
  }
}

