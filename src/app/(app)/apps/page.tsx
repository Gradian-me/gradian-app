import { Metadata } from 'next';
import { AppListWrapper } from '@/gradian-ui/layout/app-list';

export const metadata: Metadata = {
  title: 'Apps | Gradian',
  description: 'Browse and launch apps powered by your dynamic schemas.',
};

export default function AppsPage() {
  return <AppListWrapper />;
}


