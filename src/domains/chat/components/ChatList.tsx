// Chat List Component
// Displays list of chats filtered by userId with selection functionality

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/user.store';
import { cn } from '@/lib/utils';
import { Plus, BotMessageSquare, Clock, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/gradian-ui/shared/utils/date-utils';
import type { Chat } from '../types';
import { CardWrapper, CardContent } from '@/gradian-ui/data-display/card/components/CardWrapper';
import { Button } from '@/gradian-ui/form-builder/form-elements';

export interface ChatListProps {
  chats: Chat[];
  selectedChatId?: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateNewChat: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
  onCreateNewChat,
  onRefresh,
  isLoading = false,
  className,
}) => {
  const router = useRouter();

  const handleSelectChat = (chatId: string) => {
    onSelectChat(chatId);
    router.push(`/chat/${chatId}`);
  };

  return (
    <div className={cn('flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Button
            onClick={onCreateNewChat}
            variant="outline"
            className="flex-1 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
          {onRefresh && (
            <Button
              onClick={onRefresh}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="w-10 h-10 p-0 flex items-center justify-center"
            >
              <RefreshCw 
                className={cn(
                  'w-4 h-4 transition-transform',
                  isLoading && 'animate-spin'
                )} 
              />
            </Button>
          )}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-2 space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="p-3 rounded-lg border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar skeleton */}
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  {/* Content skeleton */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <BotMessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No chats yet</p>
            <p className="text-xs mt-1">Start a new conversation</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            <AnimatePresence>
              {chats.map((chat) => {
                const isSelected = chat.id === selectedChatId;
                return (
                  <motion.button
                    key={chat.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    onClick={() => handleSelectChat(chat.id)}
                    className={cn(
                      'w-full text-start p-1 my-1 bg-gray-50 dark:bg-gray-800 rounded-lg transition-all',
                      'hover:bg-gray-100 dark:hover:bg-gray-800',
                      isSelected 
                        ? 'bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50' 
                        : 'border border-transparent'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                        isSelected
                          ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      )}>
                        <BotMessageSquare className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={cn(
                            'text-sm font-medium truncate',
                            isSelected
                              ? 'text-violet-900 dark:text-violet-100'
                              : 'text-gray-900 dark:text-gray-100'
                          )}>
                            {chat.title}
                          </h3>
                        </div>
                        {chat.lastMessage && (
                          <p className={cn(
                            'text-xs truncate mb-1',
                            isSelected
                              ? 'text-violet-700 dark:text-violet-300'
                              : 'text-gray-600 dark:text-gray-400'
                          )}>
                            {chat.lastMessage}
                          </p>
                        )}
                        {chat.lastMessageAt && (
                          <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-xs flex items-center gap-1 text-gray-500 dark:text-gray-400">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(chat.lastMessageAt)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

ChatList.displayName = 'ChatList';

