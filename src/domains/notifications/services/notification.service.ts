import { Notification, NotificationFilters, NotificationGroup } from '../types';
import { apiRequest } from '@/gradian-ui/shared/utils/api';

// Transform raw notification data to Notification type
function transformNotificationData(notification: any): Notification {
  // Use readAt and acknowledgedAt directly
  const readAt = notification.readAt;
  const acknowledgedAt = notification.acknowledgedAt;
  
  // Transform assignedTo array
  const assignedTo = notification.assignedTo?.map((item: any) => ({
    userId: item.userId,
    interactedAt: item.interactedAt ? new Date(item.interactedAt) : undefined,
    comment: item.comment
  }));
  
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: (notification.type === 'error' ? 'important' : notification.type) as 'success' | 'info' | 'warning' | 'important',
    category: notification.category as 'quotation' | 'purchase_order' | 'shipment' | 'vendor' | 'tender' | 'system',
    priority: notification.priority as 'low' | 'medium' | 'high' | 'urgent',
    isRead: notification.isRead,
    createdAt: new Date(notification.createdAt),
    readAt: readAt ? new Date(readAt) : undefined,
    acknowledgedAt: acknowledgedAt ? new Date(acknowledgedAt) : undefined,
    interactionType: (notification.interactionType ?? 'canRead') as 'canRead' | 'needsAcknowledgement',
    createdBy: notification.createdBy,
    assignedTo: assignedTo,
    actionUrl: notification.actionUrl,
    metadata: notification.metadata
  };
}

// Get current user ID from store
// Returns null if no user is logged in
const getCurrentUserId = (): string | null => {
  // This will be called on the client side, so we need to handle SSR
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Import dynamically to avoid SSR issues
  try {
    const { useUserStore } = require('@/stores/user.store');
    return useUserStore.getState().getUserId();
  } catch (error) {
    console.warn('Failed to get user ID from store:', error);
    return null;
  }
};

// Get notifications from API
async function getNotificationsFromAPI(filters?: NotificationFilters, currentUserId?: string): Promise<Notification[]> {
  try {
    const params: Record<string, string> = {};
    if (filters?.search) params.search = filters.search;
    if (filters?.type) params.type = filters.type;
    if (filters?.category) params.category = filters.category;
    if (filters?.priority) params.priority = filters.priority;
    if (filters?.isRead !== undefined) params.isRead = filters.isRead.toString();
    if (filters?.sourceType) params.sourceType = filters.sourceType;
    if (currentUserId) params.currentUserId = currentUserId;

    const response = await apiRequest<any[]>(
      '/api/notifications',
      {
        method: 'GET',
        params,
        callerName: 'NotificationService.getNotifications'
      }
    );

    if (!response.success || !response.data) {
      return [];
    }

    let notifications = response.data.map(transformNotificationData);
    
    // Apply sourceType filter on client side if needed (for better UX)
    const userId = currentUserId || getCurrentUserId();
    if (filters?.sourceType) {
      notifications = notifications.filter(notification => {
        if (filters.sourceType === 'createdByMe') {
          return notification.createdBy === userId;
        } else if (filters.sourceType === 'assignedToMe') {
          return notification.assignedTo?.some(item => item.userId === userId) || false;
        }
        return true;
      });
    }

    return notifications;
  } catch (error) {
    console.error('Error fetching notifications from API:', error);
    return [];
  }
}

export class NotificationService {
  static async getNotifications(filters: NotificationFilters = {}, currentUserId?: string): Promise<Notification[]> {
    // Fetch from API (handles filtering on server side)
    const notifications = await getNotificationsFromAPI(filters, currentUserId);
    
    // Additional client-side filtering if needed
    let filtered = [...notifications];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        n => n.title.toLowerCase().includes(searchLower) || 
             n.message.toLowerCase().includes(searchLower)
      );
    }

    // Sort: needs acknowledgement first, then by createdAt (newest first)
    return filtered.sort((a, b) => {
      const aNeedsAck = a.interactionType === 'needsAcknowledgement' ? 1 : 0;
      const bNeedsAck = b.interactionType === 'needsAcknowledgement' ? 1 : 0;
      
      // If one needs acknowledgement and the other doesn't, prioritize the one that needs acknowledgement
      if (aNeedsAck !== bNeedsAck) {
        return bNeedsAck - aNeedsAck;
      }
      
      // Otherwise sort by createdAt (newest first)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  static async getGroupedNotifications(filters: NotificationFilters = {}, groupBy: 'category' | 'type' | 'priority' | 'status' = 'category', currentUserId?: string): Promise<NotificationGroup[]> {
    const notifications = await this.getNotifications(filters, currentUserId);
    
    // Separate notifications that need acknowledgment (both read and unread)
    const needsAcknowledgement: Notification[] = [];
    const otherNotifications: Notification[] = [];
    
    notifications.forEach(notification => {
      if (notification.interactionType === 'needsAcknowledgement') {
        needsAcknowledgement.push(notification);
      } else {
        otherNotifications.push(notification);
      }
    });
    
    // Sort needs acknowledgement notifications by createdAt (newest first)
    needsAcknowledgement.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const groups: Record<string, Notification[]> = {};

    // Group other notifications
    otherNotifications.forEach(notification => {
      let groupKey: string;
      
      switch (groupBy) {
        case 'type':
          groupKey = notification.type;
          break;
        case 'priority':
          groupKey = notification.priority;
          break;
        case 'status':
          groupKey = notification.isRead ? 'read' : 'unread';
          break;
        case 'category':
        default:
          groupKey = notification.category;
          break;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });

    const result: NotificationGroup[] = [];

    // Add "Need Acknowledgement" group first if there are any (includes both read and unread)
    if (needsAcknowledgement.length > 0) {
      result.push({
        category: 'needs_acknowledgement',
        notifications: needsAcknowledgement,
        unreadCount: needsAcknowledgement.filter(n => !n.isRead).length,
        totalCount: needsAcknowledgement.length
      });
    }

    // Add other groups
    const otherGroups = Object.entries(groups).map(([category, notifications]) => ({
      category,
      notifications,
      unreadCount: notifications.filter(n => !n.isRead).length,
      totalCount: notifications.length
    }));

    result.push(...otherGroups);

    return result;
  }

  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const response = await apiRequest(
        `/api/notifications/${notificationId}`,
        {
          method: 'PUT',
          body: { isRead: true, readAt: new Date().toISOString() },
          callerName: 'NotificationService.markAsRead'
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to mark notification as read');
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to mark notification as read');
    }
  }

  static async acknowledge(notificationId: string): Promise<void> {
    try {
      const response = await apiRequest(
        `/api/notifications/${notificationId}`,
        {
          method: 'PUT',
          body: { acknowledgedAt: new Date().toISOString() },
          callerName: 'NotificationService.acknowledge'
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to acknowledge notification');
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to acknowledge notification');
    }
  }

  static async markAsUnread(notificationId: string): Promise<void> {
    try {
      // Don't allow unacknowledging - only allow marking as unread for canRead type
      // When marking as unread, only set isRead to false, keep readAt unchanged
      const response = await apiRequest(
        `/api/notifications/${notificationId}`,
        {
          method: 'PUT',
          body: { isRead: false },
          callerName: 'NotificationService.markAsUnread'
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to mark notification as unread');
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to mark notification as unread');
    }
  }

  static async markAllAsRead(): Promise<void> {
    try {
      // Get all unread notifications first
      const notifications = await getNotificationsFromAPI({ isRead: false });
      
      // Filter out notifications that need acknowledgment - those should not be marked as read
      const notificationsToMark = notifications.filter(
        n => n.interactionType !== 'needsAcknowledgement'
      );
      
      // Update each notification that doesn't need acknowledgment
      await Promise.all(
        notificationsToMark.map(n => 
          apiRequest(`/api/notifications/${n.id}`, {
            method: 'PUT',
            body: { isRead: true, readAt: new Date().toISOString() }
          })
        )
      );
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to mark all notifications as read');
    }
  }

  static async getUnreadCount(): Promise<number> {
    const notifications = await getNotificationsFromAPI({ isRead: false });
    return notifications.length;
  }

  static async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification> {
    try {
      const response = await apiRequest<any>(
        '/api/notifications',
        {
          method: 'POST',
          body: notification
        }
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create notification');
      }

      return transformNotificationData(response.data);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to create notification');
    }
  }

  static async updateNotification(id: string, updates: Partial<Notification>): Promise<Notification | null> {
    try {
      const response = await apiRequest<any>(
        `/api/notifications/${id}`,
        {
          method: 'PUT',
          body: updates
        }
      );

      if (!response.success || !response.data) {
        return null;
      }

      return transformNotificationData(response.data);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update notification');
    }
  }

  static async deleteNotification(id: string): Promise<boolean> {
    try {
      const response = await apiRequest(
        `/api/notifications/${id}`,
        {
          method: 'DELETE'
        }
      );

      return response.success;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete notification');
    }
  }

  static getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      quotation: 'Quotations',
      purchase_order: 'Purchase Orders',
      shipment: 'Shipments',
      vendor: 'Vendors',
      tender: 'Tenders',
      system: 'System'
    };
    return labels[category] || category;
  }

  static getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      success: 'Success',
      info: 'Information',
      warning: 'Warning',
      important: 'Important',
      error: 'Important' // Legacy support
    };
    return labels[type] || type;
  }

  static getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent'
    };
    return labels[priority] || priority;
  }
}
