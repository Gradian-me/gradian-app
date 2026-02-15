'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Reply } from 'lucide-react';
import { cn } from '@/gradian-ui/shared/utils';
import { getInitials } from '@/gradian-ui/form-builder/form-elements/utils/avatar-utils';
import { formatDiscussionDate } from '../utils/date-utils';
import { formatReadAt } from '../utils/date-utils';
import { resolveCreatedBy } from '../utils/user-utils';
import { getAvatarUrlFromUsername } from '@/gradian-ui/shared/utils/avatar-url';
import { AvatarGroup } from './AvatarGroup';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import type { DiscussionMessage as DiscussionMessageType } from '../types';
import type { DiscussionParticipant } from '../types';
import type { EngagementPriority } from '../types';

const PRIORITY_KEYS: Record<EngagementPriority, keyof typeof TRANSLATION_KEYS> = {
  low: TRANSLATION_KEYS.DISCUSSION_PRIORITY_LOW,
  medium: TRANSLATION_KEYS.DISCUSSION_PRIORITY_MEDIUM,
  high: TRANSLATION_KEYS.DISCUSSION_PRIORITY_HIGH,
  urgent: TRANSLATION_KEYS.DISCUSSION_PRIORITY_URGENT,
};

export interface DiscussionMessageProps {
  message: DiscussionMessageType;
  userResolver?: (userId: string) => { name?: string; avatarUrl?: string; username?: string };
  onReply?: (message: DiscussionMessageType) => void;
  isReply?: boolean;
  /** When true, avatar is rendered by parent (thread layout with external avatars) */
  hideAvatar?: boolean;
  className?: string;
}

export const DiscussionMessage: React.FC<DiscussionMessageProps> = ({
  message,
  userResolver,
  onReply,
  isReply = false,
  hideAvatar = false,
  className,
}) => {
  const language = useLanguageStore((s) => s.language);
  const defaultLang = getDefaultLanguage();
  const t = (key: string) => getT(key, language, defaultLang);
  const formatDate = (iso: string | undefined) =>
    formatDiscussionDate(iso, (k) => t(k));

  const resolvedCreator = resolveCreatedBy(message.createdBy, language, defaultLang);
  const creatorId = resolvedCreator?.userId ?? message.id;
  const creatorInfo = userResolver?.(creatorId) ?? {};
  const displayName =
    creatorInfo.name ?? resolvedCreator?.displayName ?? creatorId;
  const avatarUrl = creatorInfo.avatarUrl ?? resolvedCreator?.avatarUrl ?? undefined;
  const creatorUsername =
    creatorInfo.username ?? resolvedCreator?.username ?? (creatorId?.includes('@') ? creatorId : undefined);
  const resolvedAvatarUrl =
    avatarUrl ?? (creatorUsername ? getAvatarUrlFromUsername(creatorUsername) : undefined);
  const fallback = getInitials(displayName);

  const allInteractions = message.interactions ?? (message.interaction ? [message.interaction] : []);
  const participants: DiscussionParticipant[] = allInteractions
    .filter((i) => i.userId && i.userId !== creatorId && (i.readAt || (i.isRead && i.interactedAt)))
    .map((i) => {
      const info = userResolver?.(i.userId) ?? {};
      const readAt = i.readAt ?? (i.isRead && i.interactedAt ? i.interactedAt : undefined);
      const avatarUrl = info.avatarUrl ?? undefined;
      const username = info.username ?? (i.userId?.includes('@') ? i.userId : undefined);
      const resolvedAvatarUrl =
        avatarUrl ?? (username ? getAvatarUrlFromUsername(username) : undefined);
      return {
        userId: i.userId,
        name: info.name ?? i.userId,
        avatarUrl: resolvedAvatarUrl,
        fallback: getInitials(info.name ?? i.userId),
        readAt,
      };
    });

  const fullDateTitle = message.createdAt
    ? formatReadAt(message.createdAt) || new Date(message.createdAt).toLocaleString()
    : '';

  const cardContent = (
    <div
      className={cn(
        'flex gap-2 rounded-lg px-3 py-2 transition-colors min-w-0',
        'bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50',
        'hover:bg-gray-50 dark:hover:bg-gray-800/60',
        isReply && 'border-l-4 border-l-violet-300 dark:border-l-violet-600 ml-3',
        'flex',
        className
      )}
    >
      {!hideAvatar && (
        <Avatar className="h-8 w-8 shrink-0 border border-gray-200 dark:border-gray-600">
          {resolvedAvatarUrl && (
            <AvatarImage src={resolvedAvatarUrl} alt={displayName} />
          )}
          <AvatarFallback className="bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300">
            {fallback}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 justify-between">
        {/* Row 1: Message */}
        <p dir="auto" className="text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-snug">
          {message.message || '—'}
        </p>
        {/* Row 2: createdBy • friendly date */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs text-gray-500 dark:text-gray-400">
          <span>{displayName}</span>
          <span aria-hidden>•</span>
          <span
            title={fullDateTitle}
            className="cursor-default"
          >
            {formatDate(message.createdAt)}
          </span>
        </div>
        {participants.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t(TRANSLATION_KEYS.DISCUSSION_SEEN_BY)}
            </span>
            <AvatarGroup participants={participants} size="sm" />
          </div>
        )}
      </div>
      {/* Right side: badges + Reply button */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        {message.priority && (
          <span
            className={cn(
              'text-[11px] font-medium px-1.5 py-0.5 rounded',
              message.priority === 'urgent' &&
                'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
              message.priority === 'high' &&
                'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
              message.priority === 'medium' &&
                'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
              message.priority === 'low' &&
                'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            )}
          >
            {t(TRANSLATION_KEYS[PRIORITY_KEYS[message.priority]])}
          </span>
        )}
        {onReply && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs gap-1.5 text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onReply(message);
            }}
          >
            <Reply className="h-3 w-3" />
            {t(TRANSLATION_KEYS.DISCUSSION_BUTTON_REPLY)}
          </Button>
        )}
      </div>
    </div>
  );

  return cardContent;
};

DiscussionMessage.displayName = 'DiscussionMessage';

/** Helper for thread layout: returns creator info for avatar rendering */
export function getDiscussionMessageCreator(
  message: DiscussionMessageType,
  userResolver?: (userId: string) => { name?: string; avatarUrl?: string; username?: string },
  language = 'en',
  defaultLang = 'en'
) {
  const resolvedCreator = resolveCreatedBy(message.createdBy, language, defaultLang);
  const creatorId = resolvedCreator?.userId ?? message.id;
  const creatorInfo = userResolver?.(creatorId) ?? {};
  const displayName = creatorInfo.name ?? resolvedCreator?.displayName ?? creatorId;
  const avatarUrl = creatorInfo.avatarUrl ?? resolvedCreator?.avatarUrl ?? undefined;
  const username = resolvedCreator?.username ?? undefined;
  const resolvedAvatarUrl =
    avatarUrl ?? (username ? getAvatarUrlFromUsername(username) : undefined);
  const fallback = getInitials(displayName);
  return { displayName, avatarUrl: resolvedAvatarUrl, fallback };
}
