// Chat Hook
// Manages chat state, messages, and chat selection

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUserStore } from '@/stores/user.store';
import { extractHashtags, extractMentions } from '../utils/text-utils';
import type { Chat, ChatMessage, AddMessageRequest, Todo } from '../types';

// Ensure unique messages by id while preserving order (earlier entries first)
const dedupeMessagesById = (items: ChatMessage[]): ChatMessage[] => {
  const seen = new Set<string>();
  const result: ChatMessage[] = [];
  for (const msg of items) {
    if (!msg?.id) continue;
    if (seen.has(msg.id)) continue;
    seen.add(msg.id);
    result.push(msg);
  }
  return result;
};

export interface UseChatResult {
  chats: Chat[];
  currentChat: Chat | null;
  messages: ChatMessage[];
  todos: Todo[];
  messagesPagination: {
    page: number;
    limit: number;
    totalMessages: number;
    hasMore: boolean;
  };
  isLoading: boolean;
  isRefreshingChats: boolean; // True when refreshing chat list
  isLoadingChat: boolean; // True when loading/switching to a specific chat
  isActive: boolean; // True when thinking or executing
  error: string | null;
  selectChat: (chatId: string) => void;
  createNewChat: () => Promise<Chat | null>;
  sendMessage: (content: string, agentId?: string, agentType?: string) => Promise<void>;
  stop: () => void; // Stop ongoing requests
  updateTodos: (todos: Todo[]) => void;
  refreshChats: () => Promise<void>;
  addMessage: (message: ChatMessage) => void; // Add message directly without reloading
  updateMessageTodos: (messageId: string, todos: Todo[]) => void; // Update todos in a specific message
  loadMoreMessages: () => Promise<void>; // Load older messages (pagination)
}

export function useChat(): UseChatResult {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [messagesPagination, setMessagesPagination] = useState({
    page: 1,
    limit: 20,
    totalMessages: 0,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingChats, setIsRefreshingChats] = useState(false); // Separate state for chat list refresh
  const [isLoadingChat, setIsLoadingChat] = useState(false); // Separate state for loading/switching chats
  const [isActive, setIsActive] = useState(false); // Track if actively thinking/executing
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const thinkingMessageIdRef = useRef<string | null>(null);
  
  const userId = useUserStore((state) => state.getUserId());

  // Load chats for current user (summary mode for better performance)
  const refreshChats = useCallback(async (useSummary: boolean = true) => {
    if (!userId) {
      setChats([]);
      return;
    }

    setIsRefreshingChats(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          summary: useSummary,
        }),
      });
      
      const result = await response.json();

      if (result.success) {
        setChats(result.data || []);
      } else {
        setError(result.error || 'Failed to load chats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      setIsRefreshingChats(false);
    }
  }, [userId]);

  // Load chat by ID (optimized - doesn't set loading state if it's just updating messages)
  const loadChat = useCallback(async (chatId: string, options?: { setLoading?: boolean; page?: number; limit?: number }): Promise<Chat | null> => {
    const setLoading = options?.setLoading ?? true;
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    if (setLoading) {
      setIsLoadingChat(true); // Use isLoadingChat for chat switching
    }
    setError(null);

    try {
      const response = await fetch(`/api/chat/${chatId}?page=${page}&limit=${limit}`);
      const result = await response.json();

      if (result.success) {
        const chat = result.data;
        setCurrentChat(chat);
        const deduped = dedupeMessagesById(chat.messages || []);
        setMessages(deduped);
        if (chat.pagination) {
          setMessagesPagination({
            page: chat.pagination.page,
            limit: chat.pagination.limit,
            totalMessages: chat.pagination.totalMessages,
            hasMore: Boolean(chat.pagination.hasMore),
          });
        } else {
          setMessagesPagination({
            page,
            limit,
            totalMessages: deduped.length,
            hasMore: false,
          });
        }
        
        // Extract todos from latest message metadata
        // Sort by createdAt descending to get the most recent message with todos
        const latestMessageWithTodos = [...(chat.messages || [])]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .find(msg => msg.metadata?.todos && Array.isArray(msg.metadata.todos) && msg.metadata.todos.length > 0);
        
        if (latestMessageWithTodos?.metadata?.todos) {
          setTodos(latestMessageWithTodos.metadata.todos);
        } else if (chat.messages.length === 0) {
          // Only clear todos if there are no messages at all
          setTodos([]);
        }
        // Otherwise, keep existing todos (they might have been set before loadChat)
        
        return chat;
      } else {
        setError(result.error || 'Failed to load chat');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat');
      return null;
    } finally {
      if (setLoading) {
        setIsLoadingChat(false); // Use isLoadingChat for chat switching
      }
    }
  }, []);

  // Select chat - only loads messages for the selected chat, doesn't refresh chat list
  const selectChat = useCallback((chatId: string) => {
    // Only load if it's a different chat
    if (currentChat?.id !== chatId) {
    loadChat(chatId, { setLoading: true, page: 1, limit: 20 });
    }
  }, [loadChat, currentChat?.id]);

  // Load older messages (pagination: page+1 retrieves the previous slice)
  const loadMoreMessages = useCallback(async () => {
    if (!currentChat) return;
    if (!messagesPagination.hasMore) return;
    const nextPage = messagesPagination.page + 1;
    try {
      const response = await fetch(`/api/chat/${currentChat.id}?page=${nextPage}&limit=${messagesPagination.limit}`);
      const result = await response.json();
      if (result.success && result.data) {
        const chat = result.data;
        const older = chat.messages || [];
        setMessages((prev) => {
          const combined = [...older, ...prev];
          return dedupeMessagesById(combined);
        });
        if (chat.pagination) {
          setMessagesPagination({
            page: chat.pagination.page,
            limit: chat.pagination.limit,
            totalMessages: chat.pagination.totalMessages,
            hasMore: Boolean(chat.pagination.hasMore),
          });
        } else {
          setMessagesPagination((prev) => ({
            ...prev,
            page: nextPage,
            hasMore: false,
          }));
        }
      }
    } catch (err) {
      console.error('Error loading more messages:', err);
    }
  }, [currentChat, messagesPagination]);

  // Create new chat
  const createNewChat = useCallback(async (): Promise<Chat | null> => {
    if (!userId) {
      setError('User not logged in');
      return null;
    }

    setError(null);

    try {
      // Send with selectedAgentId: null to explicitly indicate this is a create request
      // The API checks for selectedAgentId !== undefined to distinguish create from get
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          selectedAgentId: null, // Explicitly set to null to indicate create request (not get)
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const newChat = result.data;
        // Ensure the chat has an ID
        if (!newChat.id) {
          console.error('Created chat missing ID:', newChat);
          setError('Failed to create chat: missing ID');
          return null;
        }
        // Optimistically add to chat list without showing skeleton
        setChats((prev) => [newChat, ...prev]);
        setCurrentChat(newChat);
        setMessages([]);
        setTodos([]);
        return newChat;
      } else {
        setError(result.error || 'Failed to create chat');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chat');
      return null;
    }
  }, [userId]);

  // Stop ongoing requests
  const stop = useCallback(() => {
    // Abort any ongoing fetch requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Remove thinking message if present
    if (thinkingMessageIdRef.current) {
      setMessages((prev) => prev.filter((msg) => msg.id !== thinkingMessageIdRef.current));
      thinkingMessageIdRef.current = null;
    }

    // Reset states
    setIsLoading(false);
    setIsActive(false);
    setError(null);
  }, []);

  // Send message
  const sendMessage = useCallback(async (
    content: string,
    agentId?: string,
    agentType?: string
  ) => {
    if (!currentChat) {
      console.error('useChat: No current chat selected');
      return;
    }
    
    if (!content || !content.trim()) {
      console.warn('useChat: Empty content, not sending');
      return;
    }

    // Stop any ongoing requests first
    stop();

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setIsActive(true);
    setError(null);

    try {
      // Extract hashtags and mentions from content
      const hashtags = extractHashtags(content);
      const mentions = extractMentions(content);
      
      // Add user message first - optimistically add to UI immediately
      const userMessageResponse = await fetch(`/api/chat/${currentChat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          content: content.trim(),
          hashtags: hashtags.length > 0 ? hashtags : undefined,
          mentions: mentions.length > 0 ? mentions : undefined,
        }),
        signal: abortController.signal,
      });

      // Check if aborted
      if (abortController.signal.aborted) {
        return;
      }

      const userMessageResult = await userMessageResponse.json();

      if (!userMessageResult.success) {
        setError(userMessageResult.error || 'Failed to send message');
        return;
      }

      // Optimistically add user message to UI immediately
      if (userMessageResult.success && userMessageResult.data) {
        setMessages((prev) => [...prev, userMessageResult.data]);
        // Update chat list item without full refresh
        setChats((prev) => {
          const filtered = prev.filter((chat) => chat.id !== currentChat.id);
          const updatedChat = prev.find((chat) => chat.id === currentChat.id);
          return [
            {
              ...(updatedChat || currentChat),
              lastMessage: content.trim().substring(0, 100),
              lastMessageAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            ...filtered,
          ];
        });
      }

      // Add thinking message immediately
      const thinkingMessageId = `thinking-${Date.now()}`;
      thinkingMessageIdRef.current = thinkingMessageId;
      const thinkingMessage: ChatMessage = {
        id: thinkingMessageId,
        role: 'assistant',
        content: 'thinking',
        agentId: agentId || 'orchestrator',
        createdAt: new Date().toISOString(),
        metadata: {
          isThinking: true,
        },
      };
      setMessages((prev) => [...prev, thinkingMessage]);
      setMessagesPagination((prev) => ({
        ...prev,
        totalMessages: prev.totalMessages + 1,
      }));

      // Determine which API to call
      // Use orchestrator if no agent is selected, or if explicitly orchestrator
      const isOrchestrator = !agentId || agentType === 'orchestrator' || agentId === 'orchestrator';
      const apiUrl = isOrchestrator 
        ? '/api/chat/orchestrate'
        : `/api/ai-builder/${agentId}`;

      // Prepare request body
      const requestBody: any = {
        userPrompt: content.trim(),
      };

      // Add chatId for orchestrator to track todos
      if (isOrchestrator) {
        requestBody.chatId = currentChat.id;
        // Pass orchestrator agentId if explicitly set
        if (agentId && agentId === 'orchestrator') {
          requestBody.agentId = agentId;
        }
      }

      // Call AI API with abort signal
      const aiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      // Check if aborted
      if (abortController.signal.aborted) {
        return;
      }

      const aiResult = await aiResponse.json();

      if (!aiResult.success) {
        setError(aiResult.error || 'Failed to get AI response');
        // Remove thinking message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== thinkingMessageId));
        setMessagesPagination((prev) => ({
          ...prev,
          totalMessages: Math.max(0, prev.totalMessages - 1),
        }));
        thinkingMessageIdRef.current = null;
        setIsLoading(false);
        setIsActive(false);
        abortControllerRef.current = null;
        return;
      }

      const responseData = aiResult.data;

          // Handle orchestrator response
          if (isOrchestrator) {
            // Check if direct execution (single agent executed directly)
            if (responseData.executionType === 'direct' && responseData.response) {
              // Extract hashtags and mentions from response
              const responseContent = typeof responseData.response === 'string' 
                ? responseData.response 
                : JSON.stringify(responseData.response, null, 2);
              const hashtags = extractHashtags(responseContent);
              const mentions = extractMentions(responseContent);

              // Get the actual agent used (not orchestrator)
              const actualAgentId = responseData.agentUsed || agentId || 'orchestrator';
              
              // Extract timing and cost from response
              const duration = responseData.timing?.duration || responseData.timing?.responseTime || null;
              const cost = responseData.tokenUsage?.pricing?.total_cost || null;

              // Add direct response message
              const messageResponse = await fetch(`/api/chat/${currentChat.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  role: 'assistant',
                  content: responseContent,
                  agentId: actualAgentId,
                  agentType: 'chat', // Will be determined from agent config if needed
                  hashtags: hashtags.length > 0 ? hashtags : undefined,
                  mentions: mentions.length > 0 ? mentions : undefined,
                  metadata: {
                    complexity: responseData.complexity,
                    executionType: responseData.executionType,
                    tokenUsage: responseData.tokenUsage,
                    duration: duration,
                    cost: cost,
                    responseFormat: responseData.format || 'string',
                  },
                }),
                signal: abortController.signal,
              });

              // Check if aborted
              if (abortController.signal.aborted) {
                return;
              }

              if (messageResponse.ok) {
                const messageResult = await messageResponse.json();
                if (messageResult.success) {
                  // Remove thinking message and add actual response
                  setMessages((prev) => {
                    const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
                    return [...withoutThinking, messageResult.data];
                  });
                  setMessagesPagination((prev) => ({
                    ...prev,
                    totalMessages: prev.totalMessages + (thinkingMessageId ? 0 : 1),
                  }));
                  // Update current chat
                  setCurrentChat((prev) => prev ? {
                    ...prev,
                    lastMessage: messageResult.data.content.substring(0, 100),
                    lastMessageAt: messageResult.data.createdAt,
                    updatedAt: messageResult.data.createdAt,
                  } : null);
                }
              }
              
              // Update chat list item without full refresh
              setChats((prev) => {
                const filtered = prev.filter((chat) => chat.id !== currentChat.id);
                const updatedChat = prev.find((chat) => chat.id === currentChat.id);
                return [
                  {
                    ...(updatedChat || currentChat),
                    lastMessage: responseContent.substring(0, 100) || 'Response received',
                    lastMessageAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                  ...filtered,
                ];
              });
              
              setIsLoading(false);
              setIsActive(false);
              thinkingMessageIdRef.current = null;
              abortControllerRef.current = null;
              return;
            }

            // Check if guidance is needed (no relevant agents found)
            if (responseData.executionType === 'guidance' && responseData.response) {
              // Add guidance message
              const messageResponse = await fetch(`/api/chat/${currentChat.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  role: 'assistant',
                  content: responseData.response,
                  agentId: agentId || 'orchestrator',
                  metadata: {
                    complexity: responseData.complexity,
                    executionType: responseData.executionType,
                  },
                }),
                signal: abortController.signal,
              });

              // Check if aborted
              if (abortController.signal.aborted) {
                return;
              }

              if (messageResponse.ok) {
                const messageResult = await messageResponse.json();
                if (messageResult.success) {
                  // Remove thinking message and add actual response
                  setMessages((prev) => {
                    const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
                    return [...withoutThinking, messageResult.data];
                  });
                  // Update current chat
                  setCurrentChat((prev) => prev ? {
                    ...prev,
                    lastMessage: messageResult.data.content.substring(0, 100),
                    lastMessageAt: messageResult.data.createdAt,
                    updatedAt: messageResult.data.createdAt,
                  } : null);
                }
              }
              
              // Update chat list item without full refresh
              setChats((prev) => {
                const filtered = prev.filter((chat) => chat.id !== currentChat.id);
                const updatedChat = prev.find((chat) => chat.id === currentChat.id);
                return [
                  {
                    ...(updatedChat || currentChat),
                    lastMessage: responseData.response?.substring(0, 100) || 'Guidance provided',
                    lastMessageAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                  ...filtered,
                ];
              });
              
              setIsLoading(false);
              setIsActive(false);
              thinkingMessageIdRef.current = null;
              abortControllerRef.current = null;
              return;
            }
            
            // Check if todos are required
            if (responseData.executionType === 'todo_required' && responseData.todos) {
              // Set todos first so they're immediately visible
              console.log('Setting todos:', responseData.todos);
              setTodos(responseData.todos);
              
              // Add assistant message indicating todos were generated (this saves todos to message metadata)
              const messageResponse = await fetch(`/api/chat/${currentChat.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  role: 'assistant',
                  content: responseData.message || 'I\'ve created a plan. Please review and approve the todos to proceed.',
                  agentId: agentId || 'orchestrator',
                  metadata: {
                    todos: responseData.todos,
                    complexity: responseData.complexity,
                    executionType: responseData.executionType,
                  },
                }),
                signal: abortController.signal,
              });

              // Check if aborted
              if (abortController.signal.aborted) {
                return;
              }

              if (messageResponse.ok) {
                const messageResult = await messageResponse.json();
                if (messageResult.success) {
                  console.log('Message added with todos:', messageResult.data);
                  // Remove thinking message and add actual response
                  setMessages((prev) => {
                    const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
                    return [...withoutThinking, messageResult.data];
                  });
                  // Update current chat
                  setCurrentChat((prev) => prev ? {
                    ...prev,
                    lastMessage: messageResult.data.content.substring(0, 100),
                    lastMessageAt: messageResult.data.createdAt,
                    updatedAt: messageResult.data.createdAt,
                  } : null);
                }
              }
              
              // Don't call loadChat here - we've already updated state
              // Just update the chat list item
              setChats((prev) => {
                const filtered = prev.filter((chat) => chat.id !== currentChat.id);
                const updatedChat = prev.find((chat) => chat.id === currentChat.id);
                return [
                  {
                    ...(updatedChat || currentChat),
                    lastMessage: responseData.message?.substring(0, 100) || 'New plan created',
                    lastMessageAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                  ...filtered,
                ];
              });
              
              // Early return - don't reload chat since we've already updated everything
              // Todos are already set and visible, message is added to state
              setIsLoading(false);
              setIsActive(false);
              thinkingMessageIdRef.current = null;
              abortControllerRef.current = null;
              return;
            } else if (responseData.executionType === 'chain_executed' && responseData.finalOutput) {
              // Chain executed - use finalOutput only
              const responseContent = responseData.finalOutput;

              // Extract hashtags and mentions from response content if it's a string
              const contentString = typeof responseContent === 'string' 
                ? responseContent 
                : JSON.stringify(responseContent, null, 2);
              const hashtags = typeof responseContent === 'string' 
                ? extractHashtags(responseContent) 
                : [];
              const mentions = typeof responseContent === 'string' 
                ? extractMentions(responseContent) 
                : [];

              const assistantMessageResponse = await fetch(`/api/chat/${currentChat.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  role: 'assistant',
                  content: contentString,
                  agentId: agentId || 'orchestrator',
                  hashtags: hashtags.length > 0 ? hashtags : undefined,
                  mentions: mentions.length > 0 ? mentions : undefined,
                  metadata: {
                    complexity: responseData.complexity,
                    executionType: responseData.executionType,
                    todos: responseData.todos,
                    responseFormat: typeof responseContent === 'string' ? 'string' : 'json',
                  },
                }),
                signal: abortController.signal,
              });

              // Check if aborted
              if (abortController.signal.aborted) {
                return;
              }

              const assistantMessageResult = await assistantMessageResponse.json();

              // Remove thinking message and add actual response
              if (assistantMessageResult.success && assistantMessageResult.data) {
                setMessages((prev) => {
                  const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
                  return [...withoutThinking, assistantMessageResult.data];
                });
              setMessagesPagination((prev) => ({
                ...prev,
                totalMessages: prev.totalMessages + (thinkingMessageId ? 0 : 1),
              }));
              }

              // Update todos if present
              if (responseData.todos) {
                setTodos(responseData.todos);
              }

              // Update chat list item without full refresh
              setChats((prev) => {
                const filtered = prev.filter((chat) => chat.id !== currentChat.id);
                const updatedChat = prev.find((chat) => chat.id === currentChat.id);
                return [
                  {
                    ...(updatedChat || currentChat),
                    lastMessage: contentString.substring(0, 100) || 'Response received',
                    lastMessageAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                  ...filtered,
                ];
              });

              setIsLoading(false);
              setIsActive(false);
              thinkingMessageIdRef.current = null;
              abortControllerRef.current = null;
              return;
            } else if (responseData.response && responseData.executionType !== 'chain_executed') {
              // Direct execution (not chain) - use response
              const responseContent = responseData.response;

              // Extract hashtags and mentions from response content if it's a string
              const contentString = typeof responseContent === 'string' 
                ? responseContent 
                : JSON.stringify(responseContent, null, 2);
              const hashtags = typeof responseContent === 'string' 
                ? extractHashtags(contentString) 
                : [];
              const mentions = typeof responseContent === 'string' 
                ? extractMentions(contentString) 
                : [];

              const assistantMessageResponse = await fetch(`/api/chat/${currentChat.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  role: 'assistant',
                  content: contentString,
                  agentId: agentId || 'orchestrator',
                  hashtags: hashtags.length > 0 ? hashtags : undefined,
                  mentions: mentions.length > 0 ? mentions : undefined,
                  metadata: {
                    complexity: responseData.complexity,
                    executionType: responseData.executionType,
                    responseFormat: typeof responseContent === 'string' ? 'string' : 'json',
                  },
                }),
                signal: abortController.signal,
              });

              // Check if aborted
              if (abortController.signal.aborted) {
                return;
              }

              const assistantMessageResult = await assistantMessageResponse.json();

              // Remove thinking message and add actual response
              if (assistantMessageResult.success && assistantMessageResult.data) {
                setMessages((prev) => {
                  const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
                  return [...withoutThinking, assistantMessageResult.data];
                });
              setMessagesPagination((prev) => ({
                ...prev,
                totalMessages: prev.totalMessages + (thinkingMessageId ? 0 : 1),
              }));
              }

              // Update chat list item without full refresh
              setChats((prev) => {
                const filtered = prev.filter((chat) => chat.id !== currentChat.id);
                const updatedChat = prev.find((chat) => chat.id === currentChat.id);
                return [
                  {
                    ...(updatedChat || currentChat),
                    lastMessage: contentString.substring(0, 100) || 'Response received',
                    lastMessageAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                  ...filtered,
                ];
              });
              
              setIsLoading(false);
              setIsActive(false);
              thinkingMessageIdRef.current = null;
              abortControllerRef.current = null;
              return;
            } else {
              // Regular agent response
              const responseContent = responseData.response;
              const responseFormat = responseData.format || 'string';

              const assistantMessageResponse = await fetch(`/api/chat/${currentChat.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  role: 'assistant',
                  content: typeof responseContent === 'string' 
                    ? responseContent 
                    : JSON.stringify(responseContent, null, 2),
                  agentId: agentId,
                  metadata: {
                    responseFormat,
                    tokenUsage: responseData.tokenUsage,
                    timing: responseData.timing,
                  },
                }),
                signal: abortController.signal,
              });

              // Check if aborted
              if (abortController.signal.aborted) {
                return;
              }

              const assistantMessageResult = await assistantMessageResponse.json();

              // Remove thinking message and add actual response
              if (assistantMessageResult.success && assistantMessageResult.data) {
                setMessages((prev) => {
                  const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
                  return [...withoutThinking, assistantMessageResult.data];
                });
              setMessagesPagination((prev) => ({
                ...prev,
                totalMessages: prev.totalMessages + (thinkingMessageId ? 0 : 1),
              }));
              }

              // Update chat list item without full refresh
              const responseContentString = typeof responseContent === 'string' 
                ? responseContent 
                : JSON.stringify(responseContent, null, 2);
              setChats((prev) => {
                const filtered = prev.filter((chat) => chat.id !== currentChat.id);
                const updatedChat = prev.find((chat) => chat.id === currentChat.id);
                return [
                  {
                    ...(updatedChat || currentChat),
                    lastMessage: responseContentString.substring(0, 100) || 'Response received',
                    lastMessageAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                  ...filtered,
                ];
              });
            }
          } else {
            // Regular agent response (non-orchestrator)
            const responseContent = responseData.response;
            const responseFormat = responseData.format || 'string';

            const assistantMessageResponse = await fetch(`/api/chat/${currentChat.id}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                role: 'assistant',
                content: typeof responseContent === 'string' 
                  ? responseContent 
                  : JSON.stringify(responseContent, null, 2),
                agentId: agentId,
                metadata: {
                  responseFormat,
                  tokenUsage: responseData.tokenUsage,
                  timing: responseData.timing,
                },
              }),
              signal: abortController.signal,
            });

            // Check if aborted
            if (abortController.signal.aborted) {
              return;
            }

            const assistantMessageResult = await assistantMessageResponse.json();

            // Remove thinking message and add actual response
            if (assistantMessageResult.success && assistantMessageResult.data) {
              setMessages((prev) => {
                const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
                return [...withoutThinking, assistantMessageResult.data];
              });
              setMessagesPagination((prev) => ({
                ...prev,
                totalMessages: prev.totalMessages + (thinkingMessageId ? 0 : 1),
              }));
            }

            // Update chat list item without full refresh
            const responseContentString = typeof responseContent === 'string' 
              ? responseContent 
              : JSON.stringify(responseContent, null, 2);
            setChats((prev) => {
              const filtered = prev.filter((chat) => chat.id !== currentChat.id);
              const updatedChat = prev.find((chat) => chat.id === currentChat.id);
              return [
                {
                  ...(updatedChat || currentChat),
                  lastMessage: responseContentString.substring(0, 100) || 'Response received',
                  lastMessageAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                ...filtered,
              ];
            });
          }
    } catch (err) {
      // Check if error is due to abort
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted - cleanup already handled by stop()
        return;
      }
      
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Remove thinking message on error
      if (thinkingMessageIdRef.current) {
        setMessages((prev) => prev.filter((msg) => msg.id !== thinkingMessageIdRef.current));
        thinkingMessageIdRef.current = null;
      }
    } finally {
      setIsLoading(false);
      setIsActive(false);
      abortControllerRef.current = null;
    }
  }, [currentChat, stop]);

  // Update todos
  const updateTodos = useCallback((newTodos: Todo[]) => {
    setTodos(newTodos);
  }, []);

  // Add message directly without reloading (for todo execution messages)
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      // Check if message already exists to avoid duplicates
      if (prev.some(msg => msg.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
    
    // Update chat list item without full refresh
    if (currentChat) {
      setChats((prev) => {
        const filtered = prev.filter((chat) => chat.id !== currentChat.id);
        const updatedChat = prev.find((chat) => chat.id === currentChat.id);
        return [
          {
            ...(updatedChat || currentChat),
            lastMessage: message.content.substring(0, 100) || 'Response received',
            lastMessageAt: message.createdAt,
            updatedAt: message.createdAt,
          },
          ...filtered,
        ];
      });
    }
  }, [currentChat]);

  // Update todos in a specific message
  const updateMessageTodos = useCallback((messageId: string, todos: Todo[]) => {
    setMessages((prev) => {
      return prev.map(msg => {
        if (msg.id === messageId && msg.metadata) {
          return {
            ...msg,
            metadata: {
              ...msg.metadata,
              todos: todos,
            },
          };
        }
        return msg;
      });
    });
    
    // Also update todos state if this is the latest message with todos
    setTodos(todos);
  }, []);

  // Initial load - only on mount, not on every route change
  const hasLoadedChatsRef = useRef(false);
  useEffect(() => {
    if (userId && !hasLoadedChatsRef.current) {
      hasLoadedChatsRef.current = true;
      refreshChats();
    }
  }, [userId, refreshChats]);

  return {
        chats,
        currentChat,
        messages,
    messagesPagination,
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
    loadMoreMessages,
      };
}

