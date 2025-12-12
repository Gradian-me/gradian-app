/**
 * AI Image Utilities
 * Handles image generation requests
 */

import { AgentRequestData, AgentResponse } from './ai-agent-utils';
import { getApiUrlForAgentType } from './ai-agent-url';
import { extractParametersBySectionId, parseUserPromptToFormValues } from './ai-shared-utils';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

/**
 * Process image generation request
 */
export async function processImageRequest(
  agent: any,
  requestData: AgentRequestData
): Promise<AgentResponse> {
  try {
    // Get API key from environment
    const apiKey = process.env.LLM_API_KEY || process.env.AVALAI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'LLM_API_KEY is not configured',
      };
    }

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

    if (!cleanPrompt || typeof cleanPrompt !== 'string') {
      return {
        success: false,
        error: 'prompt is required and must be a string',
      };
    }

    // Get model from agent config
    const model = agent.model || 'flux-1.1-pro';

    // Validate size if present in bodyParams
    if (bodyParams.size) {
      const validSizes = ['1024x1024', '1024x1792', '1792x1024'];
      if (!validSizes.includes(bodyParams.size)) {
        return {
          success: false,
          error: `Invalid size. Must be one of: ${validSizes.join(', ')}`,
        };
      }
    }

    // Validate response format if present in extraParams
    // Note: The API expects "png" in the request, not "b64_json"
    if (extraParams.output_format) {
      const validFormats = ['url', 'png'];
      if (!validFormats.includes(extraParams.output_format)) {
        return {
          success: false,
          error: `output_format must be either "url" or "png". Received: ${extraParams.output_format}`,
        };
      }
    }

    // Get API URL based on agent type
    const imagesApiUrl = getApiUrlForAgentType('image-generation');

    // Track timing
    const startTime = Date.now();

    // Create AbortController with timeout (60 seconds for image generation)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds

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

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Images API error:', errorText);

        // Try to parse error response
        let errorMessage = `Image generation failed: ${response.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData?.error?.message) {
            errorMessage = errorData.error.message;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (typeof errorData?.error === 'string') {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // Use generic message if parsing fails
        }

        return {
          success: false,
          error: errorMessage,
        };
      }

      const data = await response.json();

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

      // Format response data for AiBuilderResponseData structure
      const responseData = {
        image: result,
        format: extraParams.output_format || 'url',
        ...bodyParams, // Include all body parameters in response
        model,
        timing: {
          responseTime,
          duration: responseTime,
        },
      };

      return {
        success: true,
        data: {
          response: JSON.stringify(responseData, null, 2), // Stringify for consistency with other agent types
          format: 'image' as const,
          tokenUsage: null, // Image generation doesn't use tokens
          timing: {
            responseTime,
            duration: responseTime,
          },
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
        console.error('Request timeout in image generation API:', fetchError);
        return {
          success: false,
          error: 'Request timeout. The image generation service took too long to respond. Please try again.',
        };
      }

      throw fetchError;
    }
  } catch (error) {
    console.error('Error in image generation request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
  }
}

