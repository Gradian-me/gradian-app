/**
 * Chat Domain Types
 */

import { TokenUsage } from '@/domains/ai-builder/types';

export interface Chat {
  id: string; // ULID
  title: string; // Auto-generated from first message
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  userId: string; // REQUIRED - filters chats by user
  lastMessage?: string; // Preview of last message for list display
  lastMessageAt?: string; // ISO string for sorting
  messages: ChatMessage[];
  selectedAgentId?: string | null; // For manual selection
}

export interface ChatMessage {
  id: string; // ULID
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentId?: string; // Which agent processed this
  agentType?: 'chat' | 'orchestrator' | 'image-generation' | 'voice-transcription' | 'video-generation';
  hashtags?: string[]; // Array of hashtags extracted from content
  mentions?: string[]; // Array of mentioned agent IDs
  metadata?: ChatMessageMetadata;
  createdAt: string; // ISO string
}

export interface ChatMessageMetadata {
  todos?: Todo[];
  tokenUsage?: TokenUsage;
  responseFormat?: 'json' | 'string' | 'table' | 'image' | 'video' | 'graph';
  isThinking?: boolean;
  complexity?: number; // Complexity score (0.0-1.0) from orchestrator analysis
  todoId?: string; // ID of the todo that generated this response
  todoTitle?: string; // Title of the todo that generated this response
  duration?: number; // Duration in milliseconds
  cost?: number; // Cost in currency (e.g., USD)
  executionType?: 'direct' | 'todo_required' | 'chain_executed'; // Execution type from orchestrator
}

export interface Todo {
  id: string; // ULID
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  agentId: string; // Which agent will handle this todo
  agentType?: string; // Type of agent (e.g., 'professional-writing', 'image-generator')
  dependencies?: string[]; // Array of todo IDs that must complete first
  input?: any; // Input data for the agent
  output?: any; // Output from agent execution
  createdAt: string; // ISO string
  completedAt?: string; // ISO string
  tokenUsage?: TokenUsage; // Token usage from agent execution
  duration?: number; // Duration in milliseconds
  cost?: number; // Cost in currency (e.g., USD)
  responseFormat?: 'json' | 'string' | 'table' | 'image' | 'video' | 'graph'; // Response format from agent
  chainMetadata?: {
    input: any; // Input passed to the agent
    executedAt: string; // ISO string - when the todo was executed
    output?: any; // Output from agent execution
    error?: string; // Error message if execution failed
  };
}

export interface AgentChainStep {
  agentId: string;
  agentType: string;
  input: any; // Input passed to this agent
  output?: any; // Output from this agent
  condition?: string; // Condition that led to this step
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
  executedAt?: string; // ISO string
}

export interface CreateChatRequest {
  userId: string;
  title?: string; // Optional, will be auto-generated if not provided
  selectedAgentId?: string | null;
}

export interface AddMessageRequest {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentId?: string;
  agentType?: string;
  hashtags?: string[];
  mentions?: string[];
  metadata?: ChatMessageMetadata;
}

export interface UpdateChatRequest {
  title?: string;
  selectedAgentId?: string | null;
}

