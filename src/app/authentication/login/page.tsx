'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SignInPage } from '@/components/ui/sign-in';
import { ensureFingerprintCookie } from '@/domains/auth/utils/fingerprint-cookie.util';
import { normalizeUsernameToEmail } from '@/domains/auth/utils/username-email.util';
import { useUserStore } from '@/stores/user.store';
import { useTenantStore } from '@/stores/tenant.store';
import { useMenuItemsStore } from '@/stores/menu-items.store';
import { DEMO_MODE, AUTH_CONFIG, LogType } from '@/gradian-ui/shared/constants/application-variables';
import { TenantSelector } from '@/components/layout/TenantSelector';
import { Logo } from '@/gradian-ui/layout/logo/components/Logo';
import { toast } from 'sonner';
import { decryptReturnUrl } from '@/gradian-ui/shared/utils/url-encryption.util';
import { authTokenManager } from '@/gradian-ui/shared/utils/auth-token-manager';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';

const ACCESS_TOKEN_COOKIE = AUTH_CONFIG?.ACCESS_TOKEN_COOKIE || 'access_token';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useUserStore();
  const [isMounted, setIsMounted] = useState(false);
  
  // Ensure client-side only rendering to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);
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
      loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Found encrypted returnUrl in query params: ${encryptedReturnUrl}`);
      try {
        const decrypted = decryptReturnUrl(encryptedReturnUrl);
        if (decrypted) {
          loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Successfully decrypted returnUrl: ${decrypted}`);
          setReturnUrl(decrypted);
        } else {
          loggingCustom(LogType.CLIENT_LOG, 'warn', '[LOGIN] Failed to decrypt returnUrl (invalid/corrupted/expired), using default');
          loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGIN] Encrypted value was: ${encryptedReturnUrl}`);
        }
      } catch (error) {
        // Error is already logged by decryptReturnUrl, just prevent crash
        loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGIN] Exception during returnUrl decryption, using default: ${JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        })}`);
      }
    } else {
      loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGIN] No returnUrl found in query params');
    }

    loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGIN] Page loaded, initializing fingerprint...');
    ensureFingerprintCookie()
      .then((value) => {
        loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Fingerprint initialized: ${value}`);
        setFingerprint(value);
      })
      .catch((err) => {
        loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGIN] Fingerprint init failed: ${err instanceof Error ? err.message : String(err)}`);
      });
  }, [searchParams]);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGIN] ========== LOGIN PROCESS STARTED ==========');
    setError(null);
    setErrorDetails(null);
    event.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const emailInput = formData.get('email') as string;
      const password = formData.get('password') as string;

      loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Form data extracted: ${JSON.stringify({
        emailInput: emailInput ? `${emailInput.substring(0, 3)}***` : 'missing',
        password: password ? '***' : 'missing',
        hasEmail: !!emailInput,
        hasPassword: !!password,
      })}`);

      if (!emailInput || !password) {
        const errorMessage = 'Please enter both email and password';
        loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Validation failed: ${errorMessage}`);
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGIN] Getting fingerprint...');
      const fingerprintValue = (await ensureFingerprintCookie()) ?? fingerprint;
      loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Fingerprint value: ${fingerprintValue}`);
      if (fingerprintValue) {
        setFingerprint(fingerprintValue);
      }

      // Fetch full tenant data if we have tenant ID but no defaultDomain
      let tenantWithDefaultDomain = selectedTenant;
      if (selectedTenant?.id && !selectedTenant?.defaultDomain) {
        try {
          loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Fetching full tenant data for ID: ${selectedTenant.id}`);
          const tenantResponse = await fetch(`/api/data/tenants/${selectedTenant.id}`);
          if (tenantResponse.ok) {
            const tenantData = await tenantResponse.json();
            if (tenantData.success && tenantData.data) {
              tenantWithDefaultDomain = tenantData.data;
              loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Tenant data fetched: ${JSON.stringify({ id: tenantData.data.id, defaultDomain: tenantData.data.defaultDomain })}`);
            }
          }
        } catch (error) {
          loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGIN] Failed to fetch tenant data: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Normalize username to email using tenant's defaultDomain
      const email = normalizeUsernameToEmail(emailInput, tenantWithDefaultDomain || null);
      loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Normalized email: ${email.includes('@') ? `${email.substring(0, 3)}***@${email.split('@')[1]}` : email}`);
      loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Original input: ${emailInput}, Tenant defaultDomain: ${tenantWithDefaultDomain?.defaultDomain || 'not set'}`);

      // Derive tenant domain from explicit selection or current host (sent as X-Tenant-Domain)
      const currentHost =
        typeof window !== 'undefined' ? window.location.host : null;
      const sanitizedHost = currentHost?.replace(/[^a-zA-Z0-9\.\-:]/g, '');
      const tenantDomain = selectedTenant?.domain || sanitizedHost || null;
      loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Tenant domain: ${tenantDomain}`);
      loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Selected tenant: ${JSON.stringify(selectedTenant)}`);
      loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Current host: ${currentHost}`);

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

      loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Request details: ${JSON.stringify({
        url: '/api/auth/login',
        method: 'POST',
        headers: {
          ...headers,
          // Mask sensitive data in logs
          'x-fingerprint': headers['x-fingerprint'] ? `${headers['x-fingerprint'].substring(0, 8)}***` : undefined,
        },
        body: {
          emailOrUsername: email.includes('@') ? `${email.substring(0, 3)}***@${email.split('@')[1]}` : email,
          password: '***MASKED***',
          deviceFingerprint: fingerprintValue ? `${fingerprintValue.substring(0, 8)}***` : null,
        },
      })}`);

      let response: Response;
      let data: any;
      
      try {
        loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGIN] Sending fetch request to /api/auth/login...');
        const fetchStartTime = Date.now();
        
        response = await fetch('/api/auth/login', {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });

        const fetchDuration = Date.now() - fetchStartTime;
        loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Fetch completed: ${JSON.stringify({
          duration: `${fetchDuration}ms`,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
        })}`);

        // Clone response to read as text if JSON parsing fails
        const responseClone = response.clone();
        
        try {
          loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGIN] Parsing response as JSON...');
          data = await response.json();
          loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Response data received: ${JSON.stringify({
            success: data.success,
            hasUser: !!data.user,
            hasTokens: !!data.tokens,
            message: data.message,
            error: data.error,
            fullData: JSON.stringify(data, null, 2),
          })}`);
        } catch (jsonError) {
          loggingCustom(LogType.CLIENT_LOG, 'error', `[LOGIN] Failed to parse response as JSON: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
          // If JSON parsing fails, read as text
          const text = await responseClone.text().catch(() => 'Unable to read response');
          loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Response as text: ${text}`);
          const errorMessage = `Login failed with status ${response.status}`;
          const details = `Status: ${response.status} ${response.statusText}\n\nResponse body:\n${text}`;
          setError(errorMessage);
          setErrorDetails(details);
          toast.error(errorMessage);
          setIsLoading(false);
          return;
        }

        if (!response.ok || !data.success) {
          loggingCustom(LogType.CLIENT_LOG, 'error', `[LOGIN] Login failed: ${JSON.stringify({
            responseOk: response.ok,
            dataSuccess: data.success,
            status: response.status,
            statusText: response.statusText,
            error: data.error,
            message: data.message,
            fullResponse: data,
          })}`);
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

        loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGIN] Login successful!');
      } catch (fetchError) {
        // Network error or fetch failed
        loggingCustom(LogType.CLIENT_LOG, 'error', `[LOGIN] Fetch error occurred: ${JSON.stringify({
          error: fetchError,
          message: fetchError instanceof Error ? fetchError.message : String(fetchError),
          stack: fetchError instanceof Error ? fetchError.stack : undefined,
          name: fetchError instanceof Error ? fetchError.name : undefined,
        })}`);
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

      // SECURITY: Access token stored in memory only (never in cookies/localStorage)
      // Refresh token stored in HttpOnly cookie (handled by server, not accessible to JavaScript)
      
      loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGIN] Storing access token in memory...');
      // Store access token in memory (not in localStorage or cookies)
      if (data.tokens?.accessToken) {
        authTokenManager.setAccessToken(data.tokens.accessToken);
        loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGIN] Access token stored in memory');
      } else {
        loggingCustom(LogType.CLIENT_LOG, 'warn', '[LOGIN] No access token in response');
      }
      
      loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGIN] Cleaning up localStorage tokens...');
      // Clean up any existing tokens in localStorage for security
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGIN] localStorage tokens cleared');
        } catch (error) {
          loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGIN] Failed to clear tokens from localStorage: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      if (data.user) {
        loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Setting user in store: ${JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          username: data.user.username,
          name: data.user.name,
          role: data.user.role,
          hasAvatar: !!data.user.avatar,
        })}`);
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
        loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGIN] User set in store successfully');
        
        // Clear menu items cache on login to ensure fresh data
        try {
          useMenuItemsStore.getState().clearMenuItems();
          loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGIN] Menu items cache cleared');
        } catch (error) {
          loggingCustom(LogType.CLIENT_LOG, 'warn', `[LOGIN] Failed to clear menu items cache: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else {
        loggingCustom(LogType.CLIENT_LOG, 'warn', '[LOGIN] No user data in response');
      }

      loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGIN] Showing success toast...');
      toast.success(data.message || 'Login successful!');
      
      // Get returnUrl from searchParams directly (in case state wasn't updated yet)
      const encryptedReturnUrl = searchParams.get('returnUrl');
      let redirectTo = '/';
      
      if (encryptedReturnUrl) {
        loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Attempting to decrypt returnUrl from searchParams: ${encryptedReturnUrl}`);
        const decrypted = decryptReturnUrl(encryptedReturnUrl);
        if (decrypted) {
          loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Successfully decrypted returnUrl: ${decrypted}`);
          redirectTo = decrypted;
        } else {
          loggingCustom(LogType.CLIENT_LOG, 'warn', '[LOGIN] Failed to decrypt returnUrl, using default');
        }
      } else if (returnUrl) {
        // Fallback to state if searchParams doesn't have it
        loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Using returnUrl from state: ${returnUrl}`);
        redirectTo = returnUrl;
      }
      
      loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Final redirect destination: ${redirectTo}`);
      
      // Prevent redirect loop - if redirecting to login page, go to home instead
      if (redirectTo.startsWith('/authentication/login') || redirectTo === '/authentication') {
        loggingCustom(LogType.CLIENT_LOG, 'warn', '[LOGIN] Redirect destination is login page, redirecting to home instead');
        redirectTo = '/';
      }
      
      loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGIN] Waiting for auth cookies to be set before redirecting...');
      
      // Wait longer to ensure cookies are set by the browser and available for the next request
      // Keep isLoading true during this time so button stays disabled
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify cookie is set (optional check - httpOnly cookies won't be visible in JS)
      if (typeof document !== 'undefined') {
        const cookies = document.cookie;
        const hasAuthCookie = cookies.includes('access_token=') || cookies.includes(ACCESS_TOKEN_COOKIE + '=');
        loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Auth cookie check: ${hasAuthCookie ? 'Found' : 'Not found (may be httpOnly)'}`);
        loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] All cookies: ${cookies ? cookies.split(';').map(c => c.trim().split('=')[0]).join(', ') : 'None'}`);
      }
      
      loggingCustom(LogType.CLIENT_LOG, 'log', `[LOGIN] Redirecting to: ${redirectTo}`);
      
      // Use router.replace to navigate while preserving cookies
      // This ensures cookies are sent with the navigation
      // Keep isLoading true - button will stay disabled during redirect
      router.replace(redirectTo);
      
      // Don't set isLoading to false - keep button disabled during redirect
      // The page will navigate away, so state will reset
      loggingCustom(LogType.CLIENT_LOG, 'log', '[LOGIN] ========== LOGIN PROCESS COMPLETED SUCCESSFULLY ==========');
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', '[LOGIN] ========== LOGIN ERROR OCCURRED ==========');
      loggingCustom(LogType.CLIENT_LOG, 'error', `[LOGIN] Error details: ${JSON.stringify({
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        cause: error instanceof Error ? error.cause : undefined,
      })}`);
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
      loggingCustom(LogType.CLIENT_LOG, 'error', '[LOGIN] ========== LOGIN PROCESS ENDED WITH ERROR ==========');
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
      {/* Only render TenantSelector on client to prevent hydration mismatch */}
      {isMounted && DEMO_MODE && (
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

