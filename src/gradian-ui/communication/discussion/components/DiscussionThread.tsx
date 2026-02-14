'use client';

import React from 'react';
import { MessageCirclePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/gradian-ui/shared/utils';
import { DiscussionMessage, getDiscussionMessageCreator } from './DiscussionMessage';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import type { DiscussionMessage as DiscussionMessageType } from '../types';

export interface DiscussionThreadProps {
  messages: DiscussionMessageType[];
  userResolver?: (userId: string) => { name?: string; avatarUrl?: string };
  isLoading?: boolean;
  emptyMessage?: string;
  /** Callback when "Start discussion" is clicked in empty state */
  onStartDiscussion?: () => void;
  /** Callback when Reply is clicked on a message */
  onReply?: (message: DiscussionMessageType) => void;
  className?: string;
}

interface ThreadNode {
  message: DiscussionMessageType;
  children: ThreadNode[];
}

/** Build recursive thread tree from flat messages. All data used at runtime from flat list. */
function buildThreadTree(messages: DiscussionMessageType[]): ThreadNode[] {
  const byParent = new Map<string, DiscussionMessageType[]>();
  for (const m of messages) {
    const parentId = m.referenceEngagementId ?? '';
    const list = byParent.get(parentId) ?? [];
    list.push(m);
    byParent.set(parentId, list);
  }
  const sortByCreatedAtAsc = (a: DiscussionMessageType, b: DiscussionMessageType) =>
    new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
  const sortByCreatedAtDesc = (a: DiscussionMessageType, b: DiscussionMessageType) =>
    new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();

  function toNode(msg: DiscussionMessageType): ThreadNode {
    const children = (byParent.get(msg.id) ?? []).sort(sortByCreatedAtAsc).map(toNode);
    return { message: msg, children };
  }

  const roots = (byParent.get('') ?? []).sort(sortByCreatedAtDesc);
  return roots.map(toNode);
}

const REPLY_INDENT_PX = 20;

/** Single message row: avatar + line on left, card on right */
function ThreadMessageRow({
  message,
  userResolver,
  onReply,
  isReply,
  showLine,
  depth,
  language,
  defaultLang,
}: {
  message: DiscussionMessageType;
  userResolver?: (userId: string) => { name?: string; avatarUrl?: string };
  onReply?: (message: DiscussionMessageType) => void;
  isReply: boolean;
  showLine: boolean;
  depth: number;
  language: string;
  defaultLang: string;
}) {
  const { avatarUrl, fallback, displayName } = getDiscussionMessageCreator(
    message,
    userResolver,
    language,
    defaultLang
  );

  return (
    <div
      className="flex gap-2 items-stretch"
      style={depth > 0 ? { marginLeft: depth * REPLY_INDENT_PX } : undefined}
    >
      {/* Avatar column with vertical line */}
      <div className="flex flex-col items-center w-9 shrink-0 pt-0.5">
        <Avatar className="h-7 w-7 shrink-0 border border-gray-200 dark:border-gray-600">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback className="bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-xs">
            {fallback}
          </AvatarFallback>
        </Avatar>
        {showLine && (
          <div
            className="w-px flex-1 min-h-[8px] mt-1.5 bg-gray-200 dark:bg-gray-600"
            aria-hidden
          />
        )}
      </div>
      {/* Card */}
      <div className="flex-1 min-w-0 pb-2">
        <DiscussionMessage
          message={message}
          userResolver={userResolver}
          onReply={onReply}
          isReply={isReply}
          hideAvatar
        />
      </div>
    </div>
  );
}

/** Recursively render a thread node and its children */
function renderThreadNode(
  node: ThreadNode,
  depth: number,
  hasYoungerSibling: boolean,
  props: {
    userResolver?: (userId: string) => { name?: string; avatarUrl?: string };
    onReply?: (message: DiscussionMessageType) => void;
    language: string;
    defaultLang: string;
  }
): React.ReactNode[] {
  const hasChildren = node.children.length > 0;
  const showLine = hasYoungerSibling || hasChildren;
  const rows: React.ReactNode[] = [
    <ThreadMessageRow
      key={node.message.id}
      message={node.message}
      userResolver={props.userResolver}
      onReply={props.onReply}
      isReply={depth > 0}
      showLine={showLine}
      depth={depth}
      language={props.language}
      defaultLang={props.defaultLang}
    />,
  ];
  node.children.forEach((child, idx) => {
    const childHasYoungerSibling = idx < node.children.length - 1;
    rows.push(
      ...renderThreadNode(child, depth + 1, childHasYoungerSibling, props)
    );
  });
  return rows;
}

export const DiscussionThread: React.FC<DiscussionThreadProps> = ({
  messages,
  userResolver,
  isLoading,
  emptyMessage,
  onStartDiscussion,
  onReply,
  className,
}) => {
  const language = useLanguageStore((s) => s.language);
  const defaultLang = getDefaultLanguage();
  const resolvedLang = language || defaultLang;
  const t = (key: string) => getT(key, language, defaultLang);
  const defaultEmpty = t(TRANSLATION_KEYS.DISCUSSION_EMPTY_MESSAGE);

  if (isLoading) {
    const SkeletonRow = ({ nested = false }: { nested?: boolean }) => (
      <div
        className="flex gap-2 items-stretch"
        style={nested ? { marginLeft: REPLY_INDENT_PX } : undefined}
      >
        <div className="flex flex-col items-center w-9 shrink-0 pt-0.5">
          <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="w-px flex-1 min-h-[8px] mt-1.5 bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="flex-1 p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800/50 space-y-1.5">
          <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
    return (
      <div
        className={cn(
          'space-y-2 py-3 animate-pulse',
          className
        )}
      >
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow nested />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12 text-center gap-4',
          'text-gray-500 dark:text-gray-400',
          className
        )}
      >
        <p className="text-sm">{emptyMessage ?? defaultEmpty}</p>
        {onStartDiscussion && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onStartDiscussion();
            }}
            className="gap-2"
          >
            <MessageCirclePlus className="h-4 w-4" />
            {t(TRANSLATION_KEYS.DISCUSSION_START_DISCUSSION)}
          </Button>
        )}
      </div>
    );
  }

  const tree = buildThreadTree(messages);

  return (
    <div className={cn('space-y-6', className)}>
      {tree.map((node, rootIdx) => (
        <div key={node.message.id} className="space-y-0">
          {renderThreadNode(
            node,
            0,
            rootIdx < tree.length - 1, // hasYoungerSibling for root
            { userResolver, onReply, language: resolvedLang, defaultLang }
          )}
        </div>
      ))}
    </div>
  );
};

DiscussionThread.displayName = 'DiscussionThread';
