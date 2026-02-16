/**
 * AI Agent URL Configuration
 * Centralized configuration for AI agent API endpoints
 * These URLs can be overridden via environment variables
 * Base host: api.avalai.ir (demo) | aval-api.app.cinnagen.com (live)
 */

import { DEMO_MODE } from '@/gradian-ui/shared/configs/env-config';

export type AgentType = 'chat' | 'voice-transcription' | 'image-generation' | 'video-generation' | 'graph-generation' | 'orchestrator' | 'search';

export interface AiAgentUrlConfig {
  LLM_API_URL: string;
  LLM_VOICE_TRANSCRIBE_URL: string;
  LLM_IMAGE_GENERATION_URL: string;
  LLM_VIDEO_GENERATION_URL: string;
  LLM_SEARCH_URL: string;
}

const DEMO_BASE = 'https://api.avalai.ir';
const LIVE_BASE = 'https://aval-api.app.cinnagen.com';

function getDefaultUrls(): AiAgentUrlConfig {
  const base = DEMO_MODE ? DEMO_BASE : LIVE_BASE;
  return {
    LLM_API_URL: `${base}/v1/chat/completions`,
    LLM_VOICE_TRANSCRIBE_URL: `${base}/v1/audio/transcriptions`,
    LLM_IMAGE_GENERATION_URL: `${base}/v1/images/generations`,
    LLM_VIDEO_GENERATION_URL: `${base}/v1/videos`,
    LLM_SEARCH_URL: `${base}/v1/search`,
  };
}

/**
 * Get AI agent URL configuration
 * Checks environment variables first, then falls back to defaults (demo: api.avalai.ir, live: aval-api.app.cinnagen.com)
 */
export function getAiAgentUrls(): AiAgentUrlConfig {
  const defaults = getDefaultUrls();
  return {
    LLM_API_URL: process.env.LLM_API_URL || defaults.LLM_API_URL,
    LLM_VOICE_TRANSCRIBE_URL: process.env.LLM_VOICE_TRANSCRIBE_URL || defaults.LLM_VOICE_TRANSCRIBE_URL,
    LLM_IMAGE_GENERATION_URL: process.env.LLM_IMAGE_GENERATION_URL || defaults.LLM_IMAGE_GENERATION_URL,
    LLM_VIDEO_GENERATION_URL: process.env.LLM_VIDEO_GENERATION_URL || defaults.LLM_VIDEO_GENERATION_URL,
    LLM_SEARCH_URL: process.env.LLM_SEARCH_URL || defaults.LLM_SEARCH_URL,
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
    'search': urls.LLM_SEARCH_URL, // Search API
  };

  return URL_MAP[agentType] || URL_MAP['chat'];
}

