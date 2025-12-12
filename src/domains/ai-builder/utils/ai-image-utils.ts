/**
 * AI Image Utilities
 * Handles image generation requests
 */

import { AgentRequestData, AgentResponse } from './ai-agent-utils';
import { getApiUrlForAgentType } from './ai-agent-url';
import { extractParametersBySectionId, parseUserPromptToFormValues } from './ai-shared-utils';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';
import {
  sanitizePrompt,
  getApiKey,
  sanitizeErrorMessage,
  safeJsonParse,
  validateImageSize,
  validateOutputFormat,
} from './ai-security-utils';
import {
  createAbortController,
  parseErrorResponse,
  buildTimingInfo,
  validateAgentConfig,
} from './ai-common-utils';

/**
 * Process image generation request
 */
export async function processImageRequest(
  agent: any,
  requestData: AgentRequestData
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

    // Security: Get API key with validation
    const apiKeyResult = getApiKey();
    if (!apiKeyResult.key) {
      return {
        success: false,
        error: apiKeyResult.error || 'LLM_API_KEY is not configured',
      };
    }
    const apiKey = apiKeyResult.key;

    // Use body and extra_body from requestData if provided, otherwise calculate from formValues
    let bodyParams: Record<string, any> = {};
    let extraParams: Record<string, any> = {};
    let promptParams: Record<string, any> = {};

    if (requestData.body || requestData.extra_body) {
      // Use provided body and extra_body
      bodyParams = requestData.body || {};
      extraParams = requestData.extra_body || {};
      
      // If formValues are provided, extract prompt params from fields that are not body/extra
      if (requestData.formValues) {
        const allParams = extractParametersBySectionId(agent, requestData.formValues);
        promptParams = allParams.prompt;
      }
    } else {
      // Fallback: If formValues are not provided but userPrompt is, parse userPrompt to extract formValues
      let parsedFormValues = requestData.formValues;
      if (!parsedFormValues && requestData.userPrompt) {
        parsedFormValues = parseUserPromptToFormValues(agent, requestData.userPrompt);
      }

      // Extract parameters from formValues based on sectionId
      if (parsedFormValues) {
        const params = extractParametersBySectionId(agent, parsedFormValues);
        bodyParams = params.body;
        extraParams = params.extra;
        promptParams = params.prompt;
      }
    }

    // Build prompt from promptParams (fields without sectionId or with other sectionId)
    // Concatenate all prompt fields into a single string
    let cleanPrompt = '';
    if (Object.keys(promptParams).length > 0) {
      // If we have prompt params, concatenate them in order
      const promptParts: string[] = [];
      // Get components that are in promptParams, sorted by order
      const promptComponents = agent.renderComponents
        .filter((comp: any) => {
          const fieldName = comp.name || comp.id;
          return promptParams[fieldName] !== undefined;
        })
        .sort((a: any, b: any) => (a.order || 999) - (b.order || 999));
      
      promptComponents.forEach((comp: any) => {
        const fieldName = comp.name || comp.id;
        const value = promptParams[fieldName];
        if (value) {
          const label = comp.label || fieldName;
          promptParts.push(`${label}: ${value}`);
        }
      });
      cleanPrompt = promptParts.join('\n\n');
    }

    // For image generation, prompt should come from bodyParams.prompt if available
    // Otherwise fallback to userPrompt or promptParams
    if (!cleanPrompt) {
      // Try to get prompt from bodyParams first (for image generation)
      if (bodyParams.prompt) {
        cleanPrompt = bodyParams.prompt;
      } else {
        // Fallback to userPrompt
        cleanPrompt = requestData.userPrompt || requestData.prompt || '';
        // Clean up if it contains field labels
        if (typeof cleanPrompt === 'string') {
          // Remove field labels if present (for backward compatibility)
          cleanPrompt = cleanPrompt.replace(/^(?:Prompt|User Prompt):\s*/i, '');
        }
      }
    }

    // Security: Sanitize and validate prompt
    if (!cleanPrompt || typeof cleanPrompt !== 'string') {
      return {
        success: false,
        error: 'prompt is required and must be a string',
      };
    }

    cleanPrompt = sanitizePrompt(cleanPrompt);
    if (!cleanPrompt) {
      return {
        success: false,
        error: 'Prompt cannot be empty after sanitization',
      };
    }

    // Get model from agent config
    const model = agent.model || 'flux-1.1-pro';

    // Security: Validate size if present in bodyParams
    if (bodyParams.size) {
      const sizeValidation = validateImageSize(bodyParams.size);
      if (!sizeValidation.valid) {
        return {
          success: false,
          error: sizeValidation.error || 'Invalid size',
        };
      }
    }

    // Security: Validate response format if present in extraParams
    // Note: The API expects "png" in the request, not "b64_json"
    if (extraParams.output_format) {
      const formatValidation = validateOutputFormat(extraParams.output_format);
      if (!formatValidation.valid) {
        return {
          success: false,
          error: formatValidation.error || 'Invalid output format',
        };
      }
    }

    // Get API URL based on agent type
    const imagesApiUrl = getApiUrlForAgentType('image-generation');

    // Track timing
    const startTime = Date.now();

    // Performance: Use shared AbortController utility
    const { controller, timeoutId } = createAbortController(60000); // 60 seconds

    try {
      // Build request body - model, prompt, and all body parameters
      const requestBody: Record<string, any> = {
        model,
        prompt: cleanPrompt,
        ...bodyParams, // Include all fields with sectionId: "body"
      };

      // Build extra_body - all parameters with sectionId: "extra"
      const extraBody: Record<string, any> = {
        ...extraParams, // Include all fields with sectionId: "extra"
      };

      // Build final request body for logging (mask sensitive data)
      const finalRequestBody = {
        ...requestBody,
        extra_body: extraBody,
      };

      // Log request body
      loggingCustom(
        LogType.REQUEST_BODY,
        'info',
        `Image Generation Request to ${imagesApiUrl}: ${JSON.stringify(finalRequestBody, null, 2)}`
      );

      // Call Images API with extra_body
      const response = await fetch(imagesApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(finalRequestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Security: Use shared error parsing utility
        const errorMessage = await parseErrorResponse(response);
        
        if (isDevelopment) {
          console.error('Images API error:', errorMessage);
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
          error: parseResult.error || 'Invalid response format from image generation service',
        };
      }

      const data = parseResult.data;

      // Extract image data
      const imageData = data.data?.[0];
      if (!imageData) {
        return {
          success: false,
          error: 'No image data in response',
        };
      }

      // Return image URL or base64 content
      const result = {
        url: imageData.url || null,
        b64_json: imageData.b64_json || null,
        revised_prompt: imageData.revised_prompt || null,
      };

      // Performance: Use shared timing utility
      const timing = buildTimingInfo(startTime);

      // Format response data for AiBuilderResponseData structure
      const responseData = {
        image: result,
        format: extraParams.output_format || 'url',
        ...bodyParams, // Include all body parameters in response
        model,
        timing,
      };

      return {
        success: true,
        data: {
          response: JSON.stringify(responseData, null, 2), // Stringify for consistency with other agent types
          format: 'image' as const,
          tokenUsage: null, // Image generation doesn't use tokens
          timing,
          agent: {
            id: agent.id,
            label: agent.label,
            description: agent.description,
            requiredOutputFormat: 'image' as const,
            nextAction: agent.nextAction,
          },
        },
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle timeout errors
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        if (isDevelopment) {
          console.error('Request timeout in image generation API:', fetchError);
        }
        return {
          success: false,
          error: sanitizeErrorMessage('Request timeout', isDevelopment),
        };
      }

      throw fetchError;
    }
  } catch (error) {
    if (isDevelopment) {
      console.error('Error in image generation request:', error);
    }
    return {
      success: false,
      error: sanitizeErrorMessage(error, isDevelopment),
    };
  }
}

