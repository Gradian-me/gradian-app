'use client';

import React, { useState, useEffect } from 'react';
import { NotificationGroup as NotificationGroupType, GroupByOption } from '../types';
import { NotificationItem } from './NotificationItem';
import { Badge } from '@/components/ui/badge';
import { CardTitle } from '@/components/ui/card';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { NotificationService } from '../services/notification.service';
import { CTAButton } from '@/gradian-ui/form-builder/form-elements/components/CTAButton';
import { cn } from '@/gradian-ui/shared/utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { getDefaultLanguage, getT } from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';

interface NotificationGroupProps {
  group: NotificationGroupType;
  groupBy?: GroupByOption;
  onMarkAsRead: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  onMarkAsUnread?: (id: string) => void;
  value?: string;
  defaultOpen?: boolean;
}

export function NotificationGroup({ group, groupBy = 'category', onMarkAsRead, onAcknowledge, onMarkAsUnread, value, defaultOpen = true }: NotificationGroupProps) {
  const [displayCount, setDisplayCount] = useState(10); // Start with 10 items
  const INITIAL_COUNT = 10;
  const LOAD_MORE_COUNT = 20;
  const language = useLanguageStore((s) => s.language) || getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const t = (key: string) => getT(key, language, defaultLang);

  // Reset display count when group changes
  useEffect(() => {
    setDisplayCount(INITIAL_COUNT);
  }, [group.category, group.notifications.length]);

  const totalNotifications = group.totalCount || group.notifications.length;
  const displayedNotifications = group.notifications.slice(0, displayCount);
  const hasMore = displayCount < totalNotifications;

  const handleShowMore = () => {
    setDisplayCount(prev => prev + LOAD_MORE_COUNT);
  };
  const getGroupLabel = (category: string, groupByOpt: GroupByOption): string => {
    // Special case for "Need Acknowledgement" group
    if (category === 'needs_acknowledgement') {
      return t(TRANSLATION_KEYS.LABEL_NEED_ACKNOWLEDGEMENT);
    }

    switch (groupByOpt) {
      case 'type':
        return NotificationService.getTypeLabel(category);
      case 'priority':
        return NotificationService.getPriorityLabel(category);
      case 'status':
        return category === 'read' ? t(TRANSLATION_KEYS.LABEL_READ) : t(TRANSLATION_KEYS.LABEL_UNREAD);
      case 'category':
      default:
        return NotificationService.getCategoryLabel(category);
    }
  };

  const groupValue = value || `group-${group.category}`;

  return (
    <AccordionItem 
      value={groupValue} 
      className={cn(
        "mb-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-sm overflow-hidden",
        "data-[state=open]:border-gray-300 dark:data-[state=open]:border-gray-700/60"
      )}
    >
      <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]]:border-b bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between w-full pr-4">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {getGroupLabel(group.category, groupBy)}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {group.totalCount || group.notifications.length} {t(TRANSLATION_KEYS.LABEL_TOTAL)}
            </Badge>
            {group.unreadCount > 0 && (
              <Badge variant="default" className="text-xs">
                {group.unreadCount} {t(TRANSLATION_KEYS.LABEL_UNREAD)}
              </Badge>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-3 pt-4">
          {displayedNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              onAcknowledge={onAcknowledge}
              onMarkAsUnread={onMarkAsUnread}
            />
          ))}
        </div>
        {hasMore && (
          <div className="mt-4">
            <CTAButton
              label={`Show More (${totalNotifications - displayCount} remaining)`}
              onClick={handleShowMore}
              color="#7c3aed"
              showArrow={false}
            />
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
