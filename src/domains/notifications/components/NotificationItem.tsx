'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Notification } from '../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NotificationDialog } from './NotificationDialog';
import { 
  CheckCircle, 
  Info, 
  AlertTriangle, 
  XCircle, 
  Clock,
  User,
  Users,
  CheckCheck,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { formatRelativeTime, formatFullDate, formatDateTime } from '@/gradian-ui/shared/utils/date-utils';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  onMarkAsUnread?: (id: string) => void;
}

export function NotificationItem({ notification, onMarkAsRead, onAcknowledge, onMarkAsUnread }: NotificationItemProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Determine if this notification needs acknowledgment
  const needsAcknowledgement = notification.interactionType === 'needsAcknowledgement';
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error':
      case 'important':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
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

  return (
    <>
      <Card
        className={`hover:shadow-md transition-all duration-200 cursor-pointer border ${
          !notification.isRead
            ? 'bg-violet-50/30 dark:bg-violet-500/10 border-violet-200 dark:border-violet-400/40'
            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
        }`}
        onClick={() => {
          setIsDialogOpen(true);
          if (!notification.isRead) {
            onMarkAsRead(notification.id);
          }
        }}
      >
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:space-x-3">
            <div className="hidden shrink-0 mt-1 sm:block">
              {getTypeIcon(notification.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                <div className="flex-1 gap-2 flex flex-col md:flex-row flex-wrap">
                  <div className="flex flex-wrap items-center gap-2 sm:hidden">
                    <span className="inline-flex items-center justify-center">
                      {getTypeIcon(notification.type)}
                    </span>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Badge variant={getTypeBadgeVariant(notification.type)} className="text-xs">
                        {notification.type}
                      </Badge>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Badge variant={getPriorityBadgeVariant(notification.priority)} className="text-xs">
                        {notification.priority}
                      </Badge>
                    </motion.div>
                  </div>
                  <h3
                    className={`text-md font-medium ${
                      !notification.isRead ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'
                    } sm:hidden`}
                  >
                    {notification.title}
                  </h3>
                  <div className="hidden sm:flex items-center gap-2 mb-1">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Badge variant={getTypeBadgeVariant(notification.type)} className="text-xs">
                        {notification.type}
                      </Badge>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Badge variant={getPriorityBadgeVariant(notification.priority)} className="text-xs">
                        {notification.priority}
                      </Badge>
                    </motion.div>
                    <h3 className={`text-sm font-medium ${
                      !notification.isRead ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {notification.title}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                </div>
              </div>
              
              {/* Creator, Assigned To, and Date Info */}
              <div className="mt-2 space-y-1">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
                  {notification.createdBy && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3" />
                      <span>Created by: <span className="text-gray-700 dark:text-gray-200 font-medium">{notification.createdBy}</span></span>
                    </div>
                  )}
                  {notification.assignedTo && notification.assignedTo.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      <span>Assigned to: <span className="text-gray-700 dark:text-gray-200 font-medium">{notification.assignedTo.length} user{notification.assignedTo.length > 1 ? 's' : ''}</span></span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>Created <span className="text-gray-700 dark:text-gray-200 font-medium" title={formatFullDate(notification.createdAt)}>• {formatRelativeTime(notification.createdAt)}</span></span>
                  </div>
                  {notification.readAt && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span>Read: <span className="text-gray-700 dark:text-gray-200 font-medium">{formatDateTime(notification.readAt)}</span></span>
                    </div>
                  )}
                  {notification.acknowledgedAt && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span>Acknowledged: <span className="text-gray-700 dark:text-gray-200 font-medium">{formatDateTime(notification.acknowledgedAt)}</span></span>
                    </div>
                  )}
                </div>
              </div>
              
            </div>
            
            {/* Buttons on the right side */}
            <div className="flex flex-col items-stretch gap-2 shrink-0 sm:items-end sm:ms-4">
              <div className="flex items-center justify-end gap-2 sm:justify-center">
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                )}
                {needsAcknowledgement && onAcknowledge ? (
                  !notification.acknowledgedAt ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-6 px-2 text-xs bg-violet-600 hover:bg-violet-700 text-white border-violet-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAcknowledge(notification.id);
                      }}
                    >
                      <CheckCheck className="h-3 w-3 me-1" />
                      Acknowledge
                    </Button>
                  ) : onMarkAsUnread ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsUnread(notification.id);
                      }}
                    >
                      <Circle className="h-3 w-3 me-1" />
                      Mark Unread
                    </Button>
                  ) : null
                ) : !notification.isRead ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead(notification.id);
                    }}
                  >
                    <CheckCircle2 className="h-3 w-3 me-1" />
                    Mark Read
                  </Button>
                ) : (
                  onMarkAsUnread && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsUnread(notification.id);
                      }}
                    >
                      <Circle className="h-3 w-3 me-1" />
                      Mark Unread
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Dialog */}
      <NotificationDialog
        notification={notification}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onMarkAsRead={onMarkAsRead}
        onAcknowledge={onAcknowledge}
        onMarkAsUnread={onMarkAsUnread}
      />
    </>
  );
}
