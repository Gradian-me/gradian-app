'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignInPage } from '@/components/ui/sign-in';
import { ensureFingerprintCookie } from '@/domains/auth/utils/fingerprint-cookie.util';
import { useUserStore } from '@/stores/user.store';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(fingerprintValue ? { 'x-fingerprint': fingerprintValue } : {}),
        },
        body: JSON.stringify({
          emailOrUsername: email,
          password,
          deviceFingerprint: fingerprintValue,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.error || 'Login failed. Please check your credentials.';
        setError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      if (data.tokens) {
        localStorage.setItem('auth_token', data.tokens.accessToken);
        localStorage.setItem('refresh_token', data.tokens.refreshToken);
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
      const errorMessage = 'An error occurred during login. Please try again.';
      setError(errorMessage);
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
    <SignInPage
      //heroImageSrc="/screenshots/gradian.me_bg_desktop.png"
      onSignIn={handleSignIn}
      onResetPassword={handleResetPassword}
      onCreateAccount={handleCreateAccount}
      error={error}
      isLoading={isLoading}
    />
  );
}

