import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Prompt History | Gradian App',
  description: 'View and search through your AI prompt history. Track token usage, costs, response times, and more.',
};

export default function AiPromptsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

