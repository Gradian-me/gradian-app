'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';

/** Map pathname (under /ui/components) to layout title and optional icon for main layout header. */
const PATH_TITLE_MAP: Record<string, { title: string; icon?: string }> = {
  '/ui/components': { title: 'Components', icon: 'Layers' },
  '/ui/components/barcode-scanner': { title: 'Barcode Scanner', icon: 'ScanBarcode' },
  '/ui/components/haptic-feedback': { title: 'Haptic feedback', icon: 'Smartphone' },
  '/ui/components/popup-picker': { title: 'PopupPicker', icon: 'List' },
  '/ui/components/ticket-card': { title: 'Ticket Card', icon: 'Ticket' },
  '/ui/components/signature-pad': { title: 'Signature Pad', icon: 'PenTool' },
  '/ui/components/mermaid-viewer-js': { title: 'Mermaid Viewer (CDN JS)', icon: 'Diagram3' },
  '/ui/components/mermaid-viewer-new': { title: 'Mermaid Viewer (New)', icon: 'Diagram3' },
  '/ui/components/mermaid-viewer': { title: 'Mermaid Viewer', icon: 'Diagram3' },
  '/ui/components/date-picker-calendar': { title: 'DatePickerCalendar', icon: 'Calendar' },
  '/ui/components/graph-viewer': { title: 'Graph Viewer', icon: 'GitBranch' },
  '/ui/components/permissions': { title: 'Permissions Test', icon: 'Shield' },
  '/ui/components/video': { title: 'Video Viewer', icon: 'Video' },
  '/ui/components/dynamic-query-table': { title: 'Dynamic Query Table Component', icon: 'Table' },
  '/ui/components/data-grid': { title: 'Data Grid Component', icon: 'Table' },
  '/ui/components/data-grid/simple': { title: 'Simple Data Grid Component', icon: 'Table' },
  '/ui/components/markdown': { title: 'Markdown Component', icon: 'FileText' },
};

/**
 * Layout for /ui/components: sets main layout title from pathname so the header
 * shows the correct title on direct load and when navigating. Dynamic routes
 * (e.g. [component-id], video/[videoId]) rely on their page to set title.
 */
export default function UiComponentsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setLayoutProps } = useLayoutProps();

  useEffect(() => {
    if (!pathname) return;
    const exact = PATH_TITLE_MAP[pathname];
    if (exact) {
      setLayoutProps({ title: exact.title, icon: exact.icon });
      return;
    }
    if (pathname.startsWith('/ui/components/video/')) {
      setLayoutProps({ title: 'Video Viewer', icon: 'Video' });
    }
  }, [pathname, setLayoutProps]);

  return <>{children}</>;
}
