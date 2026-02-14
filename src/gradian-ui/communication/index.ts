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

// Professional Writing Service
export * as ProfessionalWriting from './professional-writing';

// Re-export professional writing components and hooks for convenience
export { ProfessionalWritingModal, useProfessionalWriting } from './professional-writing';
export type {
  WritingStyle,
  TranslationLanguage,
  ProfessionalWritingRequest,
  ProfessionalWritingResponse,
} from './professional-writing';
export { SUPPORTED_LANGUAGES } from './professional-writing';

// Discussion Service
export * as Discussion from './discussion';
export {
  DiscussionsDialog,
  DiscussionInputDialog,
  DiscussionThread,
  DiscussionMessage,
  AvatarGroup,
  useDiscussions,
} from './discussion';
export type {
  DiscussionConfig,
  DiscussionParticipant,
  DiscussionMessage as DiscussionMessageType,
} from './discussion';

// Future services can be added here:
// export * as SMS from './sms';
// export * as PushNotifications from './push-notifications';
