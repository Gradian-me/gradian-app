import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tender Calendar | Gradian',
  description: 'View and manage tender calendar events and deadlines',
};

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

