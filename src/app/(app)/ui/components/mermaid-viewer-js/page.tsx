'use client';

import React from 'react';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { MermaidViewerJs } from './MermaidViewerJs';

export default function MermaidViewerJsPage() {
  useSetLayoutProps({
    title: 'Mermaid Viewer (CDN JS)',
    subtitle: 'Direct browser mermaid.js from CDN',
    icon: 'Workflow',
  });

  return <MermaidViewerJs />;
}

