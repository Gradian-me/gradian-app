// Image Generation API Route
// Handles image generation requests via OpenAI Images API (AvalAI compatible)

import { NextRequest, NextResponse } from 'next/server';
import { loadApplicationVariables } from '@/gradian-ui/shared/utils/application-variables-loader';

/**
 * POST - Generate image from text prompt
 * Body: { prompt: string, size?: string, responseFormat?: 'url' | 'b64_json', model?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: {
      prompt?: string;
      size?: string;
      responseFormat?: 'url' | 'b64_json';
      model?: string;
    };

    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { prompt, size = '1024x1024', responseFormat = 'url', model = 'gpt-image-1-mini' } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'prompt is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate size
    const validSizes = ['1024x1024', '1024x1792', '1792x1024'];
    if (!validSizes.includes(size)) {
      return NextResponse.json(
        { success: false, error: `Invalid size. Must be one of: ${validSizes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate response format
    if (responseFormat !== 'url' && responseFormat !== 'b64_json') {
      return NextResponse.json(
        { success: false, error: 'responseFormat must be either "url" or "b64_json"' },
        { status: 400 }
      );
    }

    // Get API key from environment
    const apiKey = process.env.LLM_API_KEY || process.env.AVALAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'LLM_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Get API URL from application variables (defaults to AvalAI)
    const appVars = loadApplicationVariables();
    const baseUrl = appVars.AI_CONFIG?.LLM_API_URL || 'https://api.avalai.ir/v1';
    
    // Extract base URL without /chat/completions or /images/generate
    const apiBaseUrl = baseUrl.replace(/\/chat\/completions$|\/images\/generate$/, '');
    const imagesApiUrl = `${apiBaseUrl}/images/generate`;

    // Track timing
    const startTime = Date.now();

    // Create AbortController with timeout (60 seconds for image generation)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds

    try {
      // Call Images API
      const response = await fetch(imagesApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          prompt,
          size,
          response_format: responseFormat,
          n: 1 // Generate 1 image
        }),
        signal: controller.signal
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

        return NextResponse.json(
          { success: false, error: errorMessage },
          { status: response.status }
        );
      }

      const data = await response.json();

      // Extract image data
      const imageData = data.data?.[0];
      if (!imageData) {
        return NextResponse.json(
          { success: false, error: 'No image data in response' },
          { status: 500 }
        );
      }

      // Return image URL or base64 content
      const result = {
        url: imageData.url || null,
        b64_json: imageData.b64_json || null,
        revised_prompt: imageData.revised_prompt || null
      };

      return NextResponse.json({
        success: true,
        data: {
          image: result,
          format: responseFormat,
          size,
          model,
          timing: {
            responseTime,
            duration: responseTime
          }
        }
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle timeout errors
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Request timeout in image generation API:', fetchError);
        return NextResponse.json(
          {
            success: false,
            error: 'Request timeout. The image generation service took too long to respond. Please try again.'
          },
          { status: 504 }
        );
      }

      throw fetchError;
    }
  } catch (error) {
    console.error('Error in image generation API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

