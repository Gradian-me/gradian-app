/**
 * Chat Storage Utilities
 * Handles persistence of chat data to data/chat.json
 */

import fs from 'fs';
import path from 'path';
import { ulid } from 'ulid';
import type { Chat, ChatMessage, CreateChatRequest, AddMessageRequest, UpdateChatRequest, Todo } from '../types';

const CHAT_DATA_PATH = path.join(process.cwd(), 'data', 'chat.json');

/**
 * Ensure chat data file exists
 */
function ensureChatFile(): void {
  const dir = path.dirname(CHAT_DATA_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(CHAT_DATA_PATH)) {
    fs.writeFileSync(CHAT_DATA_PATH, JSON.stringify([], null, 2), 'utf8');
  }
}

/**
 * Load all chats from file
 */
export function loadChats(): Chat[] {
  ensureChatFile();
  
  try {
    const fileContents = fs.readFileSync(CHAT_DATA_PATH, 'utf8');
    
    if (!fileContents || fileContents.trim().length === 0) {
      return [];
    }
    
    const parsed = JSON.parse(fileContents);
    
    // Handle both array format (new) and object with chats property (legacy)
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    // Legacy format: {chats: []}
    if (typeof parsed === 'object' && parsed !== null && Array.isArray(parsed.chats)) {
      // Migrate to array format
      const chats = parsed.chats;
      saveChats(chats);
      return chats;
    }
    
    return [];
  } catch (error) {
    console.error('Error loading chats:', error);
    return [];
  }
}

/**
 * Save chats to file
 */
export function saveChats(chats: Chat[]): void {
  ensureChatFile();
  
  try {
    fs.writeFileSync(CHAT_DATA_PATH, JSON.stringify(chats, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving chats:', error);
    throw new Error('Failed to save chats');
  }
}

/**
 * Get chats filtered by userId
 */
export function getChatsByUserId(userId: string): Chat[] {
  const allChats = loadChats();
  return allChats.filter(chat => chat.userId === userId);
}

/**
 * Create a new chat
 */
export function createChat(request: CreateChatRequest): Chat {
  const chats = loadChats();
  
  const newChat: Chat = {
    id: ulid(),
    title: request.title || 'New Chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: request.userId,
    messages: [],
    selectedAgentId: request.selectedAgentId || null,
  };
  
  chats.push(newChat);
  saveChats(chats);
  
  return newChat;
}

/**
 * Get chat by ID
 */
export function getChatById(chatId: string): Chat | null {
  const chats = loadChats();
  return chats.find(chat => chat.id === chatId) || null;
}

/**
 * Add message to chat and update lastMessage/lastMessageAt
 */
export function addMessageToChat(chatId: string, message: AddMessageRequest): ChatMessage {
  const chats = loadChats();
  const chat = chats.find(c => c.id === chatId);
  
  if (!chat) {
    throw new Error(`Chat with ID "${chatId}" not found`);
  }
  
  const newMessage: ChatMessage = {
    id: ulid(),
    ...message,
    agentType: message.agentType as 'chat' | 'orchestrator' | 'image-generation' | 'voice-transcription' | 'video-generation' | undefined,
    createdAt: new Date().toISOString(),
  };
  
  chat.messages.push(newMessage);
  chat.updatedAt = new Date().toISOString();
  
  // Update lastMessage and lastMessageAt
  chat.lastMessage = message.content.substring(0, 100); // First 100 chars as preview
  chat.lastMessageAt = newMessage.createdAt;
  
  // Auto-generate title from first user message if not set
  if (chat.title === 'New Chat' && message.role === 'user') {
    chat.title = message.content.substring(0, 50).trim() || 'New Chat';
  }
  
  saveChats(chats);
  
  return newMessage;
}

/**
 * Update chat metadata
 */
export function updateChat(chatId: string, updates: UpdateChatRequest): Chat | null {
  const chats = loadChats();
  const chat = chats.find(c => c.id === chatId);
  
  if (!chat) {
    return null;
  }
  
  if (updates.title !== undefined) {
    chat.title = updates.title;
  }
  
  if (updates.selectedAgentId !== undefined) {
    chat.selectedAgentId = updates.selectedAgentId;
  }
  
  chat.updatedAt = new Date().toISOString();
  
  saveChats(chats);
  
  return chat;
}

/**
 * Update todos in the latest message that has todos
 */
export function updateChatMessageTodos(chatId: string, todos: Todo[]): boolean {
  const chats = loadChats();
  const chat = chats.find(c => c.id === chatId);
  
  if (!chat) {
    return false;
  }
  
  // Find the latest message that has todos
  const messagesWithTodos = chat.messages
    .filter(msg => msg.metadata?.todos && msg.metadata.todos.length > 0)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  if (messagesWithTodos.length === 0) {
    return false; // No message with todos found
  }
  
  // Update the latest message's todos
  const messageToUpdate = messagesWithTodos[0];
  if (messageToUpdate.metadata) {
    messageToUpdate.metadata.todos = todos;
    chat.updatedAt = new Date().toISOString();
    saveChats(chats);
    return true;
  }
  
  return false;
}

/**
 * Delete chat
 */
export function deleteChat(chatId: string): boolean {
  const chats = loadChats();
  const initialLength = chats.length;
  const filteredChats = chats.filter(chat => chat.id !== chatId);
  
  if (filteredChats.length === initialLength) {
    return false; // Chat not found
  }
  
  saveChats(filteredChats);
  return true;
}

