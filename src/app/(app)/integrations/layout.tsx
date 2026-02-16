import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Integrations | Gradian',
  description: 'Manage connections to external systems and icon libraries',
};

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

