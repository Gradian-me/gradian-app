'use client';

// Video Viewer Component
// Displays videos from URL, base64 content, or video_id using HTML5 video element

import React, { useState, useEffect } from 'react';
import { FormElementProps } from '../types';
import { cn } from '../../../shared/utils';
import { Loader2 } from 'lucide-react';

export interface VideoViewerProps extends Omit<FormElementProps, 'config'> {
  config?: any;
  sourceUrl?: string;
  content?: string; // base64 content or file path
  videoId?: string; // Video ID to fetch content from API
  alt?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  poster?: string;
  playsInline?: boolean;
}

export const VideoViewer: React.FC<VideoViewerProps> = ({
  config,
  value,
  sourceUrl,
  content,
  videoId,
  alt,
  width = '100%',
  height = 'auto',
  className,
  autoplay = false,
  controls = true,
  loop = false,
  muted = false,
  poster,
  playsInline = true,
  ...props
}) => {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Helper to safely set error as string
  const setErrorSafe = (errorValue: any) => {
    if (!errorValue) {
      setError(null);
      return;
    }
    if (typeof errorValue === 'string') {
      setError(errorValue);
    } else if (typeof errorValue === 'object' && errorValue !== null) {
      const errorMessage = (errorValue as any).message || (errorValue as any).error || JSON.stringify(errorValue);
      setError(errorMessage);
    } else {
      setError(String(errorValue));
    }
  };
  const [videoStatus, setVideoStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  // Extract video source from various possible locations
  const videoUrl = 
    sourceUrl || 
    config?.sourceUrl || 
    value?.url || 
    value?.sourceUrl || 
    value?.videoUrl || 
    value?.video ||
    value?.file_path; // Support file_path from video generation response

  // Extract video_id from various possible locations
  const extractedVideoId = 
    videoId || 
    config?.videoId || 
    value?.video_id || 
    value?.videoId || 
    value?.id; // Support id from video generation response

  // Extract base64 content
  const base64Content = 
    content || 
    config?.content || 
    value?.content;

  // Extract alt text
  const videoAlt = alt || config?.alt || config?.videoAlt || 'Generated video';

  // Extract video-specific config from config or value
  const videoAutoplay = config?.autoplay ?? autoplay;
  const videoControls = config?.controls !== undefined ? config.controls : controls;
  const videoLoop = config?.loop ?? loop;
  const videoMuted = config?.muted ?? muted;
  const videoPoster = poster || config?.poster || value?.poster;
  const videoPlaysInline = config?.playsInline !== undefined ? config.playsInline : playsInline;

  // Fetch video content from API if video_id is provided
  useEffect(() => {
    if (!extractedVideoId) {
      // If we have direct URL or base64, use them
      if (base64Content && typeof base64Content === 'string' && base64Content.length > 0) {
        if (base64Content.startsWith('data:video/')) {
          setVideoSrc(base64Content);
        } else {
          setVideoSrc(`data:video/mp4;base64,${base64Content}`);
        }
      } else if (videoUrl && typeof videoUrl === 'string' && videoUrl.length > 0) {
        setVideoSrc(videoUrl);
      }
      return;
    }

    let blobUrl: string | null = null;
    let isMounted = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let isCheckingStatus = false; // Flag to prevent concurrent status checks

    // Check video status and poll if needed
    const checkVideoStatus = async (): Promise<{ shouldContinue: boolean; status: string | null; progress: number | null }> => {
      // Don't start a new check if one is already in progress
      if (isCheckingStatus || !isMounted) {
        return { shouldContinue: false, status: null, progress: null };
      }

      isCheckingStatus = true;
      try {
        const statusUrl = `/api/videos/${extractedVideoId}`;
        const response = await fetch(statusUrl, {
          method: 'GET',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          let errorMessage = `Failed to check video status: ${response.status} ${response.statusText}`;
          if (errorData.error) {
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            } else if (typeof errorData.error === 'object' && errorData.error !== null) {
              errorMessage = (errorData.error as any).message || (errorData.error as any).error || JSON.stringify(errorData.error);
            }
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        if (!result.success || !result.data) {
          isCheckingStatus = false;
          return { shouldContinue: false, status: null, progress: null };
        }

        const videoStatusData = result.data;
        const status = videoStatusData.status || null;
        const videoProgress = videoStatusData.progress !== null && videoStatusData.progress !== undefined ? videoStatusData.progress : null;

        if (isMounted) {
          setVideoStatus(status);
          setProgress(videoProgress);
        }

        // If status is completed or succeeded, stop polling immediately and fetch content
        if (status === 'completed' || status === 'succeeded') {
          // Stop polling immediately - don't continue
          isCheckingStatus = false;
          return { shouldContinue: false, status, progress: videoProgress };
        }

        // If video has a URL or file_path, it's ready - stop polling
        if (videoStatusData.url || videoStatusData.file_path) {
          isCheckingStatus = false;
          return { shouldContinue: false, status, progress: videoProgress };
        }

        // If status indicates error, stop polling
        if (status === 'failed' || status === 'error' || videoStatusData.error) {
          if (isMounted) {
            // Handle error object or string
            let errorMessage = 'Video generation failed';
            if (videoStatusData.error) {
              if (typeof videoStatusData.error === 'string') {
                errorMessage = videoStatusData.error;
              } else if (typeof videoStatusData.error === 'object' && videoStatusData.error !== null) {
                errorMessage = (videoStatusData.error as any).message || (videoStatusData.error as any).error || JSON.stringify(videoStatusData.error);
              }
            }
            setErrorSafe(errorMessage);
            setIsLoading(false);
          }
          isCheckingStatus = false;
          return { shouldContinue: false, status, progress: videoProgress };
        }

        // Continue polling for queued/processing statuses
        const shouldContinue = status === 'queued' || status === 'processing';
        isCheckingStatus = false;
        return { shouldContinue, status, progress: videoProgress };
      } catch (err) {
        console.error('Error checking video status:', err);
        if (isMounted) {
          setErrorSafe(err instanceof Error ? err.message : 'Failed to check video status');
          setIsLoading(false);
        }
        isCheckingStatus = false;
        return { shouldContinue: false, status: null, progress: null };
      }
    };

    // Fetch video content from API via proxy route
    const fetchVideoContent = async () => {
      try {
        // Use proxy API route to fetch video content (handles bearer token server-side)
        const apiUrl = `/api/videos/${extractedVideoId}/content`;
        
        const response = await fetch(apiUrl, {
          method: 'GET',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          let errorMessage = `Failed to fetch video: ${response.status} ${response.statusText}`;
          if (errorData.error) {
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            } else if (typeof errorData.error === 'object' && errorData.error !== null) {
              errorMessage = (errorData.error as any).message || (errorData.error as any).error || JSON.stringify(errorData.error);
            }
          }
          throw new Error(errorMessage);
        }

        // Get content type from response
        const contentType = response.headers.get('content-type') || 'video/mp4';
        
        // Clone response to check content type without consuming the body
        const responseClone = response.clone();
        
        // Check if response is actually JSON (error response)
        if (contentType.includes('application/json')) {
          try {
            const errorData = await responseClone.json();
            let errorMessage = 'Video content not available';
            if (errorData.error) {
              if (typeof errorData.error === 'string') {
                errorMessage = errorData.error;
              } else if (typeof errorData.error === 'object' && errorData.error !== null) {
                errorMessage = (errorData.error as any).message || (errorData.error as any).error || JSON.stringify(errorData.error);
              }
            } else if (errorData.message) {
              errorMessage = errorData.message;
            }
            throw new Error(errorMessage);
          } catch (err) {
            if (err instanceof Error && !err.message.includes('Video content not available')) {
              throw err;
            }
            // If JSON parsing fails, might still be video, continue
          }
        }

        // Create blob URL from response
        const blob = await response.blob();
        
        // Validate blob size
        if (blob.size === 0) {
          throw new Error('Video content is empty');
        }

        // Validate blob type
        if (!blob.type.startsWith('video/') && !contentType.startsWith('video/')) {
          console.warn('Unexpected content type for video:', blob.type || contentType);
        }
        
        blobUrl = URL.createObjectURL(blob);
        
        // Only update state if component is still mounted
        if (isMounted) {
          setVideoSrc(blobUrl);
          setVideoStatus('completed');
          setIsLoading(false);
          
          // Stop polling if it's still running (safety check)
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        } else {
          // Clean up if component unmounted
          URL.revokeObjectURL(blobUrl);
        }
      } catch (err) {
        console.error('Error fetching video content:', err);
        if (isMounted) {
          // If content fetch fails but status might be ready, don't set error immediately
          // The polling will continue and retry
          const errorMessage = err instanceof Error ? err.message : 'Failed to load video';
          // Only set error if we've been trying for a while
          if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
            // Video not ready yet, continue polling
            return;
          }
          setErrorSafe(errorMessage);
        }
      }
    };

    // Initial check and polling logic
    const startPolling = async () => {
      setIsLoading(true);
      setError(null);

      // Initial status check
      const statusResult = await checkVideoStatus();

      // If status is completed/failed or we shouldn't continue, stop polling immediately
      if (!statusResult.shouldContinue && isMounted) {
        // If status indicates completion, fetch content
        if (statusResult.status === 'completed' || statusResult.status === 'succeeded') {
          await fetchVideoContent();
        } else {
          setIsLoading(false);
        }
        return; // Exit - don't start polling interval
      }

      // If already completed, don't start polling
      if (statusResult.status === 'completed' || statusResult.status === 'succeeded') {
        await fetchVideoContent();
        return; // Exit - don't start polling interval
      }

      // Set up polling interval (every 2 seconds)
      pollInterval = setInterval(async () => {
        // Don't start new check if already checking or unmounted
        if (!isMounted || isCheckingStatus) {
          return;
        }

        const statusResult = await checkVideoStatus();
        
        if (!statusResult.shouldContinue) {
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }

          // If status is completed, fetch the video content
          if (isMounted && (statusResult.status === 'completed' || statusResult.status === 'succeeded')) {
            await fetchVideoContent();
          } else if (isMounted) {
            setIsLoading(false);
          }
        }
      }, 2000); // Poll every 2 seconds
    };

    startPolling();

    // Cleanup function
    return () => {
      isMounted = false;
      isCheckingStatus = false;
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [extractedVideoId, videoUrl, base64Content]);

  // Determine if we have a valid video source
  const hasVideoUrl = videoUrl && typeof videoUrl === 'string' && videoUrl.length > 0;
  const hasBase64Content = base64Content && typeof base64Content === 'string' && base64Content.length > 0;
  const hasVideoId = extractedVideoId && typeof extractedVideoId === 'string' && extractedVideoId.length > 0;

  // If no video source, return empty container instead of null to maintain Suspense boundary
  if (!hasVideoUrl && !hasBase64Content && !hasVideoId) {
    return (
      <div className={cn('relative overflow-hidden rounded-lg', className)} style={{ width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height, minHeight: '200px' }}>
        {/* Empty state - no video source provided */}
      </div>
    );
  }

  // Show loading state while fetching (when we have videoId but no videoSrc yet)
  // OR when explicitly loading
  if (isLoading || (hasVideoId && !videoSrc && !error)) {
    const statusMessage = videoStatus === 'queued'
      ? 'Video is queued for generation...'
      : videoStatus === 'processing'
        ? `Generating video... ${progress !== null ? `${progress.toFixed(0)}%` : ''}`
        : 'Loading video...';

    return (
      <div className={cn('relative overflow-hidden rounded-lg flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800', className)} style={{ width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height, minHeight: '200px' }}>
        <Loader2 className="h-8 w-8 animate-spin text-violet-600 dark:text-violet-400 mb-4" />
        <div className="text-gray-700 dark:text-gray-300 text-sm font-medium text-center mb-2">{statusMessage}</div>
        {progress !== null && (
          <div className="mt-4 w-3/4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-violet-600 dark:bg-violet-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show error state
  if (error && !videoSrc) {
    const errorMessage = typeof error === 'string' 
      ? error 
      : typeof error === 'object' && error !== null
      ? ((error as any).message || (error as any).error || JSON.stringify(error))
      : 'Unknown error';
    
    return (
      <div className={cn('relative overflow-hidden rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800', className)} style={{ width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height, minHeight: '200px' }}>
        <div className="text-center p-4">
          <div className="text-red-600 dark:text-red-400 font-medium mb-2">Error loading video</div>
          <div className="text-sm text-red-500 dark:text-red-500">{errorMessage}</div>
        </div>
      </div>
    );
  }

  // If no video source is ready yet and we don't have a videoId to fetch, return empty container
  // BUT if we have videoId, we should have shown loading state above
  if (!videoSrc && !hasVideoId) {
    return (
      <div className={cn('relative overflow-hidden rounded-lg', className)} style={{ width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height, minHeight: '200px' }}>
        {/* No video source available yet */}
      </div>
    );
  }

  const containerClasses = cn(
    'relative overflow-hidden rounded-lg',
    className
  );

  const containerStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    maxWidth: '100%',
  };

  const videoStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    objectFit: 'contain',
  };

  return (
    <div className={containerClasses} style={containerStyle}>
      {videoSrc && (
        <video
          src={videoSrc}
          controls={videoControls}
          autoPlay={videoAutoplay}
          loop={videoLoop}
          muted={videoMuted}
          poster={videoPoster}
          playsInline={videoPlaysInline}
          className="w-full h-full max-w-full rounded-lg"
          style={videoStyle}
          onError={(e) => {
            // Log error for debugging
            const target = e.target as HTMLVideoElement;
            const videoError = target.error;
            let errorMessage = 'Failed to load video content';
            
            if (videoError) {
              // MEDIA_ERR_ABORTED = 1
              // MEDIA_ERR_NETWORK = 2
              // MEDIA_ERR_DECODE = 3
              // MEDIA_ERR_SRC_NOT_SUPPORTED = 4
              const errorCode = videoError.code;
              const errorMsg = videoError.message;
              
              switch (errorCode) {
                case 1:
                  errorMessage = 'Video loading was aborted';
                  break;
                case 2:
                  errorMessage = 'Network error while loading video';
                  break;
                case 3:
                  errorMessage = 'Video decoding error - file may be corrupted or in unsupported format';
                  break;
                case 4:
                  errorMessage = 'Video format not supported by browser';
                  break;
                default:
                  errorMessage = errorMsg || `Video error (code: ${errorCode})`;
              }
              
              // Build error info object with only defined values
              const errorInfo: any = {
                networkState: target.networkState,
                readyState: target.readyState,
                src: videoSrc,
              };
              if (errorCode !== undefined && errorCode !== null) {
                errorInfo.code = errorCode;
              }
              if (errorMsg) {
                errorInfo.message = errorMsg;
              }
              console.error('Video load error:', errorInfo);
            } else {
              console.error('Video load error (no error object):', {
                networkState: target.networkState,
                readyState: target.readyState,
                src: videoSrc,
                errorType: e.type,
                currentSrc: target.currentSrc,
              });
            }
            
            // Hide video on error or show error message
            target.style.display = 'none';
            setErrorSafe(errorMessage);
          }}
          {...props}
        >
        {/* Fallback message for browsers that don't support video */}
        Your browser does not support the video tag.
        {videoAlt && (
          <track kind="captions" label={videoAlt} />
        )}
        </video>
      )}
      {error && !videoSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="text-center p-4">
            <div className="text-red-600 dark:text-red-400 font-medium mb-2">Error loading video</div>
            <div className="text-sm text-red-500 dark:text-red-500">
              {typeof error === 'string' ? error : typeof error === 'object' && error !== null 
                ? ((error as any).message || (error as any).error || JSON.stringify(error))
                : 'Unknown error'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

VideoViewer.displayName = 'VideoViewer';

