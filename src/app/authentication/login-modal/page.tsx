'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SignInPage } from '@/components/ui/sign-in';
import { ensureFingerprintCookie } from '@/domains/auth/utils/fingerprint-cookie.util';
import { normalizeUsernameToEmail } from '@/domains/auth/utils/username-email.util';
import { useUserStore } from '@/stores/user.store';
import { useTenantStore } from '@/stores/tenant.store';
import { clearMenuItemsCache } from '@/stores/menu-items.store';
import { AUTH_CONFIG } from '@/gradian-ui/shared/configs/auth-config';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { toast } from 'sonner';
import { authTokenManager } from '@/gradian-ui/shared/utils/auth-token-manager';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import {
  createLoginSuccessMessage,
  validateMessageOrigin,
} from '@/gradian-ui/form-builder/types/embed-messages';
import { Logo } from '@/gradian-ui/layout/logo/components/Logo';
import { useLanguageStore } from '@/stores/language.store';
import { getT } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

const ACCESS_TOKEN_COOKIE = AUTH_CONFIG?.ACCESS_TOKEN_COOKIE || 'access_token';

type RelatedCompany = { id: string; label: string; logo?: string };
type EntityTypeItem = { id: string; icon?: string; color?: string; label?: string };
type StatusItem = { id: string; icon?: string; color?: string; label?: string };

function toRelatedCompanies(
  v: unknown
): Array<{ id: string; label: string; logo?: string }> | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) {
    return v.map((item) =>
      typeof item === 'string' ? { id: item, label: item } : { id: (item as RelatedCompany).id, label: (item as RelatedCompany).label ?? (item as RelatedCompany).id, logo: (item as RelatedCompany).logo }
    );
  }
  return undefined;
}

function toEntityType(v: unknown): Array<EntityTypeItem> | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) {
    return v.map((item) =>
      typeof item === 'string' ? { id: item } : (item as EntityTypeItem)
    );
  }
  return undefined;
}

function toStatus(v: unknown): Array<StatusItem> | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) {
    return v.map((item) =>
      typeof item === 'string' ? { id: item } : (item as StatusItem)
    );
  }
  if (typeof v === 'string') return [{ id: v }];
  return undefined;
}

const LOGIN_EMBED_ALLOWED_ORIGINS =
  typeof process.env.NEXT_PUBLIC_LOGIN_EMBED_ALLOWED_ORIGINS === 'string'
    ? process.env.NEXT_PUBLIC_LOGIN_EMBED_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

function isReturnOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin) return false;
  if (typeof window !== 'undefined' && origin === window.location.origin) return true;
  const event = { origin } as MessageEvent;
  if (LOGIN_EMBED_ALLOWED_ORIGINS.length === 0) return false;
  return validateMessageOrigin(event, LOGIN_EMBED_ALLOWED_ORIGINS);
}

function LoginModalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const language = useLanguageStore((s) => s.language);
  const t = (key: string) => getT(key, language);
  const { setUser } = useUserStore();
  const { selectedTenant } = useTenantStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  const returnOrigin = searchParams?.get('returnOrigin') || undefined;
  const modalMode = searchParams?.get('modalMode') === 'true';
  const tenantDomainFromQuery = searchParams?.get('tenantDomain') || undefined;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = t(TRANSLATION_KEYS.AUTH_TITLE_PAGE_LOGIN);

    ensureFingerprintCookie()
      .then((value) => {
        loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN-MODAL] Fingerprint initialized`);
        setFingerprint(value);
      })
      .catch((err) => {
        loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGIN-MODAL] Fingerprint init failed: ${err instanceof Error ? err.message : String(err)}`);
      });
  }, []);

  const handleEmbedSuccess = useCallback(() => {
    if (typeof window === 'undefined') return;

    const hasOpener = typeof window.opener !== 'undefined' && window.opener !== null && window.opener !== window;
    const isPopup = hasOpener && !modalMode;

    // No returnOrigin: close popup and reload opener, or reload parent (iframe modal)
    if (!returnOrigin) {
      if (isPopup && window.opener) {
        try {
          window.opener.location.reload();
        } catch (e) {
          loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGIN-MODAL] Opener reload failed: ${e instanceof Error ? e.message : String(e)}`);
        }
        window.close();
        return;
      }
      if (modalMode) {
        try {
          window.parent.location.reload();
        } catch (e) {
          loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGIN-MODAL] Parent reload failed: ${e instanceof Error ? e.message : String(e)}`);
        }
        return;
      }
      router.replace('/');
      return;
    }

    const allowed = isReturnOriginAllowed(returnOrigin);
    if (!allowed) {
      loggingCustom(LogType.CLIENT_LOG, 'warn', '[LOGIN-MODAL] returnOrigin not in allowlist; redirecting to home');
      router.replace('/');
      return;
    }

    if (isPopup && window.opener) {
      try {
        const openerOrigin = window.opener.location?.origin;
        if (openerOrigin !== returnOrigin) {
          loggingCustom(LogType.CLIENT_LOG, 'warn', '[LOGIN-MODAL] Opener origin does not match returnOrigin; closing without reload');
          window.close();
          return;
        }
        window.opener.location.reload();
      } catch (e) {
        loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGIN-MODAL] Opener reload failed (cross-origin): ${e instanceof Error ? e.message : String(e)}`);
      }
      window.close();
      return;
    }

    try {
      window.parent.postMessage(createLoginSuccessMessage(), returnOrigin);
    } catch (e) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `[LOGIN-MODAL] postMessage failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [returnOrigin, modalMode, router]);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGIN-MODAL] Login process started');
    setError(null);
    setStatusCode(null);
    event.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const emailInput = formData.get('email') as string;
      const password = formData.get('password') as string;

      if (!emailInput || !password) {
        const errorMessage = t(TRANSLATION_KEYS.AUTH_ERROR_ENTER_EMAIL_AND_PASSWORD);
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      const fingerprintValue = (await ensureFingerprintCookie()) ?? fingerprint;
      if (fingerprintValue) setFingerprint(fingerprintValue);

      let tenantWithDefaultDomain = selectedTenant;
      if (selectedTenant?.id && !selectedTenant?.defaultDomain) {
        try {
          const tenantResponse = await fetch(`/api/data/tenants/${selectedTenant.id}`);
          if (tenantResponse.ok) {
            const tenantData = await tenantResponse.json();
            if (tenantData.success && tenantData.data) tenantWithDefaultDomain = tenantData.data;
          }
        } catch {
          // ignore
        }
      }

      const email = normalizeUsernameToEmail(emailInput, tenantWithDefaultDomain || null);
      const currentHost = typeof window !== 'undefined' ? window.location.host : null;
      const sanitizedHost = currentHost?.replace(/[^a-zA-Z0-9.\-:]/g, '');
      const tenantDomainFromHost = selectedTenant?.domain || sanitizedHost || null;
      const tenantDomain =
        tenantDomainFromQuery && /^[a-zA-Z0-9.\-]+$/.test(tenantDomainFromQuery.trim())
          ? tenantDomainFromQuery.trim()
          : tenantDomainFromHost;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fingerprintValue ? { 'x-fingerprint': fingerprintValue } : {}),
        ...(tenantDomain ? { 'x-tenant-domain': tenantDomain } : {}),
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          emailOrUsername: email,
          password,
          deviceFingerprint: fingerprintValue,
        }),
      });

      let data: { success?: boolean; error?: string; message?: string; tokens?: { accessToken?: string }; user?: Record<string, unknown> };
      try {
        data = await response.json();
      } catch {
        setError(`Login failed with status ${response.status}`);
        setStatusCode(response.status);
        toast.error('Login failed');
        setIsLoading(false);
        return;
      }

      if (!response.ok || !data.success) {
        const errorMessage = data.error || `Login failed with status ${response.status}`;
        setError(errorMessage);
        setStatusCode(response.status);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      if (data.tokens?.accessToken) {
        authTokenManager.setAccessToken(data.tokens.accessToken);
      }
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        } catch {
          // ignore
        }
      }

      if (data.user) {
        const u = data.user as Record<string, unknown>;
        setUser({
          id: u.id as string,
          email: (u.email as string) ?? '',
          username: (u.username as string) ?? '',
          name: (u.name as string) ?? '',
          lastname: (u.lastname as string) ?? '',
          role: (u.role as 'admin' | 'procurement' | 'vendor') ?? 'vendor',
          department: u.department as string | undefined,
          avatar: u.avatar as string | undefined,
          relatedCompanies: toRelatedCompanies(u.relatedCompanies),
          entityType: toEntityType(u.entityType),
          status: toStatus(u.status),
          profile_id: u.profile_id as string | undefined,
          isAdmin: (u.isAdmin as boolean) ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        try {
          clearMenuItemsCache();
        } catch {
          // ignore
        }
      }

      toast.success(data.message || 'Login successful!');

      await new Promise((resolve) => setTimeout(resolve, 500));

      // With returnOrigin: use allowlist + postMessage/opener reload. Without: close popup + reload opener, or reload parent (iframe).
      handleEmbedSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during login. Please try again.';
      setError(errorMessage);
      setStatusCode(null);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  const handleResetPassword = () => {
    router.push('/authentication/reset-password');
  };

  const handleCreateAccount = () => {
    router.push('/authentication/sign-up');
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-3 sm:p-4 overflow-auto">
      <div className="w-full max-w-md min-w-0 shrink-0 rounded-xl sm:rounded-2xl border border-border bg-card shadow-lg p-4 sm:p-6 md:p-8">
        <div className="flex justify-center mb-4 sm:mb-6">
          <Logo variant="auto" width={120} height={40} />
        </div>
        <SignInPage
          embed
          showTestimonials={false}
          onSignIn={handleSignIn}
          onResetPassword={handleResetPassword}
          onCreateAccount={handleCreateAccount}
          error={error}
          statusCode={statusCode}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

export default function LoginModalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginModalContent />
    </Suspense>
  );
}
