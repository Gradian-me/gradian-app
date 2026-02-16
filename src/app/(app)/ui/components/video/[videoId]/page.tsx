'use client';

import { useParams } from 'next/navigation';
import { VideoViewer } from '@/gradian-ui/form-builder/form-elements/components/VideoViewer';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';

export default function VideoViewerPage() {
  const params = useParams();
  const videoId = params?.videoId as string;
  useSetLayoutProps({ title: 'Video Viewer' });

  if (!videoId) {
    return (
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Video ID Required
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Please provide a video ID in the URL.
                </p>
              </div>
            </div>
          </div>
        </div>
    );
  }

  return (
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
          </div>
        </div>
      </div>
  );
}

