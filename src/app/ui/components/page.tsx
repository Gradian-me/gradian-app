 'use client';
import React from 'react';
import { AllComponents } from '@/gradian-ui/shared/components/AllComponents';
import { MainLayout } from '@/components/layout/main-layout';

export default function ComponentsShowcasePage() {
  return (
    <MainLayout
      title="Components"
      subtitle="UI components wiki and live samples"
      icon="Layers"
    >
      <AllComponents />
    </MainLayout>
  );
}


