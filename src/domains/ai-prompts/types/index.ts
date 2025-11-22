/**
 * AI Prompts Domain Types
 */

export interface AnnotationItem {
  id: string;
  label: string;
}

export interface SchemaAnnotation {
  schemaId: string;
  schemaName: string;
  annotations: AnnotationItem[];
}

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
  referenceId?: string; // ID of the original prompt this is based on (for modified prompts)
  annotations?: SchemaAnnotation[]; // Annotations added to the prompt
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
  referenceId?: string; // ID of the original prompt this is based on
  annotations?: SchemaAnnotation[]; // Annotations added to the prompt
}

export interface AiPromptFilters {
  username?: string;
  aiAgent?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

