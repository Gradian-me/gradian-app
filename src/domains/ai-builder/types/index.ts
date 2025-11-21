/**
 * AI Builder Domain Types
 */

export interface AiAgent {
  id: string;
  label: string;
  icon: string;
  description: string;
  requiredOutputFormat: 'json' | 'string';
  model?: string;
  systemPrompt?: string;
  preloadRoutes?: Array<{
    route: string;
    title: string;
    description: string;
    method?: 'GET' | 'POST';
    jsonPath?: string;
    body?: any;
    queryParameters?: Record<string, string>;
  }>;
  nextAction: {
    label: string;
    icon?: string;
    route: string;
  };
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  pricing?: {
    input_price_per_1m: number;
    output_price_per_1m: number;
    input_cost: number;
    output_cost: number;
    total_cost: number;
    model_id: string;
  } | null;
}

export interface AiBuilderResponse {
  response: string;
  format: 'json' | 'string';
  tokenUsage: TokenUsage | null;
  timing?: {
    responseTime: number; // Time to receive response in milliseconds
    duration: number; // Total duration in milliseconds
  };
  agent: {
    id: string;
    label: string;
    description: string;
    requiredOutputFormat: 'json' | 'string';
    nextAction: {
      label: string;
      icon?: string;
      route: string;
    };
  };
}

export interface GeneratePromptRequest {
  userPrompt: string;
  agentId: string;
}

export interface ApproveRequest {
  response: string;
  agent: AiAgent;
}

export interface PreloadRouteResult {
  route: string;
  title: string;
  description: string;
  success: boolean;
  data?: any;
  error?: string;
}

