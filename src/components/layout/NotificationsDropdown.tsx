'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Bell, Clock, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';
import { useDialogBackHandler } from '@/gradian-ui/shared/contexts/DialogContext';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { formatRelativeTime, formatFullDate } from '@/gradian-ui/shared/utils/date-utils';
import { NotificationDialog } from '@/domains/notifications/components/NotificationDialog';
import { Notification as NotificationType } from '@/domains/notifications/types';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

interface NotificationsDropdownProps {
  initialCount?: number;
}

export function NotificationsDropdown({ initialCount = 3 }: NotificationsDropdownProps) {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [notificationCount, setNotificationCount] = useState(initialCount);
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<NotificationType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  // Register dropdown for back button handling on mobile
  const handleClose = React.useCallback(() => {
    setIsOpen(false);
  }, []);
  
  useDialogBackHandler(isOpen, handleClose, 'dropdown', 'notifications-dropdown');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch notifications from API
  useEffect(() => {
    if (!isMounted) return;

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const response = await apiRequest<Notification[]>('/api/notifications', {
          method: 'GET',
          callerName: 'NotificationsDropdown.fetchNotifications',
        });

        if (response.success && response.data) {
          // Get all notifications from API
          const allRawNotifications = Array.isArray(response.data)
            ? response.data
            : [];
          
          // Count total unread notifications from all notifications
          const totalUnreadCount = allRawNotifications.filter((n: any) => !n.isRead).length;
          setNotificationCount(totalUnreadCount);
          
          // Get top 10 notifications for display (already sorted by createdAt desc from API)
          const rawNotifications = allRawNotifications.slice(0, 10);
          
          // Transform API data to Notification type
          const transformedNotifications: NotificationType[] = rawNotifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: (n.type === 'error' ? 'important' : n.type) as 'success' | 'info' | 'warning' | 'important',
            category: n.category as 'quotation' | 'purchase_order' | 'shipment' | 'vendor' | 'tender' | 'system',
            priority: n.priority as 'low' | 'medium' | 'high' | 'urgent',
            isRead: n.isRead,
            createdAt: new Date(n.createdAt),
            readAt: n.readAt ? new Date(n.readAt) : undefined,
            acknowledgedAt: n.acknowledgedAt ? new Date(n.acknowledgedAt) : undefined,
            interactionType: (n.interactionType ?? 'canRead') as 'canRead' | 'needsAcknowledgement',
            createdBy: n.createdBy,
            assignedTo: n.assignedTo?.map((item: any) => ({
              userId: item.userId,
              interactedAt: item.interactedAt ? new Date(item.interactedAt) : undefined,
              comment: item.comment
            })),
            actionUrl: n.actionUrl,
            metadata: n.metadata
          }));
          
          setNotifications(transformedNotifications);
        }
      } catch (error) {
        loggingCustom(LogType.CLIENT_LOG, 'error', `Error fetching notifications: ${error instanceof Error ? error.message : String(error)}`);
        setNotifications([]);
        setNotificationCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchNotifications();
  }, [isMounted, isOpen]); // Refetch when dropdown opens

  const handleViewAllClick = () => {
    router.push('/notifications');
  };

  const handleNotificationClick = (notification: NotificationType) => {
    // Open notification dialog
    setSelectedNotification(notification);
    setIsDialogOpen(true);
    setIsOpen(false); // Close dropdown when opening dialog
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await apiRequest(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        body: { isRead: true, readAt: new Date().toISOString() },
        callerName: 'NotificationsDropdown.markAsRead',
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, isRead: true, readAt: new Date() }
            : n
        )
      );
      
      // Update selected notification if it's the one being marked as read
      if (selectedNotification?.id === notificationId) {
        setSelectedNotification(prev => 
          prev ? { ...prev, isRead: true, readAt: new Date() } : null
        );
      }
      
      // Refetch notifications to get updated unread count
      const response = await apiRequest<NotificationType[]>('/api/notifications', {
        method: 'GET',
        callerName: 'NotificationsDropdown.refreshAfterRead',
      });
      
      if (response.success && response.data) {
        const allRawNotifications = Array.isArray(response.data) ? response.data : [];
        const totalUnreadCount = allRawNotifications.filter((n: any) => !n.isRead).length;
        setNotificationCount(totalUnreadCount);
      }
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error marking notification as read: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleAcknowledge = async (notificationId: string) => {
    try {
      await apiRequest(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        body: { acknowledgedAt: new Date().toISOString() },
        callerName: 'NotificationsDropdown.acknowledge',
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, acknowledgedAt: new Date() }
            : n
        )
      );
      
      // Update selected notification if it's the one being acknowledged
      if (selectedNotification?.id === notificationId) {
        setSelectedNotification(prev => 
          prev ? { ...prev, acknowledgedAt: new Date() } : null
        );
      }
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error acknowledging notification: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleMarkAsUnread = async (notificationId: string) => {
    try {
      await apiRequest(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        body: { isRead: false },
        callerName: 'NotificationsDropdown.markAsUnread',
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, isRead: false }
            : n
        )
      );
      
      // Update selected notification if it's the one being marked as unread
      if (selectedNotification?.id === notificationId) {
        setSelectedNotification(prev => 
          prev ? { ...prev, isRead: false } : null
        );
      }
      
      // Refetch notifications to get updated unread count
      const response = await apiRequest<NotificationType[]>('/api/notifications', {
        method: 'GET',
        callerName: 'NotificationsDropdown.refreshAfterUnread',
      });
      
      if (response.success && response.data) {
        const allRawNotifications = Array.isArray(response.data) ? response.data : [];
        const totalUnreadCount = allRawNotifications.filter((n: any) => !n.isRead).length;
        setNotificationCount(totalUnreadCount);
      }
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error marking notification as unread: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Map notification type to icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'important':
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  // Map notification type/priority to badge variant
  const getBadgeVariant = (type: string, priority?: string) => {
    if (priority === 'urgent') return 'warning';
    switch (type) {
      case 'success':
        return 'success';
      case 'info':
        return 'info';
      case 'warning':
        return 'warning';
      case 'important':
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  // Get badge label
  const getBadgeLabel = (type: string, priority?: string) => {
    if (priority === 'urgent') return 'Urgent';
    switch (type) {
      case 'success':
        return 'New';
      case 'info':
        return 'Info';
      case 'warning':
        return 'Warning';
      case 'important':
      case 'error':
        return 'Important';
      default:
        return 'Notification';
    }
  };

  // Always render the same structure to avoid hydration mismatch
  // Use the same DropdownMenuPrimitive structure for both placeholder and actual
  return (
    <>
      <DropdownMenuPrimitive.Root open={isMounted ? isOpen : false} onOpenChange={isMounted ? setIsOpen : undefined}>
      <DropdownMenuPrimitive.Trigger asChild disabled={!isMounted}>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative h-11 w-11 p-0 rounded-xl"
          aria-label="Notifications"
          disabled={!isMounted}
          type="button"
          suppressHydrationWarning
        >
            <Bell className="h-4 w-4" />
            {isMounted && notificationCount > 0 && (
              <Badge 
                variant="default" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
              >
                {notificationCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuPrimitive.Trigger>
      
      {isMounted && (
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
          className={cn(
            "z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0 text-gray-900 dark:text-gray-200 shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          )}
          align="end"
          sideOffset={4}
          style={{
            maxHeight: 'calc(100vh - 8rem)',
          }}
        >
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <DropdownMenuPrimitive.Label className="text-sm font-semibold text-gray-900 dark:text-gray-200 flex items-center justify-between">
              Notifications
              <Badge variant="default" className="text-xs">{notificationCount}</Badge>
            </DropdownMenuPrimitive.Label>
          </div>
          
          <div className="relative">
            <ScrollArea 
              className="h-80 [&_[data-radix-scroll-area-scrollbar]]:opacity-100 [&_[data-radix-scroll-area-scrollbar]]:z-10 [&_[data-radix-scroll-area-scrollbar]]:right-0 [&_[data-radix-scroll-area-thumb]]:!bg-gray-400 [&_[data-radix-scroll-area-thumb]]:hover:!bg-gray-500 dark:[&_[data-radix-scroll-area-thumb]]:!bg-gray-500 dark:[&_[data-radix-scroll-area-thumb]]:hover:!bg-gray-400" 
              scrollbarVariant="default"
            >
              <div className="p-2 pr-4 space-y-2">
              {isLoading ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2"
                    >
                      <div className="flex items-start space-x-3">
                        <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2 min-w-0">
                          <Skeleton className="h-4 w-3/4 rounded" />
                          <Skeleton className="h-3 w-full rounded" />
                          <Skeleton className="h-3 w-2/3 rounded" />
                          <div className="flex items-center justify-between mt-2">
                            <Skeleton className="h-5 w-16 rounded-full" />
                            <Skeleton className="h-3 w-20 rounded" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuPrimitive.Item
                    key={notification.id}
                    className={cn(
                      "relative flex cursor-pointer select-none items-start rounded-xl p-3 text-sm outline-none",
                      "bg-gray-100 dark:bg-gray-600/50 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700",
                      !notification.isRead && "bg-violet-50/50 dark:bg-violet-900/20 hover:bg-violet-100/50 dark:hover:bg-violet-950/30"
                    )}
                    onSelect={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3 w-full min-w-0">
                      <div className="shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="mb-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">
                            {notification.title}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-1 gap-2">
                          <Badge 
                            variant={getBadgeVariant(notification.type, notification.priority) as any} 
                            className="text-xs shrink-0"
                          >
                            {getBadgeLabel(notification.type, notification.priority)}
                          </Badge>
                          <div className="flex items-center space-x-1 shrink-0">
                            <Clock className="h-3 w-3 text-gray-400 dark:text-gray-400 shrink-0" />
                            <span 
                              className="text-xs text-gray-400 dark:text-gray-400 whitespace-nowrap"
                              title={formatFullDate(notification.createdAt)}
                            >
                              {formatRelativeTime(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuPrimitive.Item>
                ))
              )}
              </div>
            </ScrollArea>
          </div>
          
          <div className="p-3 border-t border-gray-100 dark:border-gray-700">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs text-gray-900 dark:text-gray-200"
              onClick={handleViewAllClick}
              aria-label="View all notifications"
            >
              View All Notifications
            </Button>
          </div>
        </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      )}
    </DropdownMenuPrimitive.Root>
    
    {/* Notification Dialog */}
    {isMounted && selectedNotification && (
      <NotificationDialog
        notification={selectedNotification}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedNotification(null);
        }}
        onMarkAsRead={handleMarkAsRead}
        onAcknowledge={handleAcknowledge}
        onMarkAsUnread={handleMarkAsUnread}
      />
    )}
    </>
  );
}
