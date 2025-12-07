'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SignInPage } from '@/components/ui/sign-in';
import { ensureFingerprintCookie } from '@/domains/auth/utils/fingerprint-cookie.util';
import { useUserStore } from '@/stores/user.store';
import { useTenantStore } from '@/stores/tenant.store';
import { DEMO_MODE, AUTH_CONFIG } from '@/gradian-ui/shared/constants/application-variables';
import { TenantSelector } from '@/components/layout/TenantSelector';
import { Logo } from '@/gradian-ui/layout/logo/components/Logo';
import { toast } from 'sonner';
import { decryptReturnUrl } from '@/gradian-ui/shared/utils/url-encryption.util';

const ACCESS_TOKEN_COOKIE = AUTH_CONFIG?.ACCESS_TOKEN_COOKIE || 'access_token';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useUserStore();
  const { selectedTenant } = useTenantStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = 'Login | Gradian';

    // Decrypt returnUrl from query parameters
    const encryptedReturnUrl = searchParams.get('returnUrl');
    if (encryptedReturnUrl) {
      console.log('[LOGIN] Found encrypted returnUrl in query params:', encryptedReturnUrl);
      const decrypted = decryptReturnUrl(encryptedReturnUrl);
      if (decrypted) {
        console.log('[LOGIN] Successfully decrypted returnUrl:', decrypted);
        setReturnUrl(decrypted);
      } else {
        console.warn('[LOGIN] Failed to decrypt returnUrl, using default');
        console.warn('[LOGIN] Encrypted value was:', encryptedReturnUrl);
      }
    } else {
      console.log('[LOGIN] No returnUrl found in query params');
    }

    console.log('[LOGIN] Page loaded, initializing fingerprint...');
    ensureFingerprintCookie()
      .then((value) => {
        console.log('[LOGIN] Fingerprint initialized:', value);
        setFingerprint(value);
      })
      .catch((err) => {
        console.warn('[LOGIN] Fingerprint init failed:', err);
      });
  }, [searchParams]);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    console.log('[LOGIN] ========== LOGIN PROCESS STARTED ==========');
    setError(null);
    setErrorDetails(null);
    event.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      console.log('[LOGIN] Form data extracted:', {
        email: email ? `${email.substring(0, 3)}***` : 'missing',
        password: password ? '***' : 'missing',
        hasEmail: !!email,
        hasPassword: !!password,
      });

      if (!email || !password) {
        const errorMessage = 'Please enter both email and password';
        console.log('[LOGIN] Validation failed:', errorMessage);
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      console.log('[LOGIN] Getting fingerprint...');
      const fingerprintValue = (await ensureFingerprintCookie()) ?? fingerprint;
      console.log('[LOGIN] Fingerprint value:', fingerprintValue);
      if (fingerprintValue) {
        setFingerprint(fingerprintValue);
      }

      // Get tenant domain for x-tenant-domain header in demo mode
      const tenantDomain = selectedTenant?.domain || null;
      console.log('[LOGIN] Tenant domain:', tenantDomain);
      console.log('[LOGIN] Selected tenant:', selectedTenant);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fingerprintValue ? { 'x-fingerprint': fingerprintValue } : {}),
        ...(tenantDomain ? { 'x-tenant-domain': tenantDomain } : {}),
      };

      const requestBody = {
        emailOrUsername: email,
        password,
        deviceFingerprint: fingerprintValue,
      };

      console.log('[LOGIN] Request details:', {
        url: '/api/auth/login',
        method: 'POST',
        headers: {
          ...headers,
          // Mask sensitive data in logs
          'x-fingerprint': headers['x-fingerprint'] ? `${headers['x-fingerprint'].substring(0, 8)}***` : undefined,
        },
        body: {
          emailOrUsername: email,
          password: '***MASKED***',
          deviceFingerprint: fingerprintValue ? `${fingerprintValue.substring(0, 8)}***` : null,
        },
      });

      let response: Response;
      let data: any;
      
      try {
        console.log('[LOGIN] Sending fetch request to /api/auth/login...');
        const fetchStartTime = Date.now();
        
        response = await fetch('/api/auth/login', {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });

        const fetchDuration = Date.now() - fetchStartTime;
        console.log('[LOGIN] Fetch completed:', {
          duration: `${fetchDuration}ms`,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
        });

        // Clone response to read as text if JSON parsing fails
        const responseClone = response.clone();
        
        try {
          console.log('[LOGIN] Parsing response as JSON...');
          data = await response.json();
          console.log('[LOGIN] Response data received:', {
            success: data.success,
            hasUser: !!data.user,
            hasTokens: !!data.tokens,
            message: data.message,
            error: data.error,
            fullData: JSON.stringify(data, null, 2),
          });
        } catch (jsonError) {
          console.error('[LOGIN] Failed to parse response as JSON:', jsonError);
          // If JSON parsing fails, read as text
          const text = await responseClone.text().catch(() => 'Unable to read response');
          console.log('[LOGIN] Response as text:', text);
          const errorMessage = `Login failed with status ${response.status}`;
          const details = `Status: ${response.status} ${response.statusText}\n\nResponse body:\n${text}`;
          setError(errorMessage);
          setErrorDetails(details);
          toast.error(errorMessage);
          setIsLoading(false);
          return;
        }

        if (!response.ok || !data.success) {
          console.error('[LOGIN] Login failed:', {
            responseOk: response.ok,
            dataSuccess: data.success,
            status: response.status,
            statusText: response.statusText,
            error: data.error,
            message: data.message,
            fullResponse: data,
          });
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

        console.log('[LOGIN] Login successful!');
      } catch (fetchError) {
        // Network error or fetch failed
        console.error('[LOGIN] Fetch error occurred:', {
          error: fetchError,
          message: fetchError instanceof Error ? fetchError.message : String(fetchError),
          stack: fetchError instanceof Error ? fetchError.stack : undefined,
          name: fetchError instanceof Error ? fetchError.name : undefined,
        });
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
      
      console.log('[LOGIN] Cleaning up localStorage tokens...');
      // Clean up any existing tokens in localStorage for security
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          console.log('[LOGIN] localStorage tokens cleared');
        } catch (error) {
          console.warn('[LOGIN] Failed to clear tokens from localStorage:', error);
        }
      }

      if (data.user) {
        console.log('[LOGIN] Setting user in store:', {
          id: data.user.id,
          email: data.user.email,
          username: data.user.username,
          name: data.user.name,
          role: data.user.role,
          hasAvatar: !!data.user.avatar,
        });
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
        console.log('[LOGIN] User set in store successfully');
      } else {
        console.warn('[LOGIN] No user data in response');
      }

      console.log('[LOGIN] Showing success toast...');
      toast.success(data.message || 'Login successful!');
      
      // Get returnUrl from searchParams directly (in case state wasn't updated yet)
      const encryptedReturnUrl = searchParams.get('returnUrl');
      let redirectTo = '/';
      
      if (encryptedReturnUrl) {
        console.log('[LOGIN] Attempting to decrypt returnUrl from searchParams:', encryptedReturnUrl);
        const decrypted = decryptReturnUrl(encryptedReturnUrl);
        if (decrypted) {
          console.log('[LOGIN] Successfully decrypted returnUrl:', decrypted);
          redirectTo = decrypted;
        } else {
          console.warn('[LOGIN] Failed to decrypt returnUrl, using default');
        }
      } else if (returnUrl) {
        // Fallback to state if searchParams doesn't have it
        console.log('[LOGIN] Using returnUrl from state:', returnUrl);
        redirectTo = returnUrl;
      }
      
      console.log('[LOGIN] Final redirect destination:', redirectTo);
      
      // Prevent redirect loop - if redirecting to login page, go to home instead
      if (redirectTo.startsWith('/authentication/login') || redirectTo === '/authentication') {
        console.warn('[LOGIN] Redirect destination is login page, redirecting to home instead');
        redirectTo = '/';
      }
      
      console.log('[LOGIN] Waiting for auth cookies to be set before redirecting...');
      
      // Wait longer to ensure cookies are set by the browser and available for the next request
      // Keep isLoading true during this time so button stays disabled
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify cookie is set (optional check - httpOnly cookies won't be visible in JS)
      if (typeof document !== 'undefined') {
        const cookies = document.cookie;
        const hasAuthCookie = cookies.includes('access_token=') || cookies.includes(ACCESS_TOKEN_COOKIE + '=');
        console.log('[LOGIN] Auth cookie check:', hasAuthCookie ? 'Found' : 'Not found (may be httpOnly)');
        console.log('[LOGIN] All cookies:', cookies ? cookies.split(';').map(c => c.trim().split('=')[0]).join(', ') : 'None');
      }
      
      console.log('[LOGIN] Redirecting to:', redirectTo);
      
      // Use router.replace to navigate while preserving cookies
      // This ensures cookies are sent with the navigation
      // Keep isLoading true - button will stay disabled during redirect
      router.replace(redirectTo);
      
      // Don't set isLoading to false - keep button disabled during redirect
      // The page will navigate away, so state will reset
      console.log('[LOGIN] ========== LOGIN PROCESS COMPLETED SUCCESSFULLY ==========');
    } catch (error) {
      console.error('[LOGIN] ========== LOGIN ERROR OCCURRED ==========');
      console.error('[LOGIN] Error details:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        cause: error instanceof Error ? error.cause : undefined,
      });
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
      console.error('[LOGIN] ========== LOGIN PROCESS ENDED WITH ERROR ==========');
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

