import { Metadata } from 'next';
import { DashboardPage } from '@/domains/dashboard/components/DashboardPage';

export const metadata: Metadata = {
  title: 'Dashboard | Gradian',
  description: 'Overview of your data and key metrics',
};

export default function Dashboard() {
  return <DashboardPage />;
}
