/**
 * AI Agent Utilities
 * Generic router that routes to appropriate utility based on agent type
 */

import { processChatRequest } from './ai-chat-utils';
import { processVoiceRequest } from './ai-voice-utils';
import { processImageRequest } from './ai-image-utils';
import { processVideoRequest } from './ai-video-utils';
import { processGraphRequest } from './ai-graph-utils';
import { processOrchestratorRequest } from './ai-orchestrator-utils';
import { getApiUrlForAgentType, AgentType } from './ai-agent-url';

export type { AgentType };

export interface AgentRequestData {
  userPrompt?: string;
  formValues?: Record<string, any>;
  previousAiResponse?: string;
  previousUserPrompt?: string;
  annotations?: Array<{
    schemaId: string;
    schemaName: string;
    annotations: Array<{ id: string; label: string }>;
  }>;
  file?: File | Blob;
  language?: string;
  prompt?: string;
  size?: string;
  responseFormat?: 'url' | 'b64_json';
  body?: Record<string, any>; // Parameters with sectionId: "body"
  extra_body?: Record<string, any>; // Parameters with sectionId: "extra"
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  validationErrors?: Array<{ field: string; message: string }>;
}

// Re-export getApiUrlForAgentType for backward compatibility
export { getApiUrlForAgentType };

/**
 * Process AI agent request - routes to appropriate utility based on agent type
 */
export async function processAiAgent(
  agent: any,
  requestData: AgentRequestData,
  baseUrl?: string
): Promise<AgentResponse> {
  const agentType: AgentType = agent.agentType || 'chat';

  switch (agentType) {
    case 'chat':
      // Check if chat agent requires graph output format
      if (agent.requiredOutputFormat === 'graph') {
        return await processGraphRequest(agent, requestData, baseUrl);
      }
      return await processChatRequest(agent, requestData, baseUrl);
    
    case 'voice-transcription':
      return await processVoiceRequest(agent, requestData);
    
    case 'image-generation':
      return await processImageRequest(agent, requestData, baseUrl);
    
    case 'video-generation':
      return await processVideoRequest(agent, requestData);
    
    case 'graph-generation':
      return await processGraphRequest(agent, requestData, baseUrl);
    
    case 'orchestrator':
      return await processOrchestratorRequest(agent.id, requestData, baseUrl);
    
    default:
      return {
        success: false,
        error: `Unsupported agent type: ${agentType}`
      };
  }
}

