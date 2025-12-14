/**
 * AI Chat Utilities
 * Handles chat completion requests
 */

import { extractJson } from '@/gradian-ui/shared/utils/json-extractor';
import { preloadRoutes } from '@/gradian-ui/shared/utils/preload-routes';
import { AgentRequestData, AgentResponse } from './ai-agent-utils';
import { getApiUrlForAgentType } from './ai-agent-url';
import { validateAgentFormFields, buildStandardizedPrompt } from './prompt-builder';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';
import {
  sanitizePrompt,
  getApiKey,
  sanitizeErrorMessage,
  safeJsonParse,
  validateAgentId,
} from './ai-security-utils';
import {
  createAbortController,
  parseErrorResponse,
  buildTimingInfo,
  validateAgentConfig,
} from './ai-common-utils';
import fs from 'fs';
import path from 'path';

// Performance: Cache AI models to avoid repeated file reads
let cachedModels: any[] | null = null;
let modelsCacheTime: number = 0;
const MODELS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load AI models from JSON file with caching
 * Performance: Cache models to avoid repeated file system operations
 */
function loadAiModels(): any[] {
  const now = Date.now();
  
  // Return cached models if still valid
  if (cachedModels !== null && (now - modelsCacheTime) < MODELS_CACHE_TTL) {
    return cachedModels;
  }

  try {
    const dataPath = path.join(process.cwd(), 'data', 'ai-models.json');
    
    // Security: Validate path to prevent directory traversal
    const resolvedPath = path.resolve(dataPath);
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!resolvedPath.startsWith(dataDir)) {
      console.error('Invalid models file path');
      return [];
    }
    
    if (!fs.existsSync(resolvedPath)) {
      cachedModels = [];
      modelsCacheTime = now;
      return cachedModels;
    }
    
    const fileContents = fs.readFileSync(resolvedPath, 'utf8');
    
    // Security: Use safe JSON parsing with size limits
    const parseResult = safeJsonParse(fileContents, 1 * 1024 * 1024); // 1MB max for models file
    if (!parseResult.success || !Array.isArray(parseResult.data)) {
      console.error('Invalid models file format');
      return [];
    }
    
    cachedModels = parseResult.data;
    modelsCacheTime = now;
    return cachedModels;
  } catch (error) {
    console.error('Error loading AI models:', error);
    return [];
  }
}

/**
 * Calculate pricing for token usage
 */
function calculatePricing(
  modelId: string,
  promptTokens: number,
  completionTokens: number
): {
  inputPricePer1M: number;
  outputPricePer1M: number;
  inputPrice: number;
  outputPrice: number;
  totalPrice: number;
} | null {
  const models = loadAiModels();
  const model = models.find((m: any) => m.id === modelId);

  if (!model || !model.pricing) {
    return null;
  }

  const inputPricePerMillion = model.pricing.input || 0;
  const outputPricePerMillion = model.pricing.output || 0;

  // Calculate prices (pricing is per 1 million tokens)
  const inputPrice = (promptTokens / 1_000_000) * inputPricePerMillion;
  const outputPrice = (completionTokens / 1_000_000) * outputPricePerMillion;
  const totalPrice = inputPrice + outputPrice;

  return {
    inputPricePer1M: inputPricePerMillion,
    outputPricePer1M: outputPricePerMillion,
    inputPrice,
    outputPrice,
    totalPrice,
  };
}

/**
 * Process chat request
 */
export async function processChatRequest(
  agent: any,
  requestData: AgentRequestData,
  baseUrl?: string
): Promise<AgentResponse> {
  const isDevelopment = process.env.NODE_ENV === 'development';

  try {
    // Security: Validate agent configuration
    const agentValidation = validateAgentConfig(agent);
    if (!agentValidation.valid) {
      return {
        success: false,
        error: agentValidation.error || 'Invalid agent configuration',
      };
    }

    // Validate form fields if renderComponents exist
    if (agent.renderComponents && requestData.formValues) {
      const validationErrors = validateAgentFormFields(agent, requestData.formValues);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: 'Validation failed',
          validationErrors,
        };
      }
    }

    // Build user prompt from form values or use provided userPrompt
    let userPrompt = requestData.userPrompt || '';
    
    if (requestData.formValues && agent.renderComponents) {
      const builtPrompt = buildStandardizedPrompt(agent, requestData.formValues);
      if (builtPrompt) {
        userPrompt = builtPrompt;
      }
    }

    // Security: Sanitize and validate prompt
    if (!userPrompt || typeof userPrompt !== 'string') {
      return {
        success: false,
        error: 'userPrompt is required and must be a string',
      };
    }

    userPrompt = sanitizePrompt(userPrompt);
    if (!userPrompt) {
      return {
        success: false,
        error: 'Prompt cannot be empty after sanitization',
      };
    }

    // Security: Get API key with validation
    const apiKeyResult = getApiKey();
    if (!apiKeyResult.key) {
      return {
        success: false,
        error: apiKeyResult.error || 'LLM_API_KEY is not configured',
      };
    }
    const apiKey = apiKeyResult.key;

    // Preload routes if configured
    let preloadedContext = '';
    if (agent.preloadRoutes && Array.isArray(agent.preloadRoutes) && agent.preloadRoutes.length > 0 && baseUrl) {
      try {
        preloadedContext = await preloadRoutes(agent.preloadRoutes, baseUrl);
      } catch (error) {
        console.error('Error preloading routes:', error);
        // Continue even if preload fails
      }
    }

    // Prepare system prompt with preloaded context
    const systemPrompt = (agent.systemPrompt || '') + preloadedContext;

    // Format annotations in TOON-like format and add to user prompt
    let finalUserPrompt = userPrompt;
    if (
      requestData.annotations &&
      Array.isArray(requestData.annotations) &&
      requestData.annotations.length > 0 &&
      requestData.previousAiResponse
    ) {
      // Format annotations in TOON-like structure
      const annotationSections = requestData.annotations.map((ann) => {
        const changes = ann.annotations.map((a) => `- ${a.label}`).join('\n');
        return `${ann.schemaName}\n\n${changes}`;
      }).join('\n\n');

      // Build the modification request in user prompt
      const modificationRequest = `\n\n---\n\n## MODIFY EXISTING SCHEMA(S)\n\nPlease update the following schema(s) based on the requested modifications. Apply ONLY the specified changes while keeping everything else exactly the same.\n\nRequested Modifications:\n\n${annotationSections}\n\nPrevious Schema(s):\n\`\`\`json\n${requestData.previousAiResponse}\n\`\`\`\n\n---\n\nIMPORTANT: You are the world's best schema editor. Apply these modifications precisely while preserving all other aspects of the schema(s). Output the complete updated schema(s) in the same format (single object or array).`;

      finalUserPrompt = userPrompt + modificationRequest;
    }

    // Prepare messages for LLM API
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      {
        role: 'user' as const,
        content: finalUserPrompt,
      },
    ];

    // Get model from agent config or use default
    const model = agent.model || 'gpt-4o-mini';

    // Get API URL based on agent type
    const apiUrl = getApiUrlForAgentType('chat');

    // Track timing
    const startTime = Date.now();

    // Performance: Use shared AbortController utility
    const { controller, timeoutId } = createAbortController(120000); // 120 seconds

    try {
      // Build request body
      const requestBody = {
        model,
        messages,
      };

      // Log request body
      loggingCustom(
        LogType.AI_BODY_LOG,
        'info',
        `Chat Completion Request to ${apiUrl}: ${JSON.stringify(requestBody, null, 2)}`
      );

      // Call LLM API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Security: Use shared error parsing utility
        const errorMessage = await parseErrorResponse(response);
        
        if (isDevelopment) {
          console.error('LLM API error:', errorMessage);
        }

        return {
          success: false,
          error: sanitizeErrorMessage(errorMessage, isDevelopment),
        };
      }

      // Security: Use safe JSON parsing
      const responseText = await response.text();
      const parseResult = safeJsonParse(responseText);
      
      if (!parseResult.success || !parseResult.data) {
        return {
          success: false,
          error: parseResult.error || 'Invalid response format from AI service',
        };
      }

      const data = parseResult.data;

      // Performance: Use shared timing utility
      const timing = buildTimingInfo(startTime);
      const aiResponseContent = data.choices?.[0]?.message?.content || '';

      if (!aiResponseContent) {
        return {
          success: false,
          error: 'No response content from AI',
        };
      }

      // Extract token usage information
      const promptTokens = data.usage?.prompt_tokens || 0;
      const completionTokens = data.usage?.completion_tokens || 0;
      const totalTokens = data.usage?.total_tokens || 0;

      // Calculate pricing
      const pricing = calculatePricing(model, promptTokens, completionTokens);

      const tokenUsage = data.usage
        ? {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens,
            pricing: pricing
              ? {
                  input_price_per_1m: pricing.inputPricePer1M || 0,
                  output_price_per_1m: pricing.outputPricePer1M || 0,
                  input_cost: pricing.inputPrice,
                  output_cost: pricing.outputPrice,
                  total_cost: pricing.totalPrice,
                  model_id: model,
                }
              : null,
          }
        : null;

      // Extract JSON if required output format is JSON
      let processedResponse = aiResponseContent;
      if (agent.requiredOutputFormat === 'json' || agent.requiredOutputFormat === 'table') {
        const extractedJson = extractJson(aiResponseContent);
        if (extractedJson) {
          processedResponse = extractedJson;
        } else {
          // If JSON extraction failed but format is required, return error
          return {
            success: false,
            error: 'Failed to extract valid JSON from AI response',
          };
        }
      }

      return {
        success: true,
        data: {
          response: processedResponse,
          format: agent.requiredOutputFormat === 'table' ? 'json' : agent.requiredOutputFormat || 'string',
          tokenUsage,
          timing,
          agent: {
            id: agent.id,
            label: agent.label,
            description: agent.description,
            requiredOutputFormat: agent.requiredOutputFormat,
            nextAction: agent.nextAction,
          },
        },
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle timeout errors specifically
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        if (isDevelopment) {
          console.error('Request timeout in AI chat request:', fetchError);
        }
        return {
          success: false,
          error: sanitizeErrorMessage('Request timeout', isDevelopment),
        };
      }

      // Re-throw to be caught by outer catch
      throw fetchError;
    }
  } catch (error) {
    if (isDevelopment) {
      console.error('Error in AI chat request:', error);
    }
    return {
      success: false,
      error: sanitizeErrorMessage(error, isDevelopment),
    };
  }
}

