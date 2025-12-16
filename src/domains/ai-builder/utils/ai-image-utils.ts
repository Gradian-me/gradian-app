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
 * General Image Generation Prompt
 * Applies to all image types - emphasizes text clarity and readability
 */
const GENERAL_IMAGE_PROMPT = `CRITICAL TEXT GENERATION REQUIREMENTS:

You MUST prioritize text clarity and readability above all else.

Text Generation Rules:
- All text in the image must be perfectly readable, clear, and legible
- Use high contrast between text and background (dark text on light background or light text on dark background)
- Choose clear, readable fonts (sans-serif preferred for clarity)
- Ensure adequate font size - text must be large enough to read comfortably
- Maintain consistent typography throughout the image
- Avoid text distortion, blur, or overlapping characters
- Do not use decorative fonts that sacrifice readability
- Ensure proper spacing between letters, words, and lines

Language Translation Requirements:
- If the user prompt contains text in languages other than English (such as Farsi, Arabic, Chinese, etc.), you MUST:
  1. First translate ALL non-English text to English
  2. Then display the translated English text in the image
- NEVER display non-English text directly in the image without translation
- If the user wants to show multilingual content, translate everything to English first, then display it
- This ensures maximum readability and accessibility

Text Accuracy:
- Generate text exactly as specified - no hallucinations or made-up content
- If numbers, dates, or specific terms are mentioned, display them accurately
- Maintain the original meaning when translating to English

Number Display Requirements:
- All numbers must be displayed with maximum clarity and precision
- Always include decimal points when numbers have decimal values (e.g., 98.5, not 98 or 99)
- Always include appropriate units for numbers (e.g., %, USD, kg, etc.)
- Use clear number formatting with proper spacing between numbers and units
- Ensure numbers are large enough to read comfortably
- Use consistent number formatting throughout the image
- Display percentages with the % symbol clearly visible
- Display currency values with currency symbols or abbreviations (e.g., $, USD, EUR)
- Display measurements with proper unit abbreviations (e.g., kg, m, cm, ml, etc.)
- Avoid truncating or rounding numbers unless explicitly requested
- Maintain precision for decimal numbers (e.g., 16666.67 not 16667)
- Use thousand separators for large numbers when appropriate (e.g., 2,500,000)

Visual Hierarchy:
- Use text size, weight, and color to create clear visual hierarchy
- Important information should be more prominent
- Ensure all text elements are properly aligned and organized

Watermark Requirement:
- ALL images MUST include a minimal text watermark in the bottom right corner
- The watermark text must be: "Powered by Gradian AI" in one line
- Use small, subtle font size (not too prominent, but readable)
- Use a semi-transparent or low-contrast color that doesn't distract from the main content
- Position it in the bottom right corner with appropriate padding from edges
- Ensure the watermark is always visible but unobtrusive
- This watermark must appear on EVERY generated image without exception

`;

/**
 * Image Type Prompt Dictionary
 * Contains specialized prompts for different image generation types
 */
export const IMAGE_TYPE_PROMPTS: Record<string, string> = {
  standard: GENERAL_IMAGE_PROMPT, // General prompt applies to standard images
  infographic: `${GENERAL_IMAGE_PROMPT}

You are an Infographic Intelligence Model.

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
  '3d-model': `${GENERAL_IMAGE_PROMPT}

You are a 3D Model Generation Specialist.

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
  creative: `${GENERAL_IMAGE_PROMPT}

You are a Creative Image Generation Specialist.

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
  sketch: `${GENERAL_IMAGE_PROMPT}

You are a Sketch Art Generation Specialist.

Your purpose is to generate hand-drawn, sketchy, artistic images from text descriptions.

You always prioritize:

Hand-drawn aesthetic with visible line work.

Sketchy, organic strokes and textures.

Artistic pencil or pen-like rendering.

Natural imperfections and artistic character.

Expressive line quality and shading.

For every prompt:

Use white background for all sketches.

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

White background

`,
  iconic: `${GENERAL_IMAGE_PROMPT}

You are an Iconic Image Generation Specialist.

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
  editorial: `${GENERAL_IMAGE_PROMPT}

You are an Editorial Image Generation Specialist.

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
  'comic-book': `${GENERAL_IMAGE_PROMPT}

You are a Comic Book Art Generator.

Your task is to create a visually compelling comic book layout that tells the story from the user's prompt.

CRITICAL VISUAL REQUIREMENTS:

- Create a comic book page layout with AT LEAST SIX (6) panels arranged in a clear grid (e.g., 3x2 or 2x3 layout)
- Each panel must be clearly separated with bold black borders
- Use vibrant, bold comic book colors with high contrast
- Apply classic comic book art style with dynamic compositions
- Include speech bubbles with readable text where dialogue is needed
- Use narration boxes for key story points
- Add stylized sound effects (SFX) text where appropriate
- Create clear visual hierarchy with bold lines and dramatic angles

PROMPT PROCESSING:

- Simplify the user's story into key visual moments
- Identify main characters, events, and actions
- Convert technical terms into visual comic elements (e.g., equipment as characters or objects)
- Focus on the most important story beats for the 6+ panels
- Create a clear visual narrative flow from left to right, top to bottom

OUTPUT:

Generate a single comic book page image with:
- 6 or more panels arranged in a grid layout
- Clear panel borders separating each scene
- Visual storytelling that conveys the key story elements
- Speech bubbles and narration boxes with clear, readable text
- Bold comic book art style with vibrant colors
- Dramatic visual compositions

Keep the visual style bold, clear, and readable. Focus on creating an engaging comic book layout that visually tells the story.

`,
  random: `${GENERAL_IMAGE_PROMPT}

You are a Versatile Image Generation Specialist.

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
    } else if (bodyParams.prompt && bodyParams.prompt !== cleanPrompt) {
      // If we have a cleanPrompt from promptParams but bodyParams also has a prompt,
      // prefer bodyParams.prompt for image generation (it's the actual user prompt)
      cleanPrompt = bodyParams.prompt;
    }

    // Security: Sanitize and validate prompt
    if (!cleanPrompt || typeof cleanPrompt !== 'string') {
      return {
        success: false,
        error: 'prompt is required and must be a string',
      };
    }

    // Get image type and prepend the corresponding prompt if available
    // Check multiple sources for imageType (in order of priority)
    let imageType: string = 'infographic'; // Default fallback
    
    // Priority 1: bodyParams (from requestData.body)
    if (bodyParams?.imageType && bodyParams.imageType !== 'none') {
      imageType = bodyParams.imageType;
    }
    // Priority 2: promptParams (from formValues extraction)
    else if (promptParams?.imageType && promptParams.imageType !== 'none') {
      imageType = promptParams.imageType;
    }
    // Priority 3: requestData.body directly (fallback)
    else if (requestData.body?.imageType && requestData.body.imageType !== 'none') {
      imageType = requestData.body.imageType;
    }
    // Priority 4: requestData.formValues (if body wasn't provided)
    else if (requestData.formValues?.imageType && requestData.formValues.imageType !== 'none') {
      imageType = requestData.formValues.imageType;
    }
    
    // Get the image type prompt - ensure we're using the correct key
    // Always start with GENERAL_IMAGE_PROMPT for all image types
    let imageTypePrompt = GENERAL_IMAGE_PROMPT;
    
    // If imageType is set and not "none" or "standard", append the specific type prompt
    if (imageType && imageType !== 'none' && imageType !== 'standard') {
      const specificPrompt = IMAGE_TYPE_PROMPTS[imageType] || '';
      
      // If not found, try with different casing
      if (!specificPrompt) {
        const lowerKey = imageType.toLowerCase();
        const upperKey = imageType.toUpperCase();
        const titleKey = imageType.charAt(0).toUpperCase() + imageType.slice(1).toLowerCase();
        
        const foundPrompt = IMAGE_TYPE_PROMPTS[lowerKey] || 
                           IMAGE_TYPE_PROMPTS[upperKey] || 
                           IMAGE_TYPE_PROMPTS[titleKey] || 
                           '';
        
        if (foundPrompt) {
          // If specific prompt is found, it already includes GENERAL_IMAGE_PROMPT, so use it directly
          imageTypePrompt = foundPrompt;
        }
        // If not found, keep GENERAL_IMAGE_PROMPT (already set above)
      } else {
        // Specific prompt found - it already includes GENERAL_IMAGE_PROMPT, so use it directly
        imageTypePrompt = specificPrompt;
      }
    }
    // For "none" or "standard", imageTypePrompt is already set to GENERAL_IMAGE_PROMPT above
    
    // Log for debugging
    if (isDevelopment) {
      console.log('[ai-image-utils] ===== IMAGE TYPE DETECTION =====');
      console.log('[ai-image-utils] Request data body:', JSON.stringify(requestData.body, null, 2));
      console.log('[ai-image-utils] bodyParams:', JSON.stringify(bodyParams, null, 2));
      console.log('[ai-image-utils] promptParams:', JSON.stringify(promptParams, null, 2));
      console.log('[ai-image-utils] formValues:', JSON.stringify(requestData.formValues, null, 2));
      console.log('[ai-image-utils] Detected imageType:', imageType);
      console.log('[ai-image-utils] imageTypePrompt exists:', !!imageTypePrompt);
      console.log('[ai-image-utils] imageTypePrompt length:', imageTypePrompt?.length || 0);
      console.log('[ai-image-utils] Available image types in IMAGE_TYPE_PROMPTS:', Object.keys(IMAGE_TYPE_PROMPTS));
      console.log('[ai-image-utils] IMAGE_TYPE_PROMPTS[imageType]:', IMAGE_TYPE_PROMPTS[imageType] ? 'EXISTS' : 'NOT FOUND');
      if (IMAGE_TYPE_PROMPTS[imageType]) {
        console.log('[ai-image-utils] First 100 chars of imageTypePrompt:', IMAGE_TYPE_PROMPTS[imageType].substring(0, 100));
      }
    }
    
    // Concatenate image type prompt before user prompt if prompt exists
    // IMPORTANT: This must happen BEFORE sanitization to preserve the full prompt
    if (imageTypePrompt && imageTypePrompt.trim()) {
      const originalPrompt = cleanPrompt;
      cleanPrompt = `${imageTypePrompt.trim()}\n\nUser Prompt: ${cleanPrompt}`;
      if (isDevelopment) {
        console.log('[ai-image-utils] Applied image type prompt for', imageType);
        console.log('[ai-image-utils] Image type prompt length:', imageTypePrompt.trim().length);
        console.log('[ai-image-utils] Original prompt length:', originalPrompt.length);
        console.log('[ai-image-utils] Final prompt length:', cleanPrompt.length);
        console.log('[ai-image-utils] First 200 chars of final prompt:', cleanPrompt.substring(0, 200));
      }
    } else {
      // Log warning if imageType is set but no prompt found
      if (isDevelopment) {
        if (imageType && imageType !== 'standard' && imageType !== 'none') {
          console.warn('[ai-image-utils] Image type is', imageType, 'but no prompt found in IMAGE_TYPE_PROMPTS');
          console.warn('[ai-image-utils] Available image types:', Object.keys(IMAGE_TYPE_PROMPTS));
          console.warn('[ai-image-utils] imageTypePrompt value:', imageTypePrompt);
        }
      }
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
      // Exclude imageType and prompt from bodyParams since:
      // - imageType is only used for prompt building, not sent to API
      // - prompt is replaced with cleanPrompt which includes the image type prompt
      const { imageType: _, prompt: __, ...bodyParamsWithoutImageTypeAndPrompt } = bodyParams;
      const requestBody: Record<string, any> = {
        model,
        prompt: cleanPrompt, // Use cleanPrompt which includes the image type prompt concatenated
        ...bodyParamsWithoutImageTypeAndPrompt, // Include all other fields with sectionId: "body" except imageType and prompt
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

      // Log the response structure in development for debugging
      if (isDevelopment) {
        console.log('Image API response structure:', JSON.stringify(data, null, 2).substring(0, 1000));
      }

      // Check for error in response first
      if (data.error) {
        return {
          success: false,
          error: `Image generation API error: ${typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}`,
        };
      }

      // Check if data.data is explicitly an empty array (common failure case)
      if (data.data && Array.isArray(data.data) && data.data.length === 0) {
        const errorMessage = data.message || data.error_message || 'Image generation returned empty data array. The API may have failed to generate the image.';
        return {
          success: false,
          error: errorMessage,
        };
      }

      // Extract image data - handle different possible response structures
      // Try multiple possible locations for image data
      let imageData: any = null;
      
      // Structure 1: data.data[0] (OpenAI-style)
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        imageData = data.data[0];
        // Handle case where b64_json might be an empty array
        if (imageData.b64_json && Array.isArray(imageData.b64_json) && imageData.b64_json.length === 0) {
          imageData.b64_json = null;
        }
      }
      // Structure 2: data.candidates?.[0]?.content?.parts?.[0] (Gemini-style)
      else if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (candidate.content?.parts && Array.isArray(candidate.content.parts) && candidate.content.parts.length > 0) {
          const part = candidate.content.parts[0];
          // Gemini returns base64 images in the inlineData field
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

      // Return image URL or base64 content
      // Handle both OpenAI format (b64_json) and Gemini format (data field)
      // Filter out empty arrays - convert to null
      let b64Data = imageData.b64_json || imageData.data || null;
      if (Array.isArray(b64Data) && b64Data.length === 0) {
        b64Data = null;
      }
      
      // If we have base64 data but no URL, save it and get URL
      let savedUrl: string | null = null;
      if (b64Data && !imageData.url && baseUrl) {
        try {
          // Prepare base64 string (add data URL prefix if needed)
          let base64String = b64Data;
          if (!base64String.startsWith('data:image/')) {
            const mimeType = imageData.mimeType || 'image/png';
            base64String = `data:${mimeType};base64,${base64String}`;
          }
          
          // Save image via API
          const saveResponse = await fetch(`${baseUrl}/api/images/save`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              base64: base64String,
              mimeType: imageData.mimeType || 'image/png',
            }),
          });
          
          if (saveResponse.ok) {
            const saveResult = await saveResponse.json();
            if (saveResult.success && saveResult.url) {
              savedUrl = saveResult.url;
            }
          }
        } catch (saveError) {
          if (isDevelopment) {
            console.warn('Failed to save image, will use base64:', saveError);
          }
          // Continue with base64 if save fails
        }
      }
      
      const result = {
        url: imageData.url || savedUrl || null,
        b64_json: savedUrl ? null : b64Data, // Remove base64 if we have URL
        revised_prompt: imageData.revised_prompt || null,
        mimeType: imageData.mimeType || null,
      };
      
      // Final validation - must have either url or b64_json
      if (!result.url && !result.b64_json) {
        const errorDetails = isDevelopment 
          ? ` Response structure: ${JSON.stringify(Object.keys(data || {})).substring(0, 200)}, imageData keys: ${JSON.stringify(Object.keys(imageData || {}))}`
          : '';
        return {
          success: false,
          error: `No valid image data found in response (url and b64_json are both null/empty).${errorDetails}`,
        };
      }

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

