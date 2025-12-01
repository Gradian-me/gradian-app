/**
 * Image Generation Domain Types
 */

export interface ImageGenerationRequest {
  prompt: string;
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  responseFormat?: 'url' | 'b64_json';
  model?: string;
}

export interface ImageGenerationResponse {
  success: boolean;
  data?: {
    image: {
      url: string | null;
      b64_json: string | null;
      revised_prompt: string | null;
    };
    format: 'url' | 'b64_json';
    size: string;
    model: string;
    timing: {
      responseTime: number;
      duration: number;
    };
  };
  error?: string;
}

export interface ImageViewerConfig {
  sourceUrl?: string;
  content?: string; // base64
  alt?: string;
  width?: number;
  height?: number;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  priority?: boolean;
  quality?: number;
}

