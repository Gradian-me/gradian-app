import { redirect } from 'next/navigation';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { getCurrentUser } from '@/gradian-ui/shared/utils/server-auth.util';
import { REQUIRE_LOGIN } from '@/gradian-ui/shared/configs/env-config';

/**
 * App layout for (app) route group.
 * Validates auth on the server before rendering any page so that login/session
 * issues result in a redirect to login instead of "Schema Not Found" or other
 * confusing errors when API calls fail due to missing auth.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (REQUIRE_LOGIN) {
    const user = await getCurrentUser();
    if (!user) {
      redirect('/authentication/login');
    }
  }

  return <AppShellLayout>{children}</AppShellLayout>;
}
