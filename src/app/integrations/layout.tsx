import { Metadata } from 'next';

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

