/**
 * AI Prompts Domain Types
 */

export interface AiPrompt {
  id: string; // ULID
  timestamp: string; // ISO 8601 timestamp
  username: string;
  aiAgent: string; // Agent ID
  userPrompt: string;
  agentResponse: string;
  inputTokens: number;
  inputPrice: number;
  outputTokens: number;
  outputPrice: number;
  totalTokens: number;
  totalPrice: number;
  responseTime?: number; // Response time in milliseconds (time to first token or full response)
  duration?: number; // Total duration in milliseconds (from request start to completion)
}

export interface CreateAiPromptRequest {
  username: string;
  aiAgent: string;
  userPrompt: string;
  agentResponse: string;
  inputTokens: number;
  inputPrice: number;
  outputTokens: number;
  outputPrice: number;
  totalTokens: number;
  totalPrice: number;
  responseTime?: number; // Response time in milliseconds
  duration?: number; // Total duration in milliseconds
}

export interface AiPromptFilters {
  username?: string;
  aiAgent?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

