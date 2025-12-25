/**
 * AI API Caller
 * Centralized API calling utilities for all AI agent types
 * Handles error handling, timeout, abort signals, and response parsing
 */

import { getApiUrlForAgentType } from './ai-agent-url';
import { getApiKey, sanitizeErrorMessage, safeJsonParse } from './ai-security-utils';
import { createAbortController, parseErrorResponse, buildTimingInfo } from './ai-common-utils';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType, LOG_CONFIG } from '@/gradian-ui/shared/configs/log-config';
import { truncateText } from '@/domains/chat/utils/text-utils';
import { extractJson } from '@/gradian-ui/shared/utils/json-extractor';
import { cleanMarkdownResponse } from './ai-security-utils';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Generic API caller with error handling, timeout, and abort signals
 */
async function callGenericApi(params: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  signal?: AbortSignal;
}): Promise<{
  success: boolean;
  data?: any;
  error?: string;
  response?: Response;
}> {
  const {
    url,
    method = 'POST',
    headers = {},
    body,
    timeout = 120000, // 120 seconds default
    signal,
  } = params;

  // Create abort controller if not provided
  const { controller, timeoutId } = signal
    ? { controller: { signal }, timeoutId: null }
    : createAbortController(timeout);

  const finalSignal = signal || controller.signal;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: finalSignal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      if (isDevelopment) {
        loggingCustom(LogType.INFRA_LOG, 'error', `API error: ${errorMessage}`);
      }
      return {
        success: false,
        error: sanitizeErrorMessage(errorMessage, isDevelopment),
        response,
      };
    }

    // Check content-type header
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json') && !contentType.includes('text/json')) {
      const responseText = await response.text();
      loggingCustom(
        LogType.INFRA_LOG,
        'error',
        `API returned non-JSON content. Content-Type: ${contentType}. Response preview: ${truncateText(responseText, 500)}`
      );
      return {
        success: false,
        error: `AI service returned unexpected content type (${contentType}). Please check API endpoint configuration.`,
        response,
      };
    }

    // Parse JSON response
    const responseText = await response.text();
    const parseResult = safeJsonParse(responseText);

    if (!parseResult.success || !parseResult.data) {
      loggingCustom(
        LogType.INFRA_LOG,
        'error',
        `Failed to parse API response. Error: ${parseResult.error}. Response preview: ${truncateText(responseText, 500)}`
      );
      return {
        success: false,
        error: parseResult.error || 'Invalid response format from AI service.',
        response,
      };
    }

    return {
      success: true,
      data: parseResult.data,
      response,
    };
  } catch (fetchError) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Handle timeout errors
    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      if (isDevelopment) {
        loggingCustom(LogType.INFRA_LOG, 'error', `Request timeout: ${fetchError.message}`);
      }
      return {
        success: false,
        error: sanitizeErrorMessage('Request timeout', isDevelopment),
      };
    }

    // Re-throw other errors
    throw fetchError;
  }
}

/**
 * Call chat/graph API (OpenAI-compatible format)
 */
export async function callChatApi(params: {
  agent: any;
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  responseFormat?: { type: string };
  timeout?: number;
  signal?: AbortSignal;
}): Promise<{
  success: boolean;
  data?: any;
  error?: string;
  tokenUsage?: any;
  timing?: any;
}> {
  const {
    agent,
    systemPrompt,
    userPrompt,
    model,
    responseFormat,
    timeout = 120000,
    signal,
  } = params;

  // Get API key
  const apiKeyResult = getApiKey();
  if (!apiKeyResult.key) {
    return {
      success: false,
      error: apiKeyResult.error || 'LLM_API_KEY is not configured',
    };
  }

  // Get API URL
  const apiUrl = getApiUrlForAgentType(agent.agentType || 'chat');
  const finalModel = model || agent.model;

  // Build request body
  const requestBody: any = {
    model: finalModel,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  };

  // Add response format if specified
  if (responseFormat) {
    requestBody.response_format = responseFormat;
  }

  // Log request body
  loggingCustom(
    LogType.AI_BODY_LOG,
    'info',
    `Chat Completion Request to ${apiUrl}: ${JSON.stringify(requestBody, null, 2)}`
  );

  const startTime = Date.now();

  // Call API
  const result = await callGenericApi({
    url: apiUrl,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKeyResult.key}`,
    },
    body: requestBody,
    timeout,
    signal,
  });

  if (!result.success) {
    return result;
  }

  const data = result.data!;
  const timing = buildTimingInfo(startTime);

  // Extract content
  const aiResponseContent = data.choices?.[0]?.message?.content || '';

  // Log AI response if enabled
  if (LOG_CONFIG[LogType.AI_RESPONSE_LOG]) {
    const responsePreview = truncateText(aiResponseContent, 1000);
    loggingCustom(
      LogType.AI_RESPONSE_LOG,
      'info',
      `AI Response from ${finalModel} (${timing.duration}ms):\n${responsePreview}`
    );
  }

  if (!aiResponseContent) {
    return {
      success: false,
      error: 'No response content from AI',
    };
  }

  // Extract token usage
  const tokenUsage = data.usage
    ? {
        prompt_tokens: data.usage.prompt_tokens || 0,
        completion_tokens: data.usage.completion_tokens || 0,
        total_tokens: data.usage.total_tokens || 0,
      }
    : null;

  // Process response based on required output format
  let processedResponse = aiResponseContent;
  if (agent.requiredOutputFormat === 'json' || agent.requiredOutputFormat === 'table' || agent.requiredOutputFormat === 'search-results' || agent.requiredOutputFormat === 'search-card') {
    const extractedJson = extractJson(aiResponseContent);
    if (extractedJson) {
      processedResponse = extractedJson;
    } else {
      return {
        success: false,
        error: 'Failed to extract valid JSON from AI response',
      };
    }
  } else if (agent.requiredOutputFormat === 'string') {
    processedResponse = cleanMarkdownResponse(aiResponseContent);
  }

  return {
    success: true,
    data: processedResponse,
    tokenUsage,
    timing,
  };
}

/**
 * Call image generation API
 */
export async function callImageApi(params: {
  agent: any;
  prompt: string;
  model?: string;
  bodyParams?: Record<string, any>;
  extraBody?: Record<string, any>;
  timeout?: number;
  signal?: AbortSignal;
}): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const {
    agent,
    prompt,
    model,
    bodyParams = {},
    extraBody = {},
    timeout = 60000,
    signal,
  } = params;

  // Get API key
  const apiKeyResult = getApiKey();
  if (!apiKeyResult.key) {
    return {
      success: false,
      error: apiKeyResult.error || 'LLM_API_KEY is not configured',
    };
  }

  // Get API URL
  const imagesApiUrl = getApiUrlForAgentType('image-generation');
  const finalModel = model || agent.model || 'flux-1.1-pro';

  // Build request body - exclude imageType and prompt from bodyParams
  const { imageType: _, prompt: __, ...bodyParamsWithoutImageTypeAndPrompt } = bodyParams;
  const requestBody: Record<string, any> = {
    model: finalModel,
    prompt,
    ...bodyParamsWithoutImageTypeAndPrompt,
    extra_body: extraBody,
  };

  // Log request body
  loggingCustom(
    LogType.AI_BODY_LOG,
    'info',
    `Image Generation Request to ${imagesApiUrl}: ${JSON.stringify(requestBody, null, 2)}`
  );

  // Call API
  const result = await callGenericApi({
    url: imagesApiUrl,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKeyResult.key}`,
    },
    body: requestBody,
    timeout,
    signal,
  });

  if (!result.success) {
    return result;
  }

  const data = result.data!;

  // Check for error in response
  if (data.error) {
    return {
      success: false,
      error: `Image generation API error: ${typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}`,
    };
  }

  // Check if data.data is explicitly an empty array
  if (data.data && Array.isArray(data.data) && data.data.length === 0) {
    const errorMessage = data.message || data.error_message || 'Image generation returned empty data array.';
    return {
      success: false,
      error: errorMessage,
    };
  }

  // Extract image data - handle different response structures
  let imageData: any = null;

  // Structure 1: data.data[0] (OpenAI-style)
  if (data.data && Array.isArray(data.data) && data.data.length > 0) {
    imageData = data.data[0];
    if (imageData.b64_json && Array.isArray(imageData.b64_json) && imageData.b64_json.length === 0) {
      imageData.b64_json = null;
    }
  }
  // Structure 2: data.candidates?.[0]?.content?.parts?.[0] (Gemini-style)
  else if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
    const candidate = data.candidates[0];
    if (candidate.content?.parts && Array.isArray(candidate.content.parts) && candidate.content.parts.length > 0) {
      const part = candidate.content.parts[0];
      if (part.inlineData?.data) {
        imageData = {
          b64_json: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
        };
      } else if (part.url) {
        imageData = { url: part.url };
      }
    }
  }
  // Structure 3: Direct image object in data
  else if (data.image && (data.image.url || data.image.b64_json || data.image.data)) {
    imageData = data.image;
  }
  // Structure 4: Direct base64 data
  else if (data.b64_json || data.data) {
    imageData = {
      b64_json: data.b64_json || data.data,
    };
  }

  if (!imageData || (!imageData.url && !imageData.b64_json && !imageData.data)) {
    const errorDetails = isDevelopment
      ? ` Response structure: ${JSON.stringify(Object.keys(data || {})).substring(0, 200)}`
      : '';
    return {
      success: false,
      error: `No image data in response.${errorDetails}`,
    };
  }

  return {
    success: true,
    data: imageData,
  };
}

/**
 * Call video generation API
 */
export async function callVideoApi(params: {
  agent: any;
  prompt: string;
  model?: string;
  bodyParams?: Record<string, any>;
  timeout?: number;
  signal?: AbortSignal;
}): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const {
    agent,
    prompt,
    model,
    bodyParams = {},
    timeout = 120000,
    signal,
  } = params;

  // Get API key
  const apiKeyResult = getApiKey();
  if (!apiKeyResult.key) {
    return {
      success: false,
      error: apiKeyResult.error || 'LLM_API_KEY is not configured',
    };
  }

  // Get API URL
  const videoApiUrl = getApiUrlForAgentType('video-generation');
  const finalModel = model || agent.model;

  // Build request body
  const requestBody: Record<string, any> = {
    model: finalModel,
    prompt,
    ...bodyParams,
  };

  // Log request body
  loggingCustom(
    LogType.AI_BODY_LOG,
    'info',
    `Video Generation Request to ${videoApiUrl}: ${JSON.stringify(requestBody, null, 2)}`
  );

  // Call API
  const result = await callGenericApi({
    url: videoApiUrl,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKeyResult.key}`,
    },
    body: requestBody,
    timeout,
    signal,
  });

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Call voice transcription API
 */
export async function callVoiceApi(params: {
  agent: any;
  file: File;
  language?: string;
  model?: string;
  timeout?: number;
  signal?: AbortSignal;
}): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const {
    agent,
    file,
    language,
    model,
    timeout = 60000,
    signal,
  } = params;

  // Get API key
  const apiKeyResult = getApiKey();
  if (!apiKeyResult.key) {
    return {
      success: false,
      error: apiKeyResult.error || 'LLM_API_KEY is not configured',
    };
  }

  // Get API URL
  const voiceApiUrl = getApiUrlForAgentType('voice-transcription');
  const finalModel = model || agent.model;

  // Build FormData
  const formData = new FormData();
  formData.append('file', file);
  if (language) {
    formData.append('language', language);
  }
  if (finalModel) {
    formData.append('model', finalModel);
  }

  // Log request
  loggingCustom(
    LogType.AI_BODY_LOG,
    'info',
    `Voice Transcription Request to ${voiceApiUrl}: file=${file.name}, language=${language || 'auto'}, model=${finalModel}`
  );

  // Create abort controller if not provided
  const { controller, timeoutId } = signal
    ? { controller: { signal }, timeoutId: null }
    : createAbortController(timeout);

  const finalSignal = signal || controller.signal;

  try {
    const response = await fetch(voiceApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKeyResult.key}`,
      },
      body: formData,
      signal: finalSignal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      if (isDevelopment) {
        loggingCustom(LogType.INFRA_LOG, 'error', `Voice API error: ${errorMessage}`);
      }
      return {
        success: false,
        error: sanitizeErrorMessage(errorMessage, isDevelopment),
      };
    }

    // Parse JSON response
    const responseText = await response.text();
    const parseResult = safeJsonParse(responseText);

    if (!parseResult.success || !parseResult.data) {
      return {
        success: false,
        error: parseResult.error || 'Invalid response format from voice transcription service',
      };
    }

    return {
      success: true,
      data: parseResult.data,
    };
  } catch (fetchError) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      if (isDevelopment) {
        loggingCustom(LogType.INFRA_LOG, 'error', `Request timeout: ${fetchError.message}`);
      }
      return {
        success: false,
        error: sanitizeErrorMessage('Request timeout', isDevelopment),
      };
    }

    throw fetchError;
  }
}

/**
 * Call search API
 */
export async function callSearchApi(params: {
  query: string;
  search_tool_name?: string;
  max_results?: number;
  timeout?: number;
  signal?: AbortSignal;
}): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const {
    query,
    search_tool_name = 'parallel_ai-search',
    max_results = 5,
    timeout = 60000,
    signal,
  } = params;

  // Get API key
  const apiKeyResult = getApiKey();
  if (!apiKeyResult.key) {
    return {
      success: false,
      error: apiKeyResult.error || 'LLM_API_KEY is not configured',
    };
  }

  // Get base search API URL and construct URL with search_tool_name in path
  const baseSearchUrl = getApiUrlForAgentType('search');
  const searchApiUrl = `${baseSearchUrl}/${search_tool_name}`;

  // Clean the query - remove common prefixes that might be added by form building
  const cleanQuery = query
    .replace(/^(?:User Prompt|Prompt|User Prompt:)\s*:?\s*/i, '')
    .trim();

  // Build request body (without search_tool_name, as it's in the URL)
  const requestBody = {
    query: cleanQuery,
    max_results,
  };

  // Log request body
  loggingCustom(
    LogType.AI_BODY_LOG,
    'info',
    `Search Request to ${searchApiUrl}: ${JSON.stringify(requestBody, null, 2)}`
  );

  // Create abort controller if not provided
  const { controller, timeoutId } = signal
    ? { controller: { signal }, timeoutId: null }
    : createAbortController(timeout);

  const finalSignal = signal || controller.signal;

  try {
    const response = await fetch(searchApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKeyResult.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: finalSignal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      if (isDevelopment) {
        loggingCustom(LogType.INFRA_LOG, 'error', `Search API error: ${errorMessage}`);
      }
      return {
        success: false,
        error: sanitizeErrorMessage(errorMessage, isDevelopment),
      };
    }

    // Parse JSON response
    const responseText = await response.text();
    const parseResult = safeJsonParse(responseText);

    if (!parseResult.success || !parseResult.data) {
      return {
        success: false,
        error: parseResult.error || 'Invalid response format from search service',
      };
    }

    return {
      success: true,
      data: parseResult.data,
    };
  } catch (fetchError) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      if (isDevelopment) {
        loggingCustom(LogType.INFRA_LOG, 'error', `Request timeout: ${fetchError.message}`);
      }
      return {
        success: false,
        error: sanitizeErrorMessage('Request timeout', isDevelopment),
      };
    }

    throw fetchError;
  }
}

