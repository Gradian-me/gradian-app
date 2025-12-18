'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MarkdownViewer, MarkdownNavigation } from '@/gradian-ui/data-display/markdown';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

interface MarkdownPageClientProps {
  content: string;
  navigationHeadingLevels?: number[];
  stickyHeadings?: string[];
}

export function MarkdownPageClient({ 
  content, 
  navigationHeadingLevels = [],
  stickyHeadings = []
}: MarkdownPageClientProps) {
  const [navigationData, setNavigationData] = useState<{
    headings: Array<{ id: string; text: string; level: number }>;
    activeHeadingId?: string;
  }>({ headings: [] });

  // Use ref to track if we've logged initial state
  const hasLoggedRef = useRef(false);

  // Stable callback for onNavigationData
  const handleNavigationData = useCallback((data: {
    headings: Array<{ id: string; text: string; level: number }>;
    activeHeadingId?: string;
  }) => {
    loggingCustom(LogType.CLIENT_LOG, 'log', `📞 onNavigationData callback called with: ${JSON.stringify(data)}`);
    setNavigationData(data);
  }, []);

  // Debug: Check if headings are being extracted (only log once or when data actually changes)
  useEffect(() => {
    if (!hasLoggedRef.current || navigationData.headings.length > 0) {
      loggingCustom(LogType.CLIENT_LOG, 'log', '=== Navigation Debug ===');
      loggingCustom(LogType.CLIENT_LOG, 'log', `Navigation heading levels prop: ${JSON.stringify(navigationHeadingLevels)}`);
      loggingCustom(LogType.CLIENT_LOG, 'log', `Navigation data: ${JSON.stringify(navigationData)}`);
      loggingCustom(LogType.CLIENT_LOG, 'log', `Headings count: ${navigationData.headings?.length || 0}`);
      loggingCustom(LogType.CLIENT_LOG, 'log', `Headings: ${JSON.stringify(navigationData.headings)}`);
      loggingCustom(LogType.CLIENT_LOG, 'log', `Active heading ID: ${navigationData.activeHeadingId}`);
      loggingCustom(LogType.CLIENT_LOG, 'log', `Will show navigation? ${navigationData.headings && navigationData.headings.length > 0}`);
      loggingCustom(LogType.CLIENT_LOG, 'log', '======================');
      hasLoggedRef.current = true;
    }
  }, [navigationData.headings.length, navigationHeadingLevels]);

  return (
    <div className="flex gap-8 relative">
      {/* Main markdown content */}
      <div className="flex-1 min-w-0">
        <MarkdownViewer
          content={content}
          showToggle={true}
          stickyHeadings={stickyHeadings}
          navigationHeadingLevels={navigationHeadingLevels}
          onNavigationData={handleNavigationData}
        />
      </div>

      {/* Navigation - positioned at top right, outside main container */}
      {navigationData.headings && navigationData.headings.length > 0 && (
        <div className="hidden lg:block shrink-0 w-64">
          <div className="sticky top-20">
            <MarkdownNavigation
              headings={navigationData.headings}
              activeHeadingId={navigationData.activeHeadingId}
            />
          </div>
        </div>
      )}
    </div>
  );
}

