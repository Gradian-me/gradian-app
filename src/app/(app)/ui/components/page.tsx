import React from 'react';
import { ALL_COMPONENTS } from '@/gradian-ui/shared/components/component-registry';
import { ComponentsShowcaseClient } from './ComponentsShowcaseClient';

export default function ComponentsShowcasePage() {
  return <ComponentsShowcaseClient components={ALL_COMPONENTS} />;
}
