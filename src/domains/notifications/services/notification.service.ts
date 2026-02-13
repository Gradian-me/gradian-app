import { Notification, NotificationFilters, NotificationGroup } from '../types';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import type { EngagementWithInteraction } from '@/domains/engagements/types';

/** Transform engagement + interaction from API to Notification shape for UI */
function engagementToNotification(item: EngagementWithInteraction): Notification {
  const e = item;
  const meta = (e.metadata || {}) as Record<string, unknown>;
  const title = (meta.title as string) ?? '';
  const category = (meta.category as string) ?? 'system';
  const actionUrl = meta.actionUrl as string | undefined;
  const interaction = item.interaction;

  return {
    id: e.id,
    title,
    message: e.message ?? '',
    type: (e.type === 'error' ? 'important' : (e.type ?? 'info')) as
      | 'success'
      | 'info'
      | 'warning'
      | 'important',
    category: category as Notification['category'],
    priority: (e.priority ?? 'medium') as Notification['priority'],
    isRead: interaction?.isRead ?? false,
    createdAt: new Date(e.createdAt),
    readAt: interaction?.readAt ? new Date(interaction.readAt) : undefined,
    acknowledgedAt:
      interaction?.outputType && interaction.interactedAt
        ? new Date(interaction.interactedAt)
        : undefined,
    interactionType: (e.interactionType ?? 'canRead') as
      | 'canRead'
      | 'needsAcknowledgement',
    createdBy: e.createdBy,
    assignedTo: undefined,
    actionUrl,
    metadata: e.metadata as Notification['metadata'],
  };
}

const getCurrentUserId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const { useUserStore } = require('@/stores/user.store');
    return useUserStore.getState().getUserId();
  } catch {
    return null;
  }
};

const DEFAULT_USER_ID = 'mahyar';

async function getNotificationsFromAPI(
  filters?: NotificationFilters,
  currentUserId?: string,
): Promise<Notification[]> {
  try {
    const userId = currentUserId ?? getCurrentUserId() ?? DEFAULT_USER_ID;
    const params: Record<string, string> = {
      currentUserId: userId,
    };
    if (filters?.search) params.search = filters.search;
    if (filters?.type) params.type = filters.type;
    if (filters?.category) params.category = filters.category;
    if (filters?.priority) params.priority = filters.priority;
    if (filters?.isRead !== undefined) params.isRead = filters.isRead.toString();
    if (filters?.sourceType) params.sourceType = filters.sourceType;

    const response = await apiRequest<EngagementWithInteraction[]>(
      '/api/engagements/notifications',
      {
        method: 'GET',
        params,
        callerName: 'NotificationService.getNotifications',
      },
    );

    if (!response.success || !response.data) return [];

    let list = (Array.isArray(response.data) ? response.data : []).map(
      engagementToNotification,
    );

    if (filters?.sourceType) {
      const uid = currentUserId ?? getCurrentUserId() ?? DEFAULT_USER_ID;
      list = list.filter((n) => {
        if (filters.sourceType === 'createdByMe') return n.createdBy === uid;
        if (filters.sourceType === 'assignedToMe')
          return n.assignedTo?.some((a) => a.userId === uid) ?? false;
        return true;
      });
    }

    if (filters?.isRead !== undefined) {
      list = list.filter((n) => n.isRead === filters.isRead);
    }

    return list;
  } catch (error) {
    console.error('Error fetching notifications from API:', error);
    return [];
  }
}

export class NotificationService {
  static async getNotifications(
    filters: NotificationFilters = {},
    currentUserId?: string,
  ): Promise<Notification[]> {
    const notifications = await getNotificationsFromAPI(filters, currentUserId);
    let filtered = [...notifications];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(searchLower) ||
          n.message.toLowerCase().includes(searchLower),
      );
    }

    return filtered.sort((a, b) => {
      const aNeedsAck = a.interactionType === 'needsAcknowledgement' ? 1 : 0;
      const bNeedsAck = b.interactionType === 'needsAcknowledgement' ? 1 : 0;
      if (aNeedsAck !== bNeedsAck) return bNeedsAck - aNeedsAck;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  static async getGroupedNotifications(
    filters: NotificationFilters = {},
    groupBy: 'category' | 'type' | 'priority' | 'status' = 'category',
    currentUserId?: string,
  ): Promise<NotificationGroup[]> {
    const notifications = await this.getNotifications(filters, currentUserId);
    const needsAcknowledgement = notifications.filter(
      (n) => n.interactionType === 'needsAcknowledgement',
    );
    const other = notifications.filter(
      (n) => n.interactionType !== 'needsAcknowledgement',
    );
    needsAcknowledgement.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const groups: Record<string, Notification[]> = {};
    other.forEach((n) => {
      const key =
        groupBy === 'type'
          ? n.type
          : groupBy === 'priority'
            ? n.priority
            : groupBy === 'status'
              ? (n.isRead ? 'read' : 'unread')
              : n.category;
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });

    const result: NotificationGroup[] = [];
    if (needsAcknowledgement.length > 0) {
      result.push({
        category: 'needs_acknowledgement',
        notifications: needsAcknowledgement,
        unreadCount: needsAcknowledgement.filter((n) => !n.isRead).length,
        totalCount: needsAcknowledgement.length,
      });
    }
    result.push(
      ...Object.entries(groups).map(([category, notifications]) => ({
        category,
        notifications,
        unreadCount: notifications.filter((n) => !n.isRead).length,
        totalCount: notifications.length,
      })),
    );
    return result;
  }

  static async markAsRead(notificationId: string): Promise<void> {
    const userId = getCurrentUserId() ?? DEFAULT_USER_ID;
    const response = await apiRequest('/api/engagement-interactions', {
      method: 'POST',
      body: {
        engagementId: notificationId,
        userId,
        isRead: true,
        readAt: new Date().toISOString(),
      },
      callerName: 'NotificationService.markAsRead',
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to mark notification as read');
    }
  }

  static async acknowledge(notificationId: string): Promise<void> {
    const userId = getCurrentUserId() ?? DEFAULT_USER_ID;
    const response = await apiRequest('/api/engagement-interactions', {
      method: 'POST',
      body: {
        engagementId: notificationId,
        userId,
        interactedAt: new Date().toISOString(),
        outputType: 'approved',
      },
      callerName: 'NotificationService.acknowledge',
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to acknowledge notification');
    }
  }

  static async markAsUnread(notificationId: string): Promise<void> {
    const userId = getCurrentUserId() ?? DEFAULT_USER_ID;
    const response = await apiRequest('/api/engagement-interactions', {
      method: 'POST',
      body: {
        engagementId: notificationId,
        userId,
        isRead: false,
      },
      callerName: 'NotificationService.markAsUnread',
    });
    if (!response.success) {
      throw new Error(
        response.error || 'Failed to mark notification as unread',
      );
    }
  }

  static async markAllAsRead(): Promise<void> {
    const notifications = await getNotificationsFromAPI({ isRead: false });
    const toMark = notifications.filter(
      (n) => n.interactionType !== 'needsAcknowledgement',
    );
    const userId = getCurrentUserId() ?? DEFAULT_USER_ID;
    await Promise.all(
      toMark.map((n) =>
        apiRequest('/api/engagement-interactions', {
          method: 'POST',
          body: {
            engagementId: n.id,
            userId,
            isRead: true,
            readAt: new Date().toISOString(),
          },
        }),
      ),
    );
  }

  static async getUnreadCount(currentUserId?: string): Promise<number> {
    const userId =
      currentUserId ?? getCurrentUserId() ?? DEFAULT_USER_ID;
    try {
      const response = await apiRequest<number>(
        '/api/engagements/notifications/count',
        {
          method: 'GET',
          params: { currentUserId: userId, isRead: 'false' },
          callerName: 'NotificationService.getUnreadCount',
        },
      );
      if (response.success && typeof response.data === 'number') {
        return response.data;
      }
    } catch (error) {
      console.error('Error fetching unread count from API:', error);
    }
    return 0;
  }

  static async createNotification(
    notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>,
  ): Promise<Notification> {
    const body = {
      message: notification.message,
      metadata: {
        ...notification.metadata,
        title: notification.title,
        category: notification.category,
        actionUrl: notification.actionUrl,
      },
      priority: notification.priority,
      type: notification.type,
      interactionType: notification.interactionType ?? 'canRead',
      createdBy: notification.createdBy,
    };
    const response = await apiRequest<EngagementWithInteraction>(
      '/api/engagements/notifications',
      { method: 'POST', body },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create notification');
    }
    return engagementToNotification(response.data);
  }

  static async updateNotification(
    id: string,
    updates: Partial<Notification>,
  ): Promise<Notification | null> {
    const body: Record<string, unknown> = {};
    if (updates.message != null) body.message = updates.message;
    if (updates.priority != null) body.priority = updates.priority;
    if (updates.type != null) body.type = updates.type;
    if (updates.interactionType != null)
      body.interactionType = updates.interactionType;
    if (updates.metadata != null) body.metadata = updates.metadata;
    if (updates.actionUrl != null) {
      body.metadata = {
        ...(typeof body.metadata === 'object' && body.metadata
          ? body.metadata
          : {}),
        actionUrl: updates.actionUrl,
      };
    }
    const response = await apiRequest<EngagementWithInteraction>(
      `/api/engagements/${id}`,
      { method: 'PUT', body },
    );
    if (!response.success || !response.data) return null;
    return engagementToNotification(response.data);
  }

  static async deleteNotification(id: string): Promise<boolean> {
    const response = await apiRequest(`/api/engagements/${id}`, {
      method: 'DELETE',
    });
    return response.success;
  }

  static getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      quotation: 'Quotations',
      purchase_order: 'Purchase Orders',
      shipment: 'Shipments',
      vendor: 'Vendors',
      tender: 'Tenders',
      system: 'System',
    };
    return labels[category] || category;
  }

  static getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      success: 'Success',
      info: 'Information',
      warning: 'Warning',
      important: 'Important',
      error: 'Important',
    };
    return labels[type] || type;
  }

  static getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent',
    };
    return labels[priority] || priority;
  }
}
