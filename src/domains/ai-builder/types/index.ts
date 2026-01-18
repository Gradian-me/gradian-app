/**
 * AI Builder Domain Types
 */

import { FormField } from '@/gradian-ui/schema-manager/types/form-schema';

export interface AiAgent {
  id: string;
  label: string;
  icon: string;
  description: string;
  category?: string; // Category for grouping agents
  agentType?: 'chat' | 'image-generation' | 'voice-transcription' | 'video-generation' | 'graph-generation' | 'orchestrator' | 'search'; // Type of AI agent
  requiredOutputFormat: 'json' | 'string' | 'table' | 'image' | 'video' | 'graph' | 'search-results' | 'search-card';
  model?: string;
  systemPrompt?: string;
  loadingTextSwitches?: string | string[];
  showInAgentMenu?: boolean; // Whether to show this agent in the agent selector menu (default: true)
  renderComponents?: Array<Partial<FormField> & {
    id: string;
    name: string;
    component: string;
    aiAgentId?: string; // For AI agent integration (e.g., professional-writing)
    [key: string]: any; // Allow additional properties from JSON
  }>;
  preloadRoutes?: Array<{
    route: string;
    title: string;
    description: string;
    method?: 'GET' | 'POST';
    jsonPath?: string;
    body?: any;
    queryParameters?: Record<string, string>;
    outputFormat?: 'json' | 'string' | 'toon'; // Format for output: json (default), string, or toon
    includedFields?: string[]; // Filter response to only include these fields (e.g., ["id", "description", "plural_name"])
  }>;
  nextAction: {
    label: string;
    icon?: string;
    route: string;
  };
  responseCards?: ResponseCardConfig[];
  // Orchestrator-specific fields
  orchestrationRules?: OrchestrationRule[];
  complexityThreshold?: number; // 0-1, when to create todos (default: 0.5)
}

export interface OrchestrationRule {
  condition: string; // Condition to evaluate (e.g., "if output contains 'summary'")
  thenAgentId: string; // Agent to call if condition is true
  thenAgentType?: string; // Optional agent type override
  inputMapping?: Record<string, string>; // Map output fields to input fields
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

export interface VideoUsage {
  duration_seconds: number;
  estimated_cost?: {
    unit: string;
    irt: number;
    exchange_rate: number;
  } | null;
}

export interface AiBuilderResponseData {
  response: string;
  format: 'json' | 'string' | 'table' | 'image' | 'video' | 'graph' | 'search-results' | 'search-card';
  tokenUsage: TokenUsage | null;
  videoUsage?: VideoUsage | null; // Video usage (duration and cost) for video generation agents
  timing?: {
    responseTime: number; // Time to receive response in milliseconds
    duration: number; // Total duration in milliseconds
  };
  warnings?: string[]; // Warnings for graph validation issues (non-blocking)
  searchResults?: Array<{
    title: string;
    url: string;
    snippet: string;
    date?: string;
  }>; // Search results for search-results format
  agent: {
    id: string;
    label: string;
    description: string;
    requiredOutputFormat: 'json' | 'string' | 'table' | 'image' | 'video' | 'graph' | 'search-results' | 'search-card';
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
  body?: Record<string, any>; // Parameters with sectionId: "body"
  extra_body?: Record<string, any>; // Parameters with sectionId: "extra"
  formValues?: Record<string, any>; // Form values to build the full prompt with metadata (language instruction, etc.)
  imageType?: string; // Image type to generate (e.g., "infographic", "creative", etc.) - if set and not "none", will generate image in parallel
  summarizeBeforeSearchImage?: boolean; // Whether to summarize prompt before sending to search and image generation (default: true)
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

