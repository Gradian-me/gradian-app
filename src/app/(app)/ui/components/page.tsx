'use client';

import React from 'react';
import { AllComponents } from '@/gradian-ui/shared/components/AllComponents';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';

export default function ComponentsShowcasePage() {
  useSetLayoutProps({
    title: 'Components',
    subtitle: 'UI components wiki and live samples',
    icon: 'Layers',
  });

  return <AllComponents />;
}


