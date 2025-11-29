/**
 * Email Service
 * Email communication services for Gradian UI
 */

// Types
export type { SendEmailRequest, SendEmailResponse, EmailTemplate } from './types';

// Utils
export { sendEmail, getSendEmailUrl } from './utils';

// Hooks
export { useSendEmail } from './hooks';
export type { UseSendEmailReturn } from './hooks';

