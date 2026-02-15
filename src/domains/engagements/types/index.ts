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

/** Reference type for engagement groups and bookmarks */
export type ReferenceType = 'schema' | 'engagement' | 'engagement-group' | string;

export interface EngagementGroup {
  id: string;
  /** Reference type: schema, engagement, engagement-group, etc. */
  referenceType?: ReferenceType;
  /** ID of the referenced entity (e.g. schemaId when referenceType= schema) */
  referenceId?: string;
  referenceInstanceId?: string;
  /** @deprecated Use referenceType='schema' + referenceId instead */
  referenceSchemaId?: string;
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
  /** Due date for todo/action items */
  dueDate?: string;
  /** Created by: string (userId) or full user object from backend */
  createdBy?: string | EngagementCreatedByUser;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  deletedBy?: string;
  deletedAt?: string;
}

/** User interaction type: read, acknowledge, or mention */
export type EngagementInteractionUserType = 'read' | 'acknowledge' | 'mention';

export interface EngagementInteraction {
  id: string;
  /** Backend may return interactionId; treat as id alias */
  interactionId?: string;
  engagementId: string;
  /** Optional reference to another engagement (e.g. in response to, linked). */
  referenceEngagementId?: string | null;
  userId: string;
  /** Type of interaction: read, acknowledge, or mention */
  interactionType?: EngagementInteractionUserType;
  /** When the user performed the interaction */
  interactedAt?: string;
  outputType?: EngagementOutputType;
  comment?: string;
  /** @deprecated Use interaction.interactionType to derive read state. Kept for API compatibility. */
  isRead?: boolean;
  /** @deprecated Use interaction.interactedAt. Kept for API compatibility. */
  readAt?: string;
}

/** Engagement + interaction(s) for API responses. Backend returns interactions array. */
export interface EngagementWithInteraction extends Engagement {
  /** Singular interaction (current user) - legacy/demo format */
  interaction?: EngagementInteraction | null;
  /** Backend returns interactions array with all users who interacted */
  interactions?: EngagementInteraction[];
}
