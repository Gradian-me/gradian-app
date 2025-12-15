/**
 * Video Generation Domain Types
 */

export interface VideoGenerationRequest {
  prompt: string;
  model?: string;
  input_reference?: File | Blob | Buffer | string; // Image file reference
  size?: '1280x720' | '1920x1080' | '1024x1024' | string; // Video resolution
  seconds?: string | number; // Duration in seconds
  responseFormat?: 'url' | 'mp4';
}

export interface VideoGenerationResponse {
  success: boolean;
  data?: {
    video: {
      url: string | null;
      file_path?: string | null;
      duration?: number | null;
    };
    format: 'url' | 'mp4';
    size: string;
    seconds: string | number;
    model: string;
    timing: {
      responseTime: number;
      duration: number;
    };
  };
  error?: string;
}

export interface VideoPlayerConfig {
  sourceUrl?: string;
  content?: string; // base64 or file path
  alt?: string;
  width?: number;
  height?: number;
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  poster?: string;
}

