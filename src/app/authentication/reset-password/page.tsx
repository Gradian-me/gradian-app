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

const OTP_LENGTH = 6;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    document.title = 'Reset Password | Gradian App';
  }, []);

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
      const message = 'Please enter your username or email.';
      setError(message);
      toast.error(message);
      return;
    }

    if (trimmedOtp.length !== OTP_LENGTH) {
      const message = 'Please enter the full 6-digit verification code.';
      setError(message);
      toast.error(message);
      return;
    }

    if (!password || !confirmPassword) {
      const message = 'Please enter and confirm your new password.';
      setError(message);
      toast.error(message);
      return;
    }

    if (password !== confirmPassword) {
      const message = 'Passwords do not match.';
      setError(message);
      toast.error(message);
      return;
    }

    if (password.length < 8) {
      const message = 'Password must be at least 8 characters long.';
      setError(message);
      toast.error(message);
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: trimmedUsername,
          code: trimmedOtp,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const message = data.error || 'Password reset failed. Please try again.';
        setError(message);
        toast.error(message);
        setIsLoading(false);
        return;
      }

      toast.success(
        data.message || 'Password reset successfully. Please log in with your new password.',
      );
      setIsLoading(false);
      router.push('/authentication/login');
    } catch (err) {
      console.error('Password reset error:', err);
      const message = 'An unexpected error occurred. Please try again.';
      setError(message);
      toast.error(message);
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    const trimmedUsername = username.trim();
    const resolvedUserId = userId || trimmedUsername;

    if (!resolvedUserId) {
      const message = 'Enter your username or email before requesting a code.';
      setError(message);
      toast.error(message);
      throw new Error(message);
    }

    const clientId = process.env.NEXT_PUBLIC_CLIENT_ID;
    const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY;

    if (!clientId || !secretKey) {
      const message = 'Client credentials are not configured. Please contact support.';
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
      const message = data.message || data.error || 'Failed to send verification code.';
      setError(message);
      toast.error(message);
      throw new Error(message);
    }

    setError(null);
    toast.success('Verification code sent. Please check your authenticator or email.');
    setOtp('');
  };

  return (
    <AuthenticationLayout
      heroImageSrc="/screenshots/gradian.me_bg_desktop.png"
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight">
            Reset password
          </h1>
          <p className="animate-element animate-delay-200 text-muted-foreground hidden md:block">
            Verify your identity and create a secure new password.
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
                Username or email
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
                  placeholder="Enter your username or email"
                  autoComplete="username"
                  className="flex-1 bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                />
              </GlassInputWrapper>
            </div>

            <div className="animate-element animate-delay-350 flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Verification code
              </label>
              <InputOTP
                maxLength={OTP_LENGTH}
                value={otp}
                onChange={setOtp}
                disabled={isLoading}
                aria-label="One-time verification code"
                resendDuration={10}
                onResend={handleResendCode}
                resendButtonLabel="Send verification code"
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
                New password
              </label>
              <GlassInputWrapper>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  className="flex-1 bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center z-10"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                Confirm password
              </label>
              <GlassInputWrapper>
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Repeat your new password"
                  className="flex-1 bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center z-10"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
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
              className="animate-element animate-delay-550 w-full rounded-2xl bg-violet-500 py-4 font-medium text-violet-50 hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating password...' : 'Reset password'}
            </button>
          </form>

          <p className="animate-element animate-delay-700 text-center text-sm text-muted-foreground">
            Remembered your password?{' '}
            <button
              type="button"
              onClick={() => router.push('/authentication/login')}
              className="text-violet-400 hover:underline transition-colors"
            >
              Return to login
            </button>
          </p>
        </div>
      </div>
    </AuthenticationLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
