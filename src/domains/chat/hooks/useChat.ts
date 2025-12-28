// Chat Hook
// Manages chat state, messages, and chat selection

'use client';

import { useState, useEffect, useCallback, useRef, startTransition, useMemo } from 'react';
import { useUserStore } from '@/stores/user.store';
import { extractHashtags, extractMentions } from '../utils/text-utils';
import { REQUIRE_LOGIN, DEMO_MODE } from '@/gradian-ui/shared/configs/env-config';
import type { Chat, ChatMessage, AddMessageRequest, Todo } from '../types';

// Hardcoded demo userId for when REQUIRE_LOGIN is false and DEMO_MODE is true
const DEMO_USER_ID = '01K9ABA6MQ9K64MY7M4AEBCAP2';

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
  deleteChat: (chatId: string) => Promise<boolean>; // Delete a chat
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
  
  const userStoreUserId = useUserStore((state) => state.getUserId());
  
  // Use hardcoded demo userId when REQUIRE_LOGIN is false and DEMO_MODE is true
  const userId = useMemo(() => {
    if (!REQUIRE_LOGIN && DEMO_MODE) {
      return DEMO_USER_ID;
    }
    return userStoreUserId;
  }, [userStoreUserId]);

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
    // userId is already computed to use DEMO_USER_ID when REQUIRE_LOGIN is false and DEMO_MODE is true
    // Only show error if userId is still null (shouldn't happen in demo mode)
    if (!userId) {
      // Only show error if REQUIRE_LOGIN is true or DEMO_MODE is false
      if (REQUIRE_LOGIN || !DEMO_MODE) {
        setError('User not logged in');
      }
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
        // Refresh chat list to ensure all chats are loaded (including the new one)
        // This ensures consistency and that all chats are displayed
        await refreshChats();
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
  }, [userId, refreshChats]);

  // Stop ongoing requests
  const stop = useCallback(() => {
    // Abort any ongoing fetch requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Remove thinking message if present
    if (thinkingMessageIdRef.current) {
      startTransition(() => {
        setMessages((prev) => prev.filter((msg) => msg.id !== thinkingMessageIdRef.current));
        thinkingMessageIdRef.current = null;
      });
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
      // Create optimistic user message for immediate UI update
      // Use a predictable ID format that can be updated in place
      const optimisticId = `user-${Date.now()}`;
      const optimisticUserMessage: ChatMessage = {
        id: optimisticId,
        role: 'user',
        content: content.trim(),
        createdAt: new Date().toISOString(),
        hashtags: hashtags,
        mentions: mentions,
      };

      // Add optimistic message to UI immediately - use startTransition to batch updates
      startTransition(() => {
        setMessages((prev) => [...prev, optimisticUserMessage]);
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
      });

      // Now send to API
      let userMessageResponse: Response;
      try {
        userMessageResponse = await fetch(`/api/chat/${currentChat.id}/messages`, {
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
      } catch (fetchError) {
        // Network error or abort
        if (abortController.signal.aborted) {
          // Remove optimistic message if aborted - use startTransition to batch updates
          startTransition(() => {
            setMessages((prev) => {
              const index = prev.findIndex((msg) => msg.id === optimisticUserMessage.id);
              if (index !== -1) {
                const updated = [...prev];
                updated.splice(index, 1);
                return updated;
              }
              return prev;
            });
          });
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : 'Network error - failed to send message');
        return;
      }

      // Check if aborted
      if (abortController.signal.aborted) {
        // Remove optimistic message if aborted - use startTransition to batch updates
        startTransition(() => {
          setMessages((prev) => {
            const index = prev.findIndex((msg) => msg.id === optimisticUserMessage.id);
            if (index !== -1) {
              const updated = [...prev];
              updated.splice(index, 1);
              return updated;
            }
            return prev;
          });
        });
        return;
      }

      // Check response status and content type
      if (!userMessageResponse.ok) {
        const contentType = userMessageResponse.headers.get('content-type');
        let errorMessage = 'Failed to send message';
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await userMessageResponse.json();
            errorMessage = errorData.error || errorData.message || `Server error: ${userMessageResponse.status}`;
          } catch {
            errorMessage = `Server error: ${userMessageResponse.status} ${userMessageResponse.statusText}`;
          }
        } else {
          // Response is HTML (error page), not JSON
          const errorText = await userMessageResponse.text();
          errorMessage = `Server error: ${userMessageResponse.status} ${userMessageResponse.statusText}`;
          console.error('Non-JSON response from API:', errorText.substring(0, 200));
        }
        
        setError(errorMessage);
        // Keep optimistic message but mark it as failed
        return;
      }

      // Parse JSON response
      const contentType = userMessageResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const errorText = await userMessageResponse.text();
        console.error('Non-JSON response from API:', errorText.substring(0, 200));
        setError('Server returned invalid response format');
        return;
      }

      let userMessageResult: any;
      try {
        userMessageResult = await userMessageResponse.json();
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        setError('Failed to parse server response');
        return;
      }

      if (!userMessageResult.success) {
        setError(userMessageResult.error || 'Failed to send message');
        return;
      }

      // Update optimistic message with server data, keeping the same ID to avoid DOM reconciliation issues
      if (userMessageResult.success && userMessageResult.data) {
        startTransition(() => {
          setMessages((prev) => {
            // Find the optimistic message and merge server data into it
            const optimisticIndex = prev.findIndex((msg) => msg.id === optimisticUserMessage.id);
            if (optimisticIndex !== -1) {
              // Merge server data into optimistic message, keeping the same ID and position
              // This prevents React from treating it as a new component
              const updated = [...prev];
              updated[optimisticIndex] = {
                ...userMessageResult.data,
                id: optimisticUserMessage.id, // Keep the same ID to maintain DOM stability
              };
              return updated;
            } else {
              // Fallback: if optimistic message not found, just add the real one
              return [...prev, userMessageResult.data];
            }
          });
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
      startTransition(() => {
        setMessages((prev) => [...prev, thinkingMessage]);
        setMessagesPagination((prev) => ({
          ...prev,
          totalMessages: prev.totalMessages + 1,
        }));
      });

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
        startTransition(() => {
          setMessages((prev) => prev.filter((msg) => msg.id !== thinkingMessageId));
          setMessagesPagination((prev) => ({
            ...prev,
            totalMessages: Math.max(0, prev.totalMessages - 1),
          }));
          thinkingMessageIdRef.current = null;
        });
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
              
              // Determine agentType from responseData or agentId
              // Check if it's a search agent by agentId or response format
              const isSearchAgent = actualAgentId === 'search' || 
                                   responseData.format === 'search-card' || 
                                   responseData.format === 'search-results' ||
                                   responseData.searchResults !== undefined;
              const determinedAgentType = isSearchAgent ? 'search' : (agentType || 'chat');
              
              // Extract timing and cost from response
              const duration = responseData.timing?.duration || responseData.timing?.responseTime || null;
              const cost = responseData.tokenUsage?.pricing?.total_cost || null;

              // Extract search results if available (check multiple possible locations)
              const searchResults = responseData.searchResults || 
                                   responseData.data?.searchResults ||
                                   responseData.data?.search?.results ||
                                   (Array.isArray(responseData.data) && (responseData.format === 'search-card' || responseData.format === 'search-results') ? responseData.data : null) ||
                                   (Array.isArray(responseData.search?.results) ? responseData.search.results : null);

              // Determine response format - set to 'search-card' if search results are present
              const finalResponseFormat = (searchResults && Array.isArray(searchResults) && searchResults.length > 0)
                ? 'search-card'
                : (responseData.format || 'string');

              // Add direct response message
              const messageResponse = await fetch(`/api/chat/${currentChat.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  role: 'assistant',
                  content: responseContent,
                  agentId: actualAgentId,
                  agentType: determinedAgentType,
                  hashtags: hashtags.length > 0 ? hashtags : undefined,
                  mentions: mentions.length > 0 ? mentions : undefined,
                  metadata: {
                    complexity: responseData.complexity,
                    executionType: responseData.executionType,
                    tokenUsage: responseData.tokenUsage,
                    duration: duration,
                    cost: cost,
                    responseFormat: finalResponseFormat,
                    ...(searchResults && Array.isArray(searchResults) && searchResults.length > 0 
                      ? { searchResults: searchResults } 
                      : {}),
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
                  startTransition(() => {
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
                  });
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
                  startTransition(() => {
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
                  });
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
              const responseFormat = responseData.format || (typeof responseContent === 'string' ? 'string' : 'json');

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
              
              // Determine agentType from agentId or response format
              const isSearchAgent = agentId === 'search' || 
                                   responseFormat === 'search-card' || 
                                   responseFormat === 'search-results' ||
                                   responseData.searchResults !== undefined;
              const determinedAgentType = isSearchAgent ? 'search' : (agentType || 'orchestrator');
              
              // Extract search results if available (check multiple possible locations)
              const searchResults = responseData.searchResults || 
                                   responseData.data?.searchResults ||
                                   responseData.data?.search?.results ||
                                   (Array.isArray(responseData.data) && (responseFormat === 'search-card' || responseFormat === 'search-results') ? responseData.data : null) ||
                                   (Array.isArray(responseData.search?.results) ? responseData.search.results : null);

              // Determine response format - set to 'search-card' if search results are present
              const finalResponseFormat = (searchResults && Array.isArray(searchResults) && searchResults.length > 0)
                ? 'search-card'
                : responseFormat;

              const assistantMessageResponse = await fetch(`/api/chat/${currentChat.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  role: 'assistant',
                  content: contentString,
                  agentId: agentId || 'orchestrator',
                  agentType: determinedAgentType,
                  hashtags: hashtags.length > 0 ? hashtags : undefined,
                  mentions: mentions.length > 0 ? mentions : undefined,
                  metadata: {
                    complexity: responseData.complexity,
                    executionType: responseData.executionType,
                    responseFormat: finalResponseFormat,
                    ...(searchResults && Array.isArray(searchResults) && searchResults.length > 0 
                      ? { searchResults: searchResults } 
                      : {}),
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
              
              // Determine agentType from agentId or response format
              const isSearchAgent = agentId === 'search' || 
                                   responseFormat === 'search-card' || 
                                   responseFormat === 'search-results' ||
                                   responseData.searchResults !== undefined;
              const determinedAgentType = isSearchAgent ? 'search' : (agentType || 'chat');
              
              // Extract search results if available (check multiple possible locations)
              const searchResults = responseData.searchResults || 
                                   responseData.data?.searchResults ||
                                   responseData.data?.search?.results ||
                                   (Array.isArray(responseData.data) && (responseFormat === 'search-card' || responseFormat === 'search-results') ? responseData.data : null) ||
                                   (Array.isArray(responseData.search?.results) ? responseData.search.results : null);

              const assistantMessageResponse = await fetch(`/api/chat/${currentChat.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  role: 'assistant',
                  content: typeof responseContent === 'string' 
                    ? responseContent 
                    : JSON.stringify(responseContent, null, 2),
                  agentId: agentId,
                  agentType: determinedAgentType,
                  metadata: {
                    responseFormat,
                    tokenUsage: responseData.tokenUsage,
                    timing: responseData.timing,
                    ...(searchResults && Array.isArray(searchResults) && searchResults.length > 0 
                      ? { searchResults: searchResults } 
                      : {}),
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
                startTransition(() => {
                  setMessages((prev) => {
                    const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
                    return [...withoutThinking, assistantMessageResult.data];
                  });
                  setMessagesPagination((prev) => ({
                    ...prev,
                    totalMessages: prev.totalMessages + (thinkingMessageId ? 0 : 1),
                  }));
                });
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
              startTransition(() => {
                setMessages((prev) => {
                  const withoutThinking = prev.filter((msg) => msg.id !== thinkingMessageId);
                  return [...withoutThinking, assistantMessageResult.data];
                });
                setMessagesPagination((prev) => ({
                  ...prev,
                  totalMessages: prev.totalMessages + (thinkingMessageId ? 0 : 1),
                }));
              });
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
        startTransition(() => {
          setMessages((prev) => prev.filter((msg) => msg.id !== thinkingMessageIdRef.current));
          thinkingMessageIdRef.current = null;
        });
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
    // Use startTransition to prevent blocking the UI
    startTransition(() => {
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
    });
  }, [currentChat]);

  // Update todos in a specific message
  const updateMessageTodos = useCallback((messageId: string, todos: Todo[]) => {
    startTransition(() => {
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
    });
  }, []);

  // Delete chat
  const deleteChat = useCallback(async (chatId: string): Promise<boolean> => {
    if (!chatId) {
      return false;
    }

    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (result.success) {
        // Remove chat from local state
        setChats((prev) => prev.filter((chat) => chat.id !== chatId));
        
        // If deleted chat was current, clear current chat and navigate to chat list
        if (currentChat?.id === chatId) {
          setCurrentChat(null);
          setMessages([]);
          setTodos([]);
          setMessagesPagination({
            page: 1,
            limit: 20,
            totalMessages: 0,
            hasMore: false,
          });
        }

        return true;
      } else {
        setError(result.error || 'Failed to delete chat');
        return false;
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete chat');
      return false;
    }
  }, [currentChat]);

  // Initial load - refresh chats when userId is available
  useEffect(() => {
    if (userId) {
      refreshChats();
    } else {
      setChats([]);
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
    deleteChat,
      };
}

