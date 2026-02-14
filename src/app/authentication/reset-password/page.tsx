'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, LockIcon, ShieldCheck, UserIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/gradian-ui/form-builder/form-elements/components/OTPInput';
import { AuthenticationLayout, GlassInputWrapper } from '@/components/authentication';
import { useTenantStore } from '@/stores/tenant.store';
import { normalizeUsernameToEmail } from '@/domains/auth/utils/username-email.util';
import { Logo } from '@/gradian-ui/layout/logo/components/Logo';
import { DEMO_MODE } from '@/gradian-ui/shared/configs/env-config';
import { TenantSelector } from '@/components/layout/TenantSelector';
import { useLanguageStore } from '@/stores/language.store';
import { getT } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

const OTP_LENGTH = 6;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const language = useLanguageStore((s) => s.language);
  const t = (key: string) => getT(key, language);
  const { selectedTenant } = useTenantStore();
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = t(TRANSLATION_KEYS.AUTH_TITLE_PAGE_RESET_PASSWORD);
  }, [language]);

  useEffect(() => {
    const id = searchParams?.get('userId');
    const email = searchParams?.get('email');
    if (id) {
      setUserId(id);
    }
    if (email) {
      setUsername(email);
    }
  }, [searchParams]);

  const isSubmitDisabled = useMemo(
    () =>
      isLoading ||
      !username.trim() ||
      otp.length !== OTP_LENGTH ||
      !password ||
      !confirmPassword,
    [confirmPassword, isLoading, otp.length, password, username],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    const trimmedOtp = otp.trim();

    if (!trimmedUsername) {
      const message = t(TRANSLATION_KEYS.AUTH_ERROR_ENTER_USERNAME_OR_EMAIL);
      setError(message);
      toast.error(message);
      return;
    }

    if (trimmedOtp.length !== OTP_LENGTH) {
      const message = t(TRANSLATION_KEYS.AUTH_ERROR_ENTER_FULL_6_DIGIT_CODE);
      setError(message);
      toast.error(message);
      return;
    }

    if (!password || !confirmPassword) {
      const message = t(TRANSLATION_KEYS.AUTH_ERROR_ENTER_AND_CONFIRM_PASSWORD);
      setError(message);
      toast.error(message);
      return;
    }

    if (password !== confirmPassword) {
      const message = t(TRANSLATION_KEYS.AUTH_ERROR_PASSWORDS_DO_NOT_MATCH);
      setError(message);
      toast.error(message);
      return;
    }

    if (password.length < 8) {
      const message = t(TRANSLATION_KEYS.AUTH_ERROR_PASSWORD_MIN_8);
      setError(message);
      toast.error(message);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch full tenant data if we have tenant ID but no defaultDomain
      let tenantWithDefaultDomain = selectedTenant;
      if (selectedTenant?.id && !selectedTenant?.defaultDomain) {
        try {
          const tenantResponse = await fetch(`/api/data/tenants/${selectedTenant.id}`);
          if (tenantResponse.ok) {
            const tenantData = await tenantResponse.json();
            if (tenantData.success && tenantData.data) {
              tenantWithDefaultDomain = tenantData.data;
            }
          }
        } catch (error) {
          // Continue with existing tenant data if fetch fails
          console.warn('Failed to fetch tenant data:', error);
        }
      }

      // Normalize username to email using tenant's defaultDomain
      const normalizedEmail = normalizeUsernameToEmail(trimmedUsername, tenantWithDefaultDomain || null);

      const response = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: normalizedEmail,
          code: trimmedOtp,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const message = data.error || t(TRANSLATION_KEYS.AUTH_ERROR_RESET_FAILED);
        setError(message);
        toast.error(message);
        setIsLoading(false);
        return;
      }

      toast.success(
        data.message || t(TRANSLATION_KEYS.AUTH_SUCCESS_RESET),
      );
      setIsLoading(false);
      router.push('/authentication/login');
    } catch (err) {
      console.error('Password reset error:', err);
      const message = t(TRANSLATION_KEYS.AUTH_ERROR_UNEXPECTED);
      setError(message);
      toast.error(message);
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    const trimmedUsername = username.trim();
    
    // Fetch full tenant data if we have tenant ID but no defaultDomain
    let tenantWithDefaultDomain = selectedTenant;
    if (selectedTenant?.id && !selectedTenant?.defaultDomain) {
      try {
        const tenantResponse = await fetch(`/api/data/tenants/${selectedTenant.id}`);
        if (tenantResponse.ok) {
          const tenantData = await tenantResponse.json();
          if (tenantData.success && tenantData.data) {
            tenantWithDefaultDomain = tenantData.data;
          }
        }
      } catch (error) {
        // Continue with existing tenant data if fetch fails
        console.warn('Failed to fetch tenant data:', error);
      }
    }
    
    // Normalize username to email using tenant's defaultDomain
    const normalizedEmail = normalizeUsernameToEmail(trimmedUsername, tenantWithDefaultDomain || null);
    const resolvedUserId = userId || normalizedEmail;

    if (!resolvedUserId) {
      const message = t(TRANSLATION_KEYS.AUTH_ERROR_ENTER_USERNAME_BEFORE_CODE);
      setError(message);
      toast.error(message);
      throw new Error(message);
    }

    const clientId = process.env.NEXT_PUBLIC_CLIENT_ID;
    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY;

    if (!clientId || !secretKey) {
      const message = t(TRANSLATION_KEYS.AUTH_ERROR_CLIENT_CREDENTIALS);
      setError(message);
      toast.error(message);
      throw new Error(message);
    }

    setError(null);

    const payload = {
      userId: resolvedUserId,
      clientId,
      secretKey,
      ttlSeconds: 300,
    };

    const response = await fetch('/api/auth/2fa/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      const message = data.message || data.error || t(TRANSLATION_KEYS.AUTH_ERROR_SEND_CODE_FAILED);
      setError(message);
      toast.error(message);
      throw new Error(message);
    }

    setError(null);
    toast.success(t(TRANSLATION_KEYS.AUTH_SUCCESS_CODE_SENT));
    setOtp('');
  };

  return (
    <>
      {/* Only render TenantSelector on client to prevent hydration mismatch */}
      {typeof window !== 'undefined' && DEMO_MODE && (
        <div className="fixed top-4 right-4 z-50 w-64">
          <TenantSelector placeholder="Select tenant" />
        </div>
      )}
      <div className="fixed top-8 left-8 z-50">
        <Logo variant="auto" width={140} height={46} />
      </div>
      <AuthenticationLayout
        heroImageSrc="/screenshots/gradian.me_bg_desktop.png"
        showTestimonials={false}
        showModeToggle={false}
      >
        <div className="w-full max-w-md pt-10 md:pt-4">
          <div className="flex flex-col gap-6">
            <h1 
              className="animate-element animate-delay-100 font-semibold leading-tight whitespace-nowrap overflow-hidden"
              style={{
                fontSize: "clamp(1.5rem, 3vw + 0.5rem, 3rem)"
              }}
            >
              {t(TRANSLATION_KEYS.AUTH_RESET_PASSWORD_TITLE)}
            </h1>
            <p className="animate-element animate-delay-200 text-muted-foreground">
              {t(TRANSLATION_KEYS.AUTH_RESET_PASSWORD_DESCRIPTION)}
            </p>

          {error && (
            <div className="animate-element animate-delay-250 rounded-2xl border border-red-500/50 bg-red-500/10 dark:bg-red-500/5 p-4">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="animate-element animate-delay-300 flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                {t(TRANSLATION_KEYS.AUTH_LABEL_USERNAME_OR_EMAIL)}
              </label>
              <GlassInputWrapper>
                <input
                  name="username"
                  type="text"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setError(null);
                  }}
                  placeholder={t(TRANSLATION_KEYS.AUTH_PLACEHOLDER_USERNAME_OR_EMAIL)}
                  autoComplete="username"
                  className="flex-1 bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                />
              </GlassInputWrapper>
            </div>

            <div className="animate-element animate-delay-350 flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                {t(TRANSLATION_KEYS.AUTH_LABEL_VERIFICATION_CODE)}
              </label>
              <InputOTP
                maxLength={OTP_LENGTH}
                value={otp}
                onChange={setOtp}
                disabled={isLoading}
                aria-label={t(TRANSLATION_KEYS.AUTH_LABEL_VERIFICATION_CODE)}
                resendDuration={10}
                onResend={handleResendCode}
                resendButtonLabel={t(TRANSLATION_KEYS.AUTH_BUTTON_SEND_VERIFICATION_CODE)}
              >
                <InputOTPGroup>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <InputOTPSlot key={index} index={index} aria-label={`Digit ${index + 1}`} />
                  ))}
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  {Array.from({ length: 3 }).map((_, index) => {
                    const slotIndex = index + 3;
                    return (
                      <InputOTPSlot
                        key={slotIndex}
                        index={slotIndex}
                        aria-label={`Digit ${slotIndex + 1}`}
                      />
                    );
                  })}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="animate-element animate-delay-400 flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <LockIcon className="h-4 w-4" />
                {t(TRANSLATION_KEYS.AUTH_LABEL_NEW_PASSWORD)}
              </label>
              <GlassInputWrapper>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder={t(TRANSLATION_KEYS.AUTH_PLACEHOLDER_NEW_PASSWORD)}
                  className="flex-1 bg-transparent text-sm p-4 pe-12 rounded-2xl focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center z-10"
                  aria-label={showPassword ? t(TRANSLATION_KEYS.AUTH_ARIA_HIDE_PASSWORD) : t(TRANSLATION_KEYS.AUTH_ARIA_SHOW_PASSWORD)}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                  ) : (
                    <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                  )}
                </button>
              </GlassInputWrapper>
            </div>

            <div className="animate-element animate-delay-450 flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <LockIcon className="h-4 w-4" />
                {t(TRANSLATION_KEYS.AUTH_LABEL_CONFIRM_PASSWORD)}
              </label>
              <GlassInputWrapper>
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder={t(TRANSLATION_KEYS.AUTH_PLACEHOLDER_CONFIRM_PASSWORD)}
                  className="flex-1 bg-transparent text-sm p-4 pe-12 rounded-2xl focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center z-10"
                  aria-label={showConfirmPassword ? t(TRANSLATION_KEYS.AUTH_ARIA_HIDE_PASSWORD) : t(TRANSLATION_KEYS.AUTH_ARIA_SHOW_PASSWORD)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                  ) : (
                    <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                  )}
                </button>
              </GlassInputWrapper>
            </div>

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="animate-element animate-delay-550 w-full rounded-2xl bg-violet-500 dark:bg-violet-600 py-4 font-medium text-white hover:bg-violet-600 dark:hover:bg-violet-700 transition-all cursor-pointer disabled:opacity-60 disabled:bg-violet-400 dark:disabled:bg-violet-700/50 disabled:hover:bg-violet-400 dark:disabled:hover:bg-violet-700/50 disabled:cursor-not-allowed"
            >
              {isLoading ? t(TRANSLATION_KEYS.AUTH_BUTTON_RESETTING) : t(TRANSLATION_KEYS.AUTH_BUTTON_RESET_PASSWORD)}
            </button>
          </form>

          <p className="animate-element animate-delay-700 text-center text-sm text-muted-foreground">
            {t(TRANSLATION_KEYS.AUTH_RESET_REMEMBERED_PASSWORD)}{' '}
            <button
              type="button"
              onClick={() => router.push('/authentication/login')}
              className="text-violet-400 hover:underline transition-colors"
            >
              {t(TRANSLATION_KEYS.AUTH_RESET_RETURN_TO_LOGIN)}
            </button>
          </p>
        </div>
      </div>
    </AuthenticationLayout>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
