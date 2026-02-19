'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useUserStore } from '@/stores/user.store';
import { AccessDenied } from '@/gradian-ui/schema-manager/components/AccessDenied';
import { canAccessSystemAdminRoute, isSystemAdminRoute } from '@/gradian-ui/shared/utils/access-control';
import { SYSTEM_ADMIN_ROUTES } from '@/gradian-ui/shared/configs/auth-config';

interface SystemAdminRouteGuardProps {
  children: React.ReactNode;
}

/**
 * Wraps app children and enforces System Administrator access for routes
 * listed in SYSTEM_ADMIN_ROUTES. Renders AccessDenied or children.
 * Defers guard logic until after mount to avoid state-update-on-unmounted warnings
 * (e.g. from store hydration or HMR).
 */
export function SystemAdminRouteGuard({ children }: SystemAdminRouteGuardProps) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const user = useUserStore((s) => s.user);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isProtected = isSystemAdminRoute(pathname, SYSTEM_ADMIN_ROUTES);

  if (!mounted) {
    return isProtected ? null : <>{children}</>;
  }
  if (!isProtected) {
    return <>{children}</>;
  }

  if (!user) {
    return (
      <AccessDenied
        title="Authentication Required"
        description="You must be signed in to access this page."
        accessCheck={{ hasAccess: false, code: 'UNAUTHORIZED', reason: 'Sign in to access this page.' }}
        homeHref="/apps"
        showGoBackButton
      />
    );
  }

  if (!canAccessSystemAdminRoute(user)) {
    return (
      <AccessDenied
        title="Access Denied"
        description="This page is restricted to System Administrators."
        accessCheck={{
          hasAccess: false,
          code: 'ROLE_REQUIRED',
          requiredRole: 'System Administrator',
          reason: 'This page is only available to users with the System Administrator entity type.',
        }}
        homeHref="/apps"
        showGoBackButton
      />
    );
  }

  return <>{children}</>;
}
