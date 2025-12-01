/**
 * Communication Service
 * Communication services for Gradian UI (Email, SMS, Push Notifications, etc.)
 */

// Email Service
export * as Email from './email';

// Re-export email types for convenience
export type { SendEmailRequest, SendEmailResponse, EmailTemplate } from './email';

// Voice Service
export * as Voice from './voice';

// Re-export voice components for convenience
export { VoicePoweredOrb, VoiceInputDialog } from './voice';
export type { VoicePoweredOrbProps } from './voice';

// Future services can be added here:
// export * as SMS from './sms';
// export * as PushNotifications from './push-notifications';
