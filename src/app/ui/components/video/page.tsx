'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { VideoViewer } from '@/gradian-ui/form-builder/form-elements/components/VideoViewer';
import { MainLayout } from '@/components/layout/main-layout';
import { Loader2, Video, List, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface VideoItem {
  id: string;
  object: string;
  status: string;
  created_at?: number | null;
  completed_at?: number | null;
  expires_at?: number | null;
  error?: string | { code?: number; message?: string } | null;
  model?: string;
  progress?: number | null;
  prompt?: string;
  remixed_from_video_id?: string | null;
  seconds?: string | number | null;
  size?: string | null;
}

interface VideoListResponse {
  object: string;
  data: VideoItem[];
  first_id?: string;
  last_id?: string;
  has_more?: boolean;
}

function VideoPageContent() {
  const searchParams = useSearchParams();
  const videoId = searchParams.get('id') || searchParams.get('videoId') || searchParams.get('video_id');
  const [videoList, setVideoList] = useState<VideoListResponse | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const fetchVideoList = async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const response = await fetch('/api/videos', {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch video list: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        // The API returns { object: "list", data: [...], ... }
        // result.data is the entire API response object
        setVideoList(result.data);
        setShowList(true);
      } else {
        throw new Error(result.error || 'Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching video list:', error);
      setListError(error instanceof Error ? error.message : 'Failed to fetch video list');
    } finally {
      setIsLoadingList(false);
    }
  };

  const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'succeeded':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
      case 'processing':
      case 'queued':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      case 'failed':
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800';
    }
  };

  useEffect(() => {
    if (!videoId) return;

    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isFetching = false; // Flag to prevent concurrent requests

    // Fetch video status for debugging - returns true if polling should stop
    const fetchDebugInfo = async (): Promise<boolean> => {
      // Don't start a new request if one is already in progress
      if (isFetching || !isMounted) {
        return false;
      }

      isFetching = true;

      try {
        const statusResponse = await fetch(`/api/videos/${videoId}`);
        if (!isMounted) {
          isFetching = false;
          return true;
        }

        if (!statusResponse.ok) {
          isFetching = false;
          return true; // Stop polling on error
        }

        const statusData = await statusResponse.json();
        if (!isMounted) {
          isFetching = false;
          return true;
        }

        if (statusData.success && statusData.data) {
          setDebugInfo(statusData.data);
          
          // Stop polling if video is completed or failed
          const status = statusData.data.status?.toLowerCase();
          if (status === 'completed' || status === 'succeeded' || status === 'failed' || status === 'error') {
            isFetching = false;
            return true; // Stop polling
          }
        }

        isFetching = false;
        return false; // Continue polling
      } catch (error) {
        console.error('Error fetching video debug info:', error);
        isFetching = false;
        return true; // Stop polling on error
      }
    };

    // Initial fetch
    fetchDebugInfo();

    // Set up polling interval (every 2 seconds)
    intervalId = setInterval(() => {
      fetchDebugInfo().then((shouldStop) => {
        if (shouldStop && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      });
    }, 2000);

    // Cleanup
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [videoId]);

  if (!videoId) {
    return (
      <MainLayout title="Video Viewer">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Video Viewer
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    No video ID provided in the URL query parameters.
                  </p>
                </div>
                <Button
                  onClick={fetchVideoList}
                  disabled={isLoadingList}
                  variant="default"
                  className="flex items-center gap-2"
                >
                  {isLoadingList ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <List className="h-4 w-4" />
                      List Videos
                    </>
                  )}
                </Button>
              </div>

              {listError && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>
                </div>
              )}

              {(showList || videoList) && videoList && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Video List ({videoList.data?.length || 0} videos)
                    </h3>
                    {videoList.has_more && (
                      <Badge variant="outline" className="text-xs">
                        Has more videos
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {videoList.data && videoList.data.length > 0 ? (
                      videoList.data.map((video) => (
                        <div
                          key={video.id}
                          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                          onClick={() => {
                            window.location.href = `/ui/components/video?id=${video.id}`;
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                  {video.id}
                                </h4>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${getStatusBadgeClasses(video.status)}`}
                                >
                                  {video.status || 'unknown'}
                                </Badge>
                              </div>
                              {video.prompt && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                  {video.prompt}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                                {video.model && (
                                  <span>
                                    Model: <span className="font-medium">{video.model}</span>
                                  </span>
                                )}
                                {video.size && (
                                  <span>
                                    Size: <span className="font-medium">{video.size}</span>
                                  </span>
                                )}
                                {video.seconds && (
                                  <span>
                                    Duration: <span className="font-medium">{video.seconds}s</span>
                                  </span>
                                )}
                                {video.progress !== null && video.progress !== undefined && (
                                  <span>
                                    Progress: <span className="font-medium">{video.progress}%</span>
                                  </span>
                                )}
                              </div>
                              {video.created_at && (
                                <p className="text-xs text-gray-400 dark:text-gray-600 mt-2">
                                  Created: {formatDate(video.created_at)}
                                </p>
                              )}
                              {video.error && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                                  Error: {typeof video.error === 'string' 
                                    ? video.error 
                                    : typeof video.error === 'object' && video.error !== null
                                    ? (video.error.message || video.error.code || JSON.stringify(video.error))
                                    : String(video.error)}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `/ui/components/video?id=${video.id}`;
                                }}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                              >
                                <Play className="h-4 w-4" />
                                View
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No videos found
                      </div>
                    )}
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-500 dark:text-gray-500 mt-6">
                Example: <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">/ui/components/video?id=video_xxx</code>
              </p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Video Viewer">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <div className="mb-4">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Video Viewer
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Video ID: <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-xs">{videoId}</code>
              </p>
            </div>

            {/* Debug Information */}
            {debugInfo && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Debug Information
                </h3>
                <div className="space-y-1 text-xs font-mono">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>{' '}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{debugInfo.status || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Progress:</span>{' '}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{debugInfo.progress ?? 'N/A'}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">URL:</span>{' '}
                    <span className="text-blue-600 dark:text-blue-400 break-all">{debugInfo.url || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">File Path:</span>{' '}
                    <span className="text-blue-600 dark:text-blue-400 break-all">{debugInfo.file_path || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Error:</span>{' '}
                    <span className="text-red-600 dark:text-red-400">{debugInfo.error || 'None'}</span>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                      Full Debug Data
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-auto max-h-64">
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            )}

            <div className="w-full">
              <VideoViewer
                videoId={videoId}
                alt="Video"
                className="w-full rounded-lg"
                controls={true}
                autoplay={false}
                loop={false}
                muted={false}
              />
            </div>

            {/* Raw Video Element for Debugging */}
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                Debug: Raw Video Element
              </h3>
              <div className="w-full">
                <video
                  src={debugInfo?.url ? undefined : `/api/videos/${videoId}/content`}
                  controls
                  className="w-full rounded-lg"
                  style={{ maxHeight: '400px' }}
                  onError={(e) => {
                    console.error('Raw video element error:', e);
                    const target = e.target as HTMLVideoElement;
                    console.error('Video error code:', target.error?.code);
                    console.error('Video error message:', target.error?.message);
                  }}
                  onLoadStart={() => console.log('Video load started')}
                  onLoadedData={() => console.log('Video data loaded')}
                  onCanPlay={() => console.log('Video can play')}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                This is a debug video element that always shows. Check browser console for events.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default function VideoPage() {
  return (
    <Suspense fallback={
      <MainLayout title="Video Viewer">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    }>
      <VideoPageContent />
    </Suspense>
  );
}

