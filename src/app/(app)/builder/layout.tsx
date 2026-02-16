import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Builder | Gradian',
  description: 'Configure schemas, integrations, and other builders for your application',
};

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

