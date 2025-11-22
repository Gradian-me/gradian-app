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
  responseCards?: ResponseCardConfig[];
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

export interface AiBuilderResponseData {
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
  referenceId?: string; // ID of the original prompt this is based on
  annotations?: Array<{
    schemaId: string;
    schemaName: string;
    annotations: Array<{ id: string; label: string }>;
  }>; // Annotations to include when saving
  previousAiResponse?: string; // Previous AI response for annotation-based regeneration
  previousUserPrompt?: string; // Previous user prompt for annotation-based regeneration
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

export interface ResponseCardConfig {
  idPath: string; // JSON path to extract card ID (e.g., "$.id" or "$[0].id")
  labelPath: string; // JSON path to extract card label (e.g., "$.singular_name")
  iconPath: string; // JSON path to extract icon name (e.g., "$.icon")
  actionType: 'openFormModal'; // Extensible for future actions
  schemaPath: string; // JSON path to extract full schema data (e.g., "$" or "$[0]")
}

export interface AnnotationItem {
  id: string;
  label: string;
}

export interface SchemaAnnotation {
  schemaId: string;
  schemaLabel: string;
  schemaIcon?: string;
  annotations: AnnotationItem[];
}

