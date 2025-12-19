/**
 * AI Video Utilities
 * Handles video generation requests
 */

import { AgentRequestData, AgentResponse } from './ai-agent-utils';
import { extractParametersBySectionId, parseUserPromptToFormValues } from './ai-shared-utils';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import {
  sanitizePrompt,
  getApiKey,
  sanitizeErrorMessage,
  safeJsonParse,
  validateVideoSize,
  validateVideoOutputFormat,
  validateVideoDuration,
  validateFile,
} from './ai-security-utils';
import {
  createAbortController,
  parseErrorResponse,
  buildTimingInfo,
  validateAgentConfig,
} from './ai-common-utils';
import { getApiUrlForAgentType } from './ai-agent-url';

/**
 * Process video generation request
 */
export async function processVideoRequest(
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
        ?.filter((comp: any) => {
          const fieldName = comp.name || comp.id;
          return promptParams[fieldName] !== undefined;
        })
        .sort((a: any, b: any) => (a.order || 999) - (b.order || 999)) || [];
      
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

    // For video generation, prompt should come from bodyParams.prompt if available
    // Otherwise fallback to userPrompt or promptParams
    if (!cleanPrompt) {
      // Try to get prompt from bodyParams first (for video generation)
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
    } else if (bodyParams.prompt && bodyParams.prompt !== cleanPrompt) {
      // If we have a cleanPrompt from promptParams but bodyParams also has a prompt,
      // prefer bodyParams.prompt for video generation (it's the actual user prompt)
      cleanPrompt = bodyParams.prompt;
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
    const model = agent.model || 'veo-3.1-fast-generate-preview';

    // Security: Validate size if present in bodyParams
    if (bodyParams.size) {
      const sizeValidation = validateVideoSize(bodyParams.size);
      if (!sizeValidation.valid) {
        return {
          success: false,
          error: sizeValidation.error || 'Invalid video size',
        };
      }
    }

    // Security: Validate seconds (duration) if present in bodyParams
    if (bodyParams.seconds !== undefined) {
      const durationValidation = validateVideoDuration(bodyParams.seconds);
      if (!durationValidation.valid) {
        return {
          success: false,
          error: durationValidation.error || 'Invalid video duration',
        };
      }
    }

    // Security: Validate response format if present in extraParams
    if (extraParams.output_format) {
      const formatValidation = validateVideoOutputFormat(extraParams.output_format);
      if (!formatValidation.valid) {
        return {
          success: false,
          error: formatValidation.error || 'Invalid output format',
        };
      }
    }

    // Security: Validate input_reference file if present
    let inputReferenceFile: File | Blob | null = null;
    if (requestData.file) {
      const fileValidation = validateFile(requestData.file);
      if (!fileValidation.valid) {
        return {
          success: false,
          error: fileValidation.error || 'Invalid file',
        };
      }
      inputReferenceFile = requestData.file;
    } else if (bodyParams.input_reference) {
      // If input_reference is provided in bodyParams, it might be a File/Blob or path string
      if (bodyParams.input_reference instanceof File || bodyParams.input_reference instanceof Blob) {
        const fileValidation = validateFile(bodyParams.input_reference);
        if (!fileValidation.valid) {
          return {
            success: false,
            error: fileValidation.error || 'Invalid input reference file',
          };
        }
        inputReferenceFile = bodyParams.input_reference;
      }
      // If it's a string (path), it will be sent as-is to the API
    }

    // Get API URL based on agent type
    const videosApiUrl = getApiUrlForAgentType('video-generation');

    // Track timing
    const startTime = Date.now();

    // Performance: Use shared AbortController utility
    // Video generation may take longer, so use a longer timeout
    const { controller, timeoutId } = createAbortController(300000); // 5 minutes

    try {
      // Build request body - model, prompt, and all body parameters
      // Exclude prompt from bodyParams since we're using cleanPrompt
      const { prompt: __, ...bodyParamsWithoutPrompt } = bodyParams;
      const requestBody: Record<string, any> = {
        model,
        prompt: cleanPrompt,
        ...bodyParamsWithoutPrompt, // Include all other fields with sectionId: "body" except prompt
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
        LogType.AI_BODY_LOG,
        'info',
        `Video Generation Request to ${videosApiUrl}: ${JSON.stringify(finalRequestBody, null, 2)}`
      );

      // Prepare FormData for multipart/form-data if input_reference is a file
      let requestBodyToSend: BodyInit;
      let contentType: string;

      if (inputReferenceFile) {
        // Use FormData for file upload
        const formData = new FormData();
        formData.append('model', model);
        formData.append('prompt', cleanPrompt);
        
        if (bodyParams.size) {
          formData.append('size', bodyParams.size);
        }
        if (bodyParams.seconds !== undefined) {
          formData.append('seconds', String(bodyParams.seconds));
        }
        
        // Append input_reference file
        formData.append('input_reference', inputReferenceFile);

        // Append extra_body parameters as JSON string
        if (Object.keys(extraBody).length > 0) {
          formData.append('extra_body', JSON.stringify(extraBody));
        }

        requestBodyToSend = formData;
        contentType = 'multipart/form-data'; // Browser will set boundary automatically
      } else {
        // Use JSON for non-file requests
        requestBodyToSend = JSON.stringify(finalRequestBody);
        contentType = 'application/json';
      }

      // Get API key
      const apiKeyResult = getApiKey();
      if (!apiKeyResult.key) {
        return {
          success: false,
          error: apiKeyResult.error || 'LLM_API_KEY is not configured',
        };
      }

      // Call Videos API
      const headers: HeadersInit = {
        Authorization: `Bearer ${apiKeyResult.key}`,
      };

      // Only set Content-Type for JSON, not for FormData (browser will set it automatically with boundary)
      if (contentType === 'application/json') {
        headers['Content-Type'] = contentType;
      }

      const response = await fetch(videosApiUrl, {
        method: 'POST',
        headers,
        body: requestBodyToSend,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Security: Use shared error parsing utility
        const errorMessage = await parseErrorResponse(response);
        
        if (isDevelopment) {
          console.error('Videos API error:', errorMessage);
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
          error: parseResult.error || 'Invalid response format from video generation service',
        };
      }

      const data = parseResult.data;

      // Log the response structure in development for debugging
      if (isDevelopment) {
        console.log('Video API response structure:', JSON.stringify(data, null, 2).substring(0, 1000));
      }

      // Extract video data - handle new response format: { object: "list", data: [{ id, status, ... }] }
      let videoData: any = null;
      
      // New API format: data.data[0] with id and status
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        videoData = data.data[0];
      }
      // Fallback: data.video
      else if (data.video) {
        videoData = data.video;
      }
      // Fallback: Direct video object in data
      else if (data.id || data.url || data.file_path) {
        videoData = data;
      }
      
      if (!videoData) {
        const errorDetails = isDevelopment 
          ? ` Response structure: ${JSON.stringify(Object.keys(data || {})).substring(0, 200)}`
          : '';
        return {
          success: false,
          error: `No video data in response.${errorDetails}`,
        };
      }

      // Extract video_id from the response
      const videoId = videoData.id;
      if (!videoId) {
        const errorDetails = isDevelopment 
          ? ` Video data keys: ${JSON.stringify(Object.keys(videoData || {}))}`
          : '';
        return {
          success: false,
          error: `No video ID found in response.${errorDetails}`,
        };
      }

      // Extract usage information (duration_seconds)
      const usageDuration = videoData.usage?.duration_seconds || null;
      
      // Extract cost information (estimated_cost)
      const estimatedCost = videoData.estimated_cost || null;
      let videoCost: { unit: string; irt: number; exchange_rate: number } | null = null;
      if (estimatedCost) {
        videoCost = {
          unit: estimatedCost.unit || '0',
          irt: estimatedCost.irt || 0,
          exchange_rate: estimatedCost.exchange_rate || 0,
        };
      }

      // Return video information with video_id for content fetching
      const result = {
        video_id: videoId,
        status: videoData.status || null,
        url: videoData.url || null, // May be null initially if status is "queued"
        file_path: videoData.file_path || null,
        duration: videoData.duration || videoData.seconds || bodyParams.seconds || null,
        size: videoData.size || bodyParams.size || null,
        model: videoData.model || model,
        progress: videoData.progress || null,
        error: videoData.error || null,
        usage: videoData.usage || null,
        estimated_cost: estimatedCost || null,
      };

      // Performance: Use shared timing utility
      const timing = buildTimingInfo(startTime);

      // Format response data for AiBuilderResponseData structure
      const responseData = {
        video: result,
        ...bodyParams, // Include all body parameters in response
        model: result.model,
        timing,
      };

      // Create video usage object (similar to TokenUsage structure)
      const videoUsage = usageDuration !== null ? {
        duration_seconds: usageDuration,
        estimated_cost: videoCost,
      } : null;

      return {
        success: true,
        data: {
          response: JSON.stringify(responseData, null, 2), // Stringify for consistency with other agent types
          format: 'video' as const,
          tokenUsage: null, // Video generation doesn't use tokens
          videoUsage: videoUsage, // Video usage (duration and cost)
          timing,
          agent: {
            id: agent.id,
            label: agent.label,
            description: agent.description,
            requiredOutputFormat: 'video' as const,
            nextAction: agent.nextAction,
          },
        },
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle timeout errors
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        if (isDevelopment) {
          console.error('Request timeout in video generation API:', fetchError);
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
      console.error('Error in video generation request:', error);
    }
    return {
      success: false,
      error: sanitizeErrorMessage(error, isDevelopment),
    };
  }
}

