// Chat Interface Component
// Main chat component with message list and input area

'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar as SidebarIcon, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatList } from './ChatList';
import { TodoList } from './TodoList';
import { useChat } from '../hooks/useChat';
import { executeApprovedTodos } from '@/domains/ai-builder/utils/ai-orchestrator-utils';
import { EmptyState } from '@/gradian-ui/data-display/components/EmptyState';
import { extractHashtags, extractMentions } from '../utils/text-utils';
import { BotMessageSquare, Plus } from 'lucide-react';
import type { Chat, Todo } from '../types';

export interface ChatInterfaceProps {
  className?: string;
  showChatList?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  className,
  showChatList = true,
}) => {
  const params = useParams();
  const router = useRouter();
  const chatIdFromUrl = params['chat-id'] as string | undefined;
  const [chatListVisible, setChatListVisible] = useState(showChatList);

  const {
    chats,
    currentChat,
    messages,
    messagesPagination,
    loadMoreMessages,
    todos,
    isLoading,
    isRefreshingChats,
    isLoadingChat,
    isActive,
    error,
    selectChat,
    createNewChat,
    sendMessage,
    stop,
    updateTodos,
    refreshChats,
    addMessage,
    updateMessageTodos,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isExecutingTodos, setIsExecutingTodos] = useState(false);
  const executeAbortControllerRef = useRef<AbortController | null>(null);
  const [expandedExecutionPlans, setExpandedExecutionPlans] = useState<Set<string>>(new Set());
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevChatIdRef = useRef<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Select chat from URL on mount or when URL changes
  // Only update if URL chat ID is different from current chat
  // Use a ref to track the last processed chat-id to avoid unnecessary reloads
  const lastProcessedChatIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (chatIdFromUrl && chatIdFromUrl !== currentChat?.id && chatIdFromUrl !== lastProcessedChatIdRef.current) {
      lastProcessedChatIdRef.current = chatIdFromUrl;
      // Clear expanded execution plans when switching chats
      setExpandedExecutionPlans(new Set());
      // Only load messages for the new chat, don't refresh the entire chat list
      selectChat(chatIdFromUrl);
    }
    // Reset ref when chat is successfully loaded
    if (currentChat?.id === chatIdFromUrl) {
      lastProcessedChatIdRef.current = chatIdFromUrl ?? null;
    }
  }, [chatIdFromUrl, currentChat?.id, selectChat]);

  // Auto-scroll to bottom when switching chats or loading new messages for current chat
  useEffect(() => {
    const isChatChanged = currentChat?.id && currentChat.id !== prevChatIdRef.current;
    if (isChatChanged) {
      prevChatIdRef.current = currentChat?.id ?? null;
      requestAnimationFrame(() => {
        messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' });
      });
      return;
    }
    // If new messages arrive and the user is near the bottom, keep at bottom
    const container = messagesContainerRef.current;
    if (container) {
      const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
      if (nearBottom) {
        requestAnimationFrame(() => {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        });
      }
    }
  }, [messages, currentChat]);

  // Load more messages when scrolling near the top (infinite scroll)
  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || !messages || messages.length === 0) return;
    if (container.scrollTop < 80) {
      void loadMoreMessages();
    }

    // Show scroll-to-bottom button when not near bottom
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    setShowScrollToBottom(!nearBottom);
  }, [messages, loadMoreMessages]);

  const smoothScrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Cancel any pending animation by using a flag on the element
    const start = container.scrollTop;
    const end = container.scrollHeight - container.clientHeight;
    const distance = end - start;
    if (distance <= 0) return;

    const duration = 600;
    const startTime = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      container.scrollTop = start + distance * eased;
      if (t < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, []);

  const handleScrollToBottom = useCallback(() => {
    smoothScrollToBottom();
  }, [smoothScrollToBottom]);

  // Auto-expand the latest execution plan when messages change
  // New execution plans are expanded by default, previous ones are collapsed
  useEffect(() => {
    // Find all messages with todos
    const messagesWithTodos = messages.filter(msg => msg.metadata?.todos && msg.metadata.todos.length > 0);
    
    if (messagesWithTodos.length > 0) {
      // Get the latest message with todos (most recent execution plan)
      const latestMessageWithTodos = messagesWithTodos[messagesWithTodos.length - 1];
      
      // Always expand the latest execution plan by default
      // This ensures new execution plans are automatically expanded
      setExpandedExecutionPlans(prev => {
        // If the latest plan is already expanded, keep it
        if (prev.has(latestMessageWithTodos.id)) {
          return prev;
        }
        // Otherwise, create a new set with only the latest plan expanded
        return new Set([latestMessageWithTodos.id]);
      });
    }
  }, [messages]); // Trigger when messages change (including new messages with todos)

  const handleSendMessage = async (content: string, agentId?: string) => {
    if (!currentChat) {
      console.error('ChatInterface: No current chat selected');
      return;
    }
    await sendMessage(content, agentId);
  };

  const handleStop = () => {
    // Stop message sending/thinking
    stop();
    
    // Stop todo execution if active
    if (isExecutingTodos && executeAbortControllerRef.current) {
      executeAbortControllerRef.current.abort();
      setIsExecutingTodos(false);
      executeAbortControllerRef.current = null;
    }

  };

  const handleCreateNewChat = async () => {
    try {
      const newChat = await createNewChat();
      if (newChat && newChat.id) {
        router.push(`/chat/${newChat.id}`);
      } else {
        console.error('Failed to create chat: No chat returned or missing ID', newChat);
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleTodoExecuted = async (todo: Todo, result: any) => {
    if (!currentChat) return;

    try {
      // Prepare content based on output format
      const output = todo.output || result.output;
      const responseFormat = todo.responseFormat || result.responseFormat || 'string';
      const requiredOutputFormat = result.requiredOutputFormat || responseFormat;
      const agentId = todo.agentId || result.agentId;
      const agentType = todo.agentType || result.agentType;

      // Format content for message
      let content: string;
      if (typeof output === 'string') {
        content = output;
      } else if (output && typeof output === 'object') {
        // For JSON/table/image/video formats, store as JSON string
        content = JSON.stringify(output, null, 2);
      } else {
        content = String(output || '');
      }

      // Extract hashtags and mentions from content if it's a string
      const hashtags = typeof output === 'string' 
        ? extractHashtags(content) 
        : [];
      const mentions = typeof output === 'string' 
        ? extractMentions(content) 
        : [];

      // Add message to chat
      const messageResponse = await fetch(`/api/chat/${currentChat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'assistant',
          content,
          agentId,
          agentType,
          hashtags: hashtags.length > 0 ? hashtags : undefined,
          mentions: mentions.length > 0 ? mentions : undefined,
          metadata: {
            responseFormat: requiredOutputFormat,
            tokenUsage: todo.tokenUsage || result.tokenUsage,
            duration: todo.duration || result.duration,
            cost: todo.cost || result.cost,
            todoId: todo.id,
            todoTitle: todo.title,
          },
        }),
      });

      const messageResult = await messageResponse.json();

      if (messageResult.success && messageResult.data) {
        // Add message directly to state without reloading
        // This prevents showing skeleton loader
        const newMessage = messageResult.data;
        addMessage(newMessage);
        
        // Scroll to end after a short delay to ensure message is rendered
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      console.error('Error adding todo execution message:', error);
    }
  };

  const handleExecuteTodos = async (approvedTodos: Todo[]) => {
    if (!currentChat) return;

    // Stop any ongoing execution
    if (executeAbortControllerRef.current) {
      executeAbortControllerRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    executeAbortControllerRef.current = abortController;

    setIsExecutingTodos(true);
    try {
      // Get the last user message as initial input
      const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
      const initialInput = lastUserMessage?.content || '';

      // Call the API to execute the approved todos
      const response = await fetch(`/api/chat/${currentChat.id}/execute-todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          todos: approvedTodos,
          initialInput,
        }),
        signal: abortController.signal,
      });

      // Check if aborted
      if (abortController.signal.aborted) {
        return;
      }

      const result = await response.json();

      if (result.success && result.data) {
        const responseData = result.data;

        // Update todos with execution results (includes chainMetadata)
        if (responseData.todos && Array.isArray(responseData.todos)) {
          updateTodos(responseData.todos);
        }

        // Note: Message creation for chain_executed is handled in useChat.ts
        // We only update todos here to avoid duplicate messages
        // The final output message is already created by the orchestrator response handler
      } else {
        console.error('Failed to execute todos:', result.error);
      }
    } catch (error) {
      // Check if error is due to abort
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted - just reset state
        return;
      }
      console.error('Error executing todos:', error);
    } finally {
      setIsExecutingTodos(false);
      executeAbortControllerRef.current = null;
    }
  };

  return (
    <div className={cn('flex h-full bg-white dark:bg-gray-900', className)}>
      {/* Chat List Sidebar with Animation */}
      <AnimatePresence initial={false}>
        {chatListVisible && (
          <motion.div
            key="chat-list-sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden shrink-0"
          >
            <div className="w-80 h-full">
              <ChatList
                chats={chats}
                selectedChatId={currentChat?.id}
                onSelectChat={selectChat}
                onCreateNewChat={handleCreateNewChat}
                onRefresh={refreshChats}
                isLoading={isRefreshingChats}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header with Toggle Button */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 px-3 py-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setChatListVisible((prev) => !prev)}
            title={chatListVisible ? 'Hide chat list' : 'Show chat list'}
            className="h-8 w-8"
          >
            <SidebarIcon
              className={cn(
                'h-4 w-4 transition-transform',
                chatListVisible ? '' : '-scale-x-100'
              )}
            />
          </Button>
          {currentChat && (
            <>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {currentChat.title}
                </h2>
              </div>
            </>
          )}
        </div>

        {/* Messages Area */}
        {/* Key prop ensures React updates this container when chat changes */}
        <div
          key={currentChat?.id || 'no-chat'}
          className="flex-1 overflow-y-auto p-4 relative"
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
        >
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Show skeleton when loading/switching chats */}
          {isLoadingChat && currentChat ? (
            <div className="max-w-4xl mx-auto space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={cn('flex gap-3 mb-4', i % 2 === 0 && 'flex-row-reverse')}>
                  {/* Avatar skeleton */}
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  {/* Message bubble skeleton */}
                  <div className="flex-1 max-w-[80%]">
                    <Skeleton className={cn(
                      'h-20 rounded-2xl',
                      i % 2 === 0 ? 'rounded-tr-none' : 'rounded-tl-none'
                    )} />
                    {/* Metadata skeleton */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !currentChat ? (
            <div className="flex items-center justify-center h-full">
              <EmptyState
                icon={<BotMessageSquare className="h-12 w-12 text-gray-400" />}
                title="Start a conversation"
                description="Select a chat from the sidebar or create a new one to begin."
                action={
                  <Button onClick={handleCreateNewChat} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    New Chat
                  </Button>
                }
              />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div className="max-w-md">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {currentChat.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Start the conversation by sending a message.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((message, index) => {
                const messageTodos = message.metadata?.todos;
                const hasTodos = messageTodos && messageTodos.length > 0;
                const lastMessageWithTodosIndex = messages.findLastIndex(m => m.metadata?.todos && m.metadata.todos.length > 0);
                const isLatestExecutionPlan = hasTodos && index === lastMessageWithTodosIndex;
                const isExpanded = hasTodos && expandedExecutionPlans.has(message.id);
                
                return (
                  <React.Fragment key={message.id}>
                    <ChatMessage
                      message={message}
                      index={index}
                    />
                    {/* Show execution plan inline after its related message */}
                    {hasTodos && currentChat && (
                      <TodoList
                        todos={messageTodos}
                        chatId={currentChat.id}
                        initialInput={messages.slice(0, index + 1).reverse().find(m => m.role === 'user')?.content || ''}
                        onExecute={handleExecuteTodos}
                        onTodosUpdate={async (updatedTodos) => {
                          // Update todos in the specific message
                          updateMessageTodos(message.id, updatedTodos);
                          
                          // Persist to backend
                          if (currentChat) {
                            try {
                              const response = await fetch(`/api/chat/${currentChat.id}/todos`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ todos: updatedTodos }),
                              });
                              
                              if (!response.ok) {
                                console.error('Failed to save todos:', await response.text());
                              }
                            } catch (error) {
                              console.error('Error saving todos:', error);
                            }
                          }
                        }}
                        onTodoExecuted={handleTodoExecuted}
                        isExecuting={isExecutingTodos && isLatestExecutionPlan}
                        isExpanded={isExpanded}
                        showExecuteButton={isLatestExecutionPlan}
                        onExpandedChange={(expanded) => {
                          // Update expanded state when user manually toggles
                          if (expanded) {
                            setExpandedExecutionPlans(prev => new Set([...prev, message.id]));
                          } else {
                            setExpandedExecutionPlans(prev => {
                              const next = new Set(prev);
                              next.delete(message.id);
                              return next;
                            });
                          }
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
              
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Scroll to Bottom floating control (relative to messages area) */}
          <AnimatePresence>
            {showScrollToBottom && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="pointer-events-none sticky bottom-1 inset-x-0 z-40 flex justify-center"
              >
                <button
                  type="button"
                  onClick={handleScrollToBottom}
                  className={cn(
                    'pointer-events-auto flex items-center gap-2 rounded-full px-3 py-2',
                    'bg-white/95 dark:bg-gray-800/95 border border-violet-200 dark:border-violet-800',
                    'shadow-2xl hover:shadow-xl transition-all duration-200',
                    'text-sm font-medium text-gray-800 dark:text-gray-100'
                  )}
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-50 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-700 text-violet-600 dark:text-violet-200">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                  Go to bottom
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        {currentChat && (
          <div className="border-t border-gray-200 dark:border-gray-800 p-4">
            <ChatInput
              onSend={handleSendMessage}
              onStop={handleStop}
              selectedAgentId={currentChat.selectedAgentId}
              isLoading={isLoading}
              isActive={isActive || isExecutingTodos}
            />
          </div>
        )}
      </div>
    </div>
  );
};

ChatInterface.displayName = 'ChatInterface';

