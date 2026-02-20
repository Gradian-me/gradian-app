// Chat List Component
// Displays list of chats filtered by userId with selection functionality

'use client';

import React, { useEffect, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/user.store';
import { cn } from '@/lib/utils';
import { Plus, BotMessageSquare, Clock, RefreshCw, Trash2 } from 'lucide-react';
import { IconBox } from '@/gradian-ui/form-builder/form-elements';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/gradian-ui/shared/utils/date-utils';
import { useLanguageStore } from '@/stores/language.store';
import type { Chat } from '../types';
import { CardWrapper, CardContent } from '@/gradian-ui/data-display/card/components/CardWrapper';
import { Button } from '@/components/ui/button';
import { ConfirmationMessage } from '@/gradian-ui/form-builder/form-elements/components/ConfirmationMessage';

export interface ChatListProps {
  chats: Chat[];
  selectedChatId?: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateNewChat: () => void;
  onRefresh?: () => void;
  onDeleteChat?: (chatId: string) => Promise<boolean>;
  isLoading?: boolean;
  className?: string;
}

const ChatListComponent: React.FC<ChatListProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
  onCreateNewChat,
  onRefresh,
  onDeleteChat,
  isLoading = false,
  className,
}) => {
  const router = useRouter();
  const language = useLanguageStore((s) => s.language);
  const localeCode = language || undefined;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSelectChat = (chatId: string) => {
    // Use replace to avoid building up history when switching chats
    // This prevents back button from going through all chat switches
    // Next.js App Router handles client-side navigation automatically
    router.replace(`/chat/${chatId}`);
    // Call onSelectChat after navigation to ensure state is in sync
    onSelectChat(chatId);
  };

  const handleDeleteClick = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation(); // Prevent chat selection when clicking delete
    setChatToDelete(chat);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!chatToDelete || !onDeleteChat) {
      setDeleteConfirmOpen(false);
      setChatToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      const success = await onDeleteChat(chatToDelete.id);
      if (success) {
        setDeleteConfirmOpen(false);
        setChatToDelete(null);
        // If deleted chat was selected, navigate to chat list
        if (chatToDelete.id === selectedChatId) {
          router.replace('/chat');
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    } finally {
      setIsDeleting(false);
    }
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
              variant="square"
              size="sm"
              className="w-10 h-10 p-0"
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
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={cn(
                      'group relative w-full my-1 rounded-lg transition-all',
                      isSelected 
                        ? 'bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50' 
                        : 'bg-gray-50 dark:bg-gray-800 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <button
                      onClick={() => handleSelectChat(chat.id)}
                      className={cn(
                        'w-full text-start p-1 rounded-lg transition-all'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <IconBox
                          name="BotMessageSquare"
                          color={isSelected ? 'violet' : 'gray'}
                          variant="flat"
                          size="md"
                          iconClassName="w-5 h-5"
                        />
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
                                {formatRelativeTime(chat.lastMessageAt, { addSuffix: true, localeCode })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                    {/* Delete button - visible on hover, slightly visible by default */}
                    {onDeleteChat && (
                      <button
                        onClick={(e) => handleDeleteClick(e, chat)}
                        className={cn(
                          'absolute top-2 right-2 p-1.5 rounded-md transition-all',
                          'opacity-40 group-hover:opacity-100',
                          'hover:bg-red-100 dark:hover:bg-red-900/30',
                          'text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400',
                          'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
                          'z-10'
                        )}
                        title="Delete chat"
                        aria-label="Delete chat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationMessage
        isOpen={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={[{ en: 'Delete Chat' }, { fa: 'حذف چت' }, { ar: 'حذف المحادثة' }, { es: 'Eliminar chat' }, { fr: 'Supprimer la conversation' }, { de: 'Chat löschen' }, { it: 'Elimina chat' }, { ru: 'Удалить чат' }]}
        message={
          chatToDelete
            ? `Are you sure you want to delete "${chatToDelete.title}"? This action cannot be undone and will delete all messages in this chat.`
            : 'Are you sure you want to delete this chat?'
        }
        variant="destructive"
        size="md"
        buttons={[
          {
            label: 'Cancel',
            variant: 'outline',
            action: () => {
              setDeleteConfirmOpen(false);
              setChatToDelete(null);
            },
          },
          {
            label: 'Delete',
            variant: 'destructive',
            icon: 'Trash2',
            action: handleConfirmDelete,
            disabled: isDeleting,
          },
        ]}
      />
    </div>
  );
};

ChatListComponent.displayName = 'ChatList';
export const ChatList = memo(ChatListComponent);

