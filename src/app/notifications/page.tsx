import { Suspense } from 'react';
import { NotificationsPage } from '@/domains/notifications/components/NotificationsPage';
import { ENABLE_NOTIFICATION } from '@/gradian-ui/shared/configs/env-config';
import { redirect } from 'next/navigation';

export default function Notifications() {
  if (!ENABLE_NOTIFICATION) {
    // Behave like schema pages: redirect to a route that renders AccessDenied inside MainLayout
    redirect('/notifications/forbidden');
  }

  return (
    <Suspense fallback={<div className="flex min-h-[200px] items-center justify-center text-muted-foreground">Loading…</div>}>
      <NotificationsPage />
    </Suspense>
  );
}