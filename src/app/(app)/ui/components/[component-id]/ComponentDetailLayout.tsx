'use client';

import React from 'react';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';

interface ComponentDetailLayoutProps {
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
}

/**
 * Sets main layout title/subtitle/icon for component detail pages so the header shows the component name.
 */
export function ComponentDetailLayout({ title, subtitle, icon, children }: ComponentDetailLayoutProps) {
  useSetLayoutProps({ title, subtitle, icon });
  return <>{children}</>;
}
