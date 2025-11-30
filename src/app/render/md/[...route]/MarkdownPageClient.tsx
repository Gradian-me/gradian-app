'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MarkdownViewer, MarkdownNavigation } from '@/gradian-ui/data-display/markdown';

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
    console.log('📞 onNavigationData callback called with:', data);
    setNavigationData(data);
  }, []);

  // Debug: Check if headings are being extracted (only log once or when data actually changes)
  useEffect(() => {
    if (!hasLoggedRef.current || navigationData.headings.length > 0) {
      console.log('=== Navigation Debug ===');
      console.log('Navigation heading levels prop:', navigationHeadingLevels);
      console.log('Navigation data:', navigationData);
      console.log('Headings count:', navigationData.headings?.length || 0);
      console.log('Headings:', navigationData.headings);
      console.log('Active heading ID:', navigationData.activeHeadingId);
      console.log('Will show navigation?', navigationData.headings && navigationData.headings.length > 0);
      console.log('======================');
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

