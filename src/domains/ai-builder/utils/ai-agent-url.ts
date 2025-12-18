/**
 * AI Agent URL Configuration
 * Centralized configuration for AI agent API endpoints
 * These URLs can be overridden via environment variables
 */

export type AgentType = 'chat' | 'voice-transcription' | 'image-generation' | 'video-generation' | 'graph-generation' | 'orchestrator';

export interface AiAgentUrlConfig {
  LLM_API_URL: string;
  LLM_VOICE_TRANSCRIBE_URL: string;
  LLM_IMAGE_GENERATION_URL: string;
  LLM_VIDEO_GENERATION_URL: string;
}

/**
 * Default AI agent URLs
 */
const DEFAULT_AI_AGENT_URLS: AiAgentUrlConfig = {
  LLM_API_URL: 'https://api.avalai.ir/v1/chat/completions',
  LLM_VOICE_TRANSCRIBE_URL: 'https://api.avalai.ir/v1/audio/transcriptions',
  LLM_IMAGE_GENERATION_URL: 'https://api.avalai.ir/v1/images/generations',
  LLM_VIDEO_GENERATION_URL: 'https://api.avalai.ir/v1/videos',
};

/**
 * Get AI agent URL configuration
 * Checks environment variables first, then falls back to defaults
 */
export function getAiAgentUrls(): AiAgentUrlConfig {
  return {
    LLM_API_URL: process.env.LLM_API_URL || DEFAULT_AI_AGENT_URLS.LLM_API_URL,
    LLM_VOICE_TRANSCRIBE_URL: process.env.LLM_VOICE_TRANSCRIBE_URL || DEFAULT_AI_AGENT_URLS.LLM_VOICE_TRANSCRIBE_URL,
    LLM_IMAGE_GENERATION_URL: process.env.LLM_IMAGE_GENERATION_URL || DEFAULT_AI_AGENT_URLS.LLM_IMAGE_GENERATION_URL,
    LLM_VIDEO_GENERATION_URL: process.env.LLM_VIDEO_GENERATION_URL || DEFAULT_AI_AGENT_URLS.LLM_VIDEO_GENERATION_URL,
  };
}

/**
 * Get API URL for a specific agent type
 */
export function getApiUrlForAgentType(agentType: AgentType): string {
  const urls = getAiAgentUrls();
  
  const URL_MAP: Record<AgentType, string> = {
    'chat': urls.LLM_API_URL,
    'voice-transcription': urls.LLM_VOICE_TRANSCRIBE_URL,
    'image-generation': urls.LLM_IMAGE_GENERATION_URL,
    'video-generation': urls.LLM_VIDEO_GENERATION_URL,
    'graph-generation': urls.LLM_API_URL, // Graph generation uses chat API
    'orchestrator': urls.LLM_API_URL, // Orchestrator uses chat API
  };

  return URL_MAP[agentType] || URL_MAP['chat'];
}

