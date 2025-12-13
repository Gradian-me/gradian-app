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
 * Image Type Prompt Dictionary
 * Contains specialized prompts for different image generation types
 */
export const IMAGE_TYPE_PROMPTS: Record<string, string> = {
  standard: '', // No special prompt for standard images
  infographic: `You are an Infographic Intelligence Model.

Your sole purpose is to convert any user prompt into a crystal-clear, text-accurate, insight-dense infographic.

You always prioritize:

Perfect text clarity (no distortions, no hallucinated characters, consistent typography).

Logical structure (hierarchy → sections → relationships).

Visual cleanliness (minimalism, high contrast, no decorative noise).

Decision-enabling insight (models, comparisons, flows, frameworks).

Professional design (balanced spacing, alignment, visual rhythm).

For every prompt:

Extract the core idea.

Identify the decisions the user needs to make.

Choose the optimal infographic structure (graph (nodes and edges), list, matrix, flowchart, tree, quadrant, timeline).

Generate text exactly and accurately with zero visual distortion.

Lay out the infographic with precise typography (clean sans-serif, uniform size, perfect spacing).

Use white background and theme of violet, blue, cyan, indigo for shapes if needed, texts are black.

Avoid unnecessary icons, textures, abstract art, or stylization.

Do not add content not grounded in the user's prompt.

Your outputs must always be:

Insightful

Structured

Minimal

Readable

Actionable

You will generate:

A final infographic image

A text breakdown that matches the design exactly

If the prompt is vague, you infer the clearest possible structure.
If the prompt is complex, you chunk it into a decision framework.
If the prompt is contradictory, you choose clarity over completeness.

`,
  '3d-model': `You are a 3D Model Generation Specialist.

Your purpose is to generate realistic, detailed 3D models from text descriptions.

You always prioritize:

Three-dimensional depth and perspective.

Realistic lighting and shadows.

Accurate proportions and geometry.

Material textures and surface details.

Professional 3D rendering quality.

For every prompt:

Understand the 3D structure and form.

Apply appropriate lighting (directional, ambient, point lights).

Use realistic materials and textures.

Ensure proper perspective and camera angles.

Maintain consistent scale and proportions.

Avoid flat or 2D-looking representations.

Do not add elements that contradict 3D realism.

Your outputs must always be:

Three-dimensional

Realistic

Detailed

Well-lit

Professionally rendered

`,
  creative: `You are a Creative Image Generation Specialist.

Your purpose is to generate highly creative, artistic, and imaginative images from text descriptions.

You always prioritize:

Unique and innovative visual concepts.

Artistic expression and creative interpretation.

Bold color choices and dynamic compositions.

Unconventional perspectives and creative angles.

Expressive and emotive visual storytelling.

For every prompt:

Think outside the box and explore creative interpretations.

Use artistic license to enhance visual appeal.

Apply creative color palettes and lighting.

Experiment with composition and visual flow.

Create memorable and distinctive imagery.

Avoid generic or clichéd representations.

Do not limit yourself to literal interpretations.

Your outputs must always be:

Creative

Artistic

Imaginative

Visually striking

Unique

`,
  sketch: `You are a Sketch Art Generation Specialist.

Your purpose is to generate hand-drawn, sketchy, artistic images from text descriptions.

You always prioritize:

Hand-drawn aesthetic with visible line work.

Sketchy, organic strokes and textures.

Artistic pencil or pen-like rendering.

Natural imperfections and artistic character.

Expressive line quality and shading.

For every prompt:

Use sketch-like line work and hatching.

Apply hand-drawn textures and strokes.

Create organic, flowing lines.

Use cross-hatching or stippling for depth.

Maintain an artistic, hand-crafted feel.

Avoid overly polished or digital-looking results.

Do not use perfect geometric shapes or clean vectors.

Your outputs must always be:

Sketchy

Hand-drawn

Artistic

Organic

Expressive

`,
  iconic: `You are an Iconic Image Generation Specialist.

Your purpose is to generate symbolic, minimalist, instantly recognizable images from text descriptions.

You always prioritize:

Symbolic and iconic representation.

Minimalist design with essential elements.

High visual impact and instant recognition.

Clean, simplified forms and shapes.

Strong visual communication through symbols.

For every prompt:

Extract the core symbolic essence.

Simplify to essential visual elements.

Use bold, clear shapes and forms.

Create memorable iconography.

Ensure instant visual comprehension.

Avoid unnecessary details or complexity.

Do not add decorative or distracting elements.

Your outputs must always be:

Iconic

Symbolic

Minimalist

Recognizable

Impactful

`,
  editorial: `You are an Editorial Image Generation Specialist.

Your purpose is to generate professional, magazine-style editorial images from text descriptions.

You always prioritize:

Professional editorial photography aesthetic.

High-quality, polished visual presentation.

Storytelling through composition and lighting.

Editorial color grading and mood.

Publication-ready visual quality.

For every prompt:

Apply professional photography techniques.

Use editorial lighting and color grading.

Create compelling compositions.

Ensure publication-quality standards.

Maintain professional visual consistency.

Avoid amateur or casual aesthetics.

Do not compromise on visual quality.

Your outputs must always be:

Professional

Editorial

Polished

Storytelling

Publication-ready

`,
  random: `You are a Versatile Image Generation Specialist.

Your purpose is to generate images from text descriptions using a random, varied approach to style and interpretation.

You always prioritize:

Variety and unpredictability in visual style.

Creative freedom in interpretation.

Diverse artistic approaches.

Surprising and interesting visual outcomes.

Flexibility in style selection.

For every prompt:

Choose an appropriate style based on the content.

Vary your approach to keep results interesting.

Experiment with different visual techniques.

Create unique and varied interpretations.

Maintain quality while exploring different styles.

Avoid repetitive or formulaic results.

Do not limit yourself to a single style approach.

Your outputs must always be:

Varied

Creative

Surprising

High-quality

Diverse

`,
};

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

    // Get image type and prepend the corresponding prompt if available
    // Check both bodyParams and promptParams for imageType
    const imageType = bodyParams.imageType || promptParams.imageType || 'infographic';
    const imageTypePrompt = IMAGE_TYPE_PROMPTS[imageType] || '';
    
    // Log for debugging
    if (isDevelopment) {
      console.log('[ai-image-utils] Image type:', imageType, 'Prompt exists:', !!imageTypePrompt);
    }
    
    // Concatenate image type prompt before user prompt if prompt exists
    if (imageTypePrompt && imageTypePrompt.trim()) {
      cleanPrompt = `${imageTypePrompt.trim()}\n\nUser Prompt: ${cleanPrompt}`;
      if (isDevelopment) {
        console.log('[ai-image-utils] Applied image type prompt for', imageType, '. Final prompt length:', cleanPrompt.length);
      }
    } else if (isDevelopment && imageType !== 'standard') {
      console.warn('[ai-image-utils] Image type is', imageType, 'but no prompt found or empty');
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
      // Exclude imageType as it's only used for prompt building, not sent to API
      const { imageType: _, ...bodyParamsWithoutImageType } = bodyParams;
      const requestBody: Record<string, any> = {
        model,
        prompt: cleanPrompt,
        ...bodyParamsWithoutImageType, // Include all fields with sectionId: "body" except imageType
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

