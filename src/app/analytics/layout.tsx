import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics | Gradian',
  description: 'View analytics, reports, and insights for your data',
};

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

