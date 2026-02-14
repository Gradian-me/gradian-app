/**
 * Discussion module types
 * Re-exports and extends engagement types for discussion UI
 */

import type {
  Engagement,
  EngagementInteraction,
  EngagementWithInteraction,
  EngagementPriority,
} from '@/domains/engagements/types';

export type { Engagement, EngagementInteraction, EngagementWithInteraction, EngagementPriority };

export interface DiscussionConfig {
  schemaId: string;
  instanceId: string;
  currentUserId?: string;
  /** When set, creates a reply to this engagement */
  referenceEngagementId?: string;
}

export interface DiscussionParticipant {
  userId: string;
  name?: string;
  avatarUrl?: string;
  username?: string;
  fallback?: string; // initials
  readAt?: string;
}

export interface DiscussionMessage extends EngagementWithInteraction {
  interactions?: EngagementInteraction[];
  participants?: DiscussionParticipant[];
}
