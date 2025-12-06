'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Notification } from '../types';
import { 
  CheckCircle, 
  Info, 
  AlertTriangle, 
  XCircle, 
  Clock,
  ExternalLink,
  User,
  Calendar,
  Tag,
  AlertCircle,
  X,
  CheckCheck,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { formatRelativeTime, formatFullDate, formatDateTime } from '@/gradian-ui/shared/utils/date-utils';
import { BadgeRenderer } from '@/gradian-ui/form-builder/form-elements/utils/badge-viewer';

interface NotificationDialogProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  onMarkAsUnread?: (id: string) => void;
}

export function NotificationDialog({ notification, isOpen, onClose, onMarkAsRead, onAcknowledge, onMarkAsUnread }: NotificationDialogProps) {
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isMarkingAsUnread, setIsMarkingAsUnread] = useState(false);
  
  // Determine if this notification needs acknowledgment
  const needsAcknowledgement = notification?.interactionType === 'needsAcknowledgement';

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'info':
        return <Info className="h-6 w-6 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-amber-500" />;
      case 'error':
      case 'important':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Info className="h-6 w-6 text-gray-500" />;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'success':
        return 'success';
      case 'info':
        return 'info';
      case 'warning':
        return 'warning';
      case 'error':
      case 'important':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const handleMarkAsRead = async () => {
    if (!notification || notification.isRead) return;
    
    setIsMarkingAsRead(true);
    try {
      await onMarkAsRead(notification.id);
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!notification || notification.isRead || !onAcknowledge) return;
    
    setIsAcknowledging(true);
    try {
      await onAcknowledge(notification.id);
    } finally {
      setIsAcknowledging(false);
    }
  };

  const handleMarkAsUnread = async () => {
    if (!notification || !notification.isRead || !onMarkAsUnread) return;
    
    setIsMarkingAsUnread(true);
    try {
      await onMarkAsUnread(notification.id);
    } finally {
      setIsMarkingAsUnread(false);
    }
  };

  const handleViewAction = () => {
    if (notification?.actionUrl) {
      window.open(notification.actionUrl, '_blank');
    }
  };

  if (!notification) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full rounded-2xl lg:max-w-4xl lg:max-h-[90vh] p-0 flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <DialogHeader className="p-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {getTypeIcon(notification.type)}
              <div className="flex-1">
                <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {notification.title}
                </DialogTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant={getTypeBadgeVariant(notification.type)} className="text-xs">
                    {notification.type}
                  </Badge>
                  <Badge variant={getPriorityBadgeVariant(notification.priority)} className="text-xs">
                    {notification.priority}
                  </Badge>
                  {!notification.isRead && (
                    <Badge variant="default" className="text-xs bg-violet-600">
                      Unread
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Message Content */}
            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2 text-gray-900 dark:text-gray-100">
                  <AlertCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span>Message</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {notification.message}
                </p>
              </CardContent>
            </Card>

            {/* Metadata */}
            {notification.metadata && Object.keys(notification.metadata).length > 0 && (
              <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center space-x-2 text-gray-900 dark:text-gray-100">
                    <Tag className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <span>Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(notification.metadata).map(([key, value]) => {
                      const isArray = Array.isArray(value);
                      const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
                      
                      return (
                        <div key={key} className="space-y-1">
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                            {formattedKey}
                          </label>
                          {isArray ? (
                            <BadgeRenderer
                              items={value as string[]}
                              maxBadges={0}
                              badgeVariant="outline"
                              className="mt-1"
                            />
                          ) : typeof value === 'object' && value !== null ? (
                            <p className="text-sm text-gray-900 dark:text-gray-200">
                              {JSON.stringify(value)}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-900 dark:text-gray-200">
                              {String(value)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timestamps */}
            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2 text-gray-900 dark:text-gray-100">
                  <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span>Timeline</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Created</span>
                    <div className="text-sm text-gray-900 dark:text-gray-200">
                      {formatFullDate(notification.createdAt)}
                      <span className="text-gray-500 dark:text-gray-400 ms-2">
                        ({formatRelativeTime(notification.createdAt)})
                      </span>
                    </div>
                  </div>
                  {notification.readAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Read</span>
                      <div className="text-sm text-gray-900 dark:text-gray-200">
                        {formatFullDate(notification.readAt)}
                        <span className="text-gray-500 dark:text-gray-400 ms-2">
                          ({formatRelativeTime(notification.readAt)})
                        </span>
                      </div>
                    </div>
                  )}
                  {notification.acknowledgedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Acknowledged</span>
                      <div className="text-sm text-gray-900 dark:text-gray-200">
                        {formatFullDate(notification.acknowledgedAt)}
                        <span className="text-gray-500 dark:text-gray-400 ms-2">
                          ({formatRelativeTime(notification.acknowledgedAt)})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Actions Footer - Fixed at bottom */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {!notification.isRead ? (
                needsAcknowledgement ? (
                  onAcknowledge ? (
                    <Button
                      variant="default"
                      onClick={handleAcknowledge}
                      disabled={isAcknowledging}
                      className="text-sm bg-violet-600 hover:bg-violet-700 text-white border-violet-600"
                    >
                      <CheckCheck className="h-4 w-4 me-2" />
                      {isAcknowledging ? 'Acknowledging...' : 'Acknowledge'}
                    </Button>
                  ) : null
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleMarkAsRead}
                    disabled={isMarkingAsRead}
                    className="text-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 me-2" />
                    {isMarkingAsRead ? 'Marking...' : 'Mark as Read'}
                  </Button>
                )
              ) : (
                onMarkAsUnread && !needsAcknowledgement && (
                  <Button
                    variant="outline"
                    onClick={handleMarkAsUnread}
                    disabled={isMarkingAsUnread}
                    className="text-sm"
                  >
                    <Circle className="h-4 w-4 me-2" />
                    {isMarkingAsUnread ? 'Marking...' : 'Mark as Unread'}
                  </Button>
                )
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {notification.actionUrl && (
                <Button
                  variant="default"
                  onClick={handleViewAction}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <ExternalLink className="h-4 w-4 me-2" />
                  View Details
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
