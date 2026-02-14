/**
 * Engagements domain types.
 * EngagementGroups, Engagements, and EngagementInteractions.
 */

export type EngagementType = 'notification' | 'discussion' | 'sticky' | 'todo';

export type EngagementDisplayType = 'success' | 'info' | 'warning' | 'error';

export type EngagementPriority = 'low' | 'medium' | 'high' | 'urgent';

export type EngagementInteractionType = 'canRead' | 'needsAcknowledgement';

export type EngagementOutputType = 'approved' | 'rejected';

/** Backend-returned createdBy user object */
export interface EngagementCreatedByUser {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  userId: string;
}

export interface EngagementGroup {
  id: string;
  referenceSchemaId?: string;
  referenceInstanceId?: string;
  title?: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  owners?: string[];
  members?: string[];
  viewers?: string[];
  deletedBy?: string;
  deletedAt?: string;
}

export interface Engagement {
  id: string;
  engagementGroupId?: string | null;
  /** Optional reference to another engagement (e.g. follow-up, related, linked). */
  referenceEngagementId?: string | null;
  engagementType: EngagementType;
  message: string;
  metadata?: Record<string, unknown>;
  priority?: EngagementPriority;
  type?: EngagementDisplayType;
  interactionType: EngagementInteractionType;
  reactions?: unknown[];
  hashtags?: string[];
  /** Created by: string (userId) or full user object from backend */
  createdBy?: string | EngagementCreatedByUser;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  deletedBy?: string;
  deletedAt?: string;
}

export interface EngagementInteraction {
  id: string;
  /** Backend may return interactionId; treat as id alias */
  interactionId?: string;
  engagementId: string;
  /** Optional reference to another engagement (e.g. in response to, linked). */
  referenceEngagementId?: string | null;
  userId: string;
  isRead: boolean;
  readAt?: string;
  /** Backend uses interactedAt; can represent read/interaction time */
  interactedAt?: string;
  dueDate?: string;
  outputType?: EngagementOutputType;
  comment?: string;
}

/** Engagement + interaction(s) for API responses. Backend returns interactions array. */
export interface EngagementWithInteraction extends Engagement {
  /** Singular interaction (current user) - legacy/demo format */
  interaction?: EngagementInteraction | null;
  /** Backend returns interactions array with all users who interacted */
  interactions?: EngagementInteraction[];
}
