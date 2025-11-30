import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Builder | Gradian',
  description: 'Transform your ideas into reality with the power of AI. Create schemas, applications, and more using intelligent AI agents.',
};

export default function AiBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

