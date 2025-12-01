/**
 * Image Generation Utilities
 */

import { ImageGenerationRequest, ImageGenerationResponse } from '../types/image-generation';

/**
 * Generate image from text prompt
 */
export async function generateImage(
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  try {
    const response = await fetch('/api/image/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: request.prompt,
        size: request.size || '1024x1024',
        responseFormat: request.responseFormat || 'url',
        model: request.model || 'gpt-image-1-mini',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP error! status: ${response.status}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Validate image size
 */
export function isValidImageSize(size: string): boolean {
  const validSizes = ['1024x1024', '1024x1792', '1792x1024'];
  return validSizes.includes(size);
}

/**
 * Format base64 content for display
 */
export function formatBase64Image(base64: string): string {
  if (!base64) return '';
  
  // If already has data URL prefix, return as is
  if (base64.startsWith('data:image/')) {
    return base64;
  }
  
  // Add default image/jpeg prefix
  return `data:image/jpeg;base64,${base64}`;
}

/**
 * Extract image source from value object
 */
export function extractImageSource(value: any): { url?: string; base64?: string } {
  if (!value) return {};
  
  return {
    url: value.url || value.sourceUrl || value.imageUrl || value.image,
    base64: value.b64_json || value.content || value.base64,
  };
}

