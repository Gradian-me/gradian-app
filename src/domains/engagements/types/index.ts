/**
 * Engagements domain types.
 * EngagementGroups, Engagements, and EngagementInteractions.
 */

export type EngagementType = 'notification' | 'discussion' | 'sticky' | 'todo';

export type EngagementDisplayType = 'success' | 'info' | 'warning' | 'error';

export type EngagementPriority = 'low' | 'medium' | 'high' | 'urgent';

export type EngagementInteractionType = 'canRead' | 'needsAcknowledgement';

export type EngagementOutputType = 'approved' | 'rejected';

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
  engagementType: EngagementType;
  message: string;
  metadata?: Record<string, unknown>;
  priority?: EngagementPriority;
  type?: EngagementDisplayType;
  interactionType: EngagementInteractionType;
  reactions?: unknown[];
  hashtags?: string[];
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  deletedBy?: string;
  deletedAt?: string;
}

export interface EngagementInteraction {
  id: string;
  engagementId: string;
  userId: string;
  isRead: boolean;
  readAt?: string;
  dueDate?: string;
  interactedAt?: string;
  outputType?: EngagementOutputType;
  comment?: string;
}

/** Engagement + current user's interaction for API responses */
export interface EngagementWithInteraction extends Engagement {
  interaction?: EngagementInteraction | null;
}
