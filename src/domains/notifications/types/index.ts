import type { EngagementCreatedByUser } from '@/domains/engagements/types';

export interface AssignedToItem {
  userId: string;
  interactedAt?: Date;
  comment?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'important';
  category: 'quotation' | 'purchase_order' | 'shipment' | 'vendor' | 'tender' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
  acknowledgedAt?: Date;
  interactionType?: 'canRead' | 'needsAcknowledgement';
  /** User id (string) or full user object from API for display */
  createdBy?: string | EngagementCreatedByUser;
  assignedTo?: AssignedToItem[];
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationFilters {
  search?: string;
  type?: string;
  category?: string;
  priority?: string;
  isRead?: boolean;
  sourceType?: 'createdByMe' | 'assignedToMe';
}

export type GroupByOption = 'category' | 'type' | 'priority' | 'status';

export interface NotificationGroup {
  category: string;
  notifications: Notification[];
  unreadCount: number;
  totalCount?: number; // Total count before pagination
}
