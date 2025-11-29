/**
 * Email Service Types
 * Types for email communication services
 */

export interface SendEmailRequest {
  templateId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  templateData?: Record<string, any>;
}

export interface SendEmailResponse {
  success: boolean;
  message?: string;
  messages?: Array<{ path?: string; message: string }>;
  data?: Record<string, any>;
  error?: string | string[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  subject: string;
  filePath?: string;
  createdAt?: string;
  updatedAt?: string;
}

