'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignInPage } from '@/components/ui/sign-in';
import { ensureFingerprintCookie } from '@/domains/auth/utils/fingerprint-cookie.util';
import { useUserStore } from '@/stores/user.store';
import { useTenantStore } from '@/stores/tenant.store';
import { DEMO_MODE } from '@/gradian-ui/shared/constants/application-variables';
import { TenantSelector } from '@/components/layout/TenantSelector';
import { Logo } from '@/gradian-ui/layout/logo/components/Logo';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useUserStore();
  const { selectedTenant } = useTenantStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = 'Login | Gradian';

    ensureFingerprintCookie()
      .then((value) => setFingerprint(value))
      .catch((err) => console.warn('[login] fingerprint init failed:', err));
  }, []);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    setError(null);
    setErrorDetails(null);
    event.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      if (!email || !password) {
        const errorMessage = 'Please enter both email and password';
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      const fingerprintValue = (await ensureFingerprintCookie()) ?? fingerprint;
      if (fingerprintValue) {
        setFingerprint(fingerprintValue);
      }

      // Get tenant domain for x-tenant-domain header in demo mode
      const tenantDomain = selectedTenant?.domain || null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fingerprintValue ? { 'x-fingerprint': fingerprintValue } : {}),
        ...(tenantDomain ? { 'x-tenant-domain': tenantDomain } : {}),
      };

      let response: Response;
      let data: any;
      
      try {
        response = await fetch('/api/auth/login', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            emailOrUsername: email,
            password,
            deviceFingerprint: fingerprintValue,
          }),
        });

        // Clone response to read as text if JSON parsing fails
        const responseClone = response.clone();
        
        try {
          data = await response.json();
        } catch (jsonError) {
          // If JSON parsing fails, read as text
          const text = await responseClone.text().catch(() => 'Unable to read response');
          const errorMessage = `Login failed with status ${response.status}`;
          const details = `Status: ${response.status} ${response.statusText}\n\nResponse body:\n${text}`;
          setError(errorMessage);
          setErrorDetails(details);
          toast.error(errorMessage);
          setIsLoading(false);
          return;
        }

        if (!response.ok || !data.success) {
          const errorMessage = data.error || `Login failed with status ${response.status}`;
          const details = [
            `Status: ${response.status} ${response.statusText}`,
            data.error ? `Error: ${data.error}` : '',
            data.message ? `Message: ${data.message}` : '',
            Object.keys(data).length > 0 ? `\nFull response:\n${JSON.stringify(data, null, 2)}` : '',
          ].filter(Boolean).join('\n');
          setError(errorMessage);
          setErrorDetails(details);
          toast.error(errorMessage);
          setIsLoading(false);
          return;
        }
      } catch (fetchError) {
        // Network error or fetch failed
        const errorMessage = 'Network error: Failed to connect to the server';
        const details = [
          `Error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
          fetchError instanceof Error && fetchError.stack ? `\nStack trace:\n${fetchError.stack}` : '',
        ].filter(Boolean).join('\n');
        setError(errorMessage);
        setErrorDetails(details);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      // SECURITY: Tokens are stored in httpOnly cookies by the server
      // Do not store tokens in localStorage as they are accessible to JavaScript
      // and visible in browser DevTools. Cookies are automatically sent with requests.
      
      // Clean up any existing tokens in localStorage for security
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
        } catch (error) {
          console.warn('[Security] Failed to clear tokens from localStorage:', error);
        }
      }

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          username: data.user.username,
          name: data.user.name,
          lastname: data.user.lastname,
          role: data.user.role as 'admin' | 'procurement' | 'vendor',
          department: data.user.department,
          avatar: data.user.avatar,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      toast.success(data.message || 'Login successful!');
      router.push('/');
      setIsLoading(false);
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during login. Please try again.';
      const details = [
        `Error: ${errorMessage}`,
        error instanceof Error && error.stack ? `\nStack trace:\n${error.stack}` : '',
        error instanceof Error && error.cause ? `\nCause: ${error.cause}` : '',
      ].filter(Boolean).join('\n');
      setError(errorMessage);
      setErrorDetails(details);
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
    <>
      {DEMO_MODE && (
        <div className="fixed top-4 right-4 z-50 w-64">
          <TenantSelector placeholder="Select tenant" />
        </div>
      )}
      <div className="fixed top-8 left-8 z-50">
        <Logo variant="auto" width={140} height={46} />
      </div>
      <SignInPage
        //heroImageSrc="/screenshots/gradian.me_bg_desktop.png"
        showTestimonials={false}
        onSignIn={handleSignIn}
        onResetPassword={handleResetPassword}
        onCreateAccount={handleCreateAccount}
        error={error}
        errorDetails={errorDetails}
        isLoading={isLoading}
      />
    </>
  );
}

