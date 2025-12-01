/**
 * Image Generation Hook
 */

import { useState, useCallback } from 'react';
import { generateImage } from '../utils/image-generation';
import { ImageGenerationRequest, ImageGenerationResponse } from '../types/image-generation';

export interface UseImageGenerationReturn {
  generate: (request: ImageGenerationRequest) => Promise<ImageGenerationResponse>;
  loading: boolean;
  error: string | null;
  data: ImageGenerationResponse['data'] | null;
  reset: () => void;
}

export function useImageGeneration(): UseImageGenerationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ImageGenerationResponse['data'] | null>(null);

  const generate = useCallback(async (request: ImageGenerationRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await generateImage(request);
      
      if (response.success && response.data) {
        setData(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to generate image');
        setData(null);
      }
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setData(null);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    generate,
    loading,
    error,
    data,
    reset,
  };
}

