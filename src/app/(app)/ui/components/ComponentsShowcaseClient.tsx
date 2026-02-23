'use client';

import React from 'react';
import { AllComponents } from '@/gradian-ui/shared/components/AllComponents';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import type { ComponentMeta } from '@/gradian-ui/shared/components/component-registry';

interface ComponentsShowcaseClientProps {
  components: ComponentMeta[];
}

export function ComponentsShowcaseClient({ components }: ComponentsShowcaseClientProps) {
  useSetLayoutProps({
    title: 'Components',
    subtitle: 'UI components wiki and live samples',
    icon: 'Layers',
  });

  return <AllComponents initialComponents={components} />;
}
