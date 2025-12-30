'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, LockIcon, UserIcon } from 'lucide-react';
import { AuthenticationLayout, GlassInputWrapper } from '@/components/authentication';
import { ModeToggle } from '@/gradian-ui/layout';
import { Button } from '@/components/ui/button';
import { TextShimmerWave } from '@/components/ui/text-shimmer-wave';
import { Badge } from '@/components/ui/badge';

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  showTestimonials?: boolean;
  neonOrbsTitle?: string;
  neonOrbsSubtitle?: string;
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
  error?: string | null;
  statusCode?: number | null;
  isLoading?: boolean;
}

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
  title = <span className="font-light text-foreground tracking-tighter">Welcome</span>,
  description = "Access your account and continue your journey with us",
  heroImageSrc,
  showTestimonials = true,
  neonOrbsTitle,
  neonOrbsSubtitle,
  onSignIn,
  onResetPassword,
  onCreateAccount,
  error,
  statusCode,
  isLoading = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formValues, setFormValues] = useState({ email: '', password: '' });

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const isSubmitDisabled =
    isLoading ||
    !formValues.email.trim() ||
    !formValues.password.trim();

  return (
    <AuthenticationLayout 
      heroImageSrc={heroImageSrc} 
      showTestimonials={showTestimonials}
      neonOrbsTitle={neonOrbsTitle}
      neonOrbsSubtitle={neonOrbsSubtitle}
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
            {title}
          </h1>
          <p className="animate-element animate-delay-200 text-muted-foreground">{description}</p>

          {error && (
            <div className="animate-element animate-delay-250 rounded-2xl border border-red-500/50 bg-red-500/10 dark:bg-red-500/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-red-600 dark:text-red-400 flex-1">{error}</p>
                {statusCode && (
                  <Badge variant="destructive" className="shrink-0">
                    {statusCode}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={onSignIn}>
            <div className="animate-element animate-delay-300 flex flex-col gap-2">
              <label className="hidden md:block text-sm font-medium text-muted-foreground">Email or Username</label>
              <GlassInputWrapper>
                <UserIcon className="w-5 h-5 text-muted-foreground ms-2 shrink-0" />
                <input
                  name="email"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter your email or username"
                  className="flex-1 bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                  value={formValues.email}
                  onChange={handleInputChange}
                />
              </GlassInputWrapper>
            </div>

            <div className="animate-element animate-delay-400 flex flex-col gap-2">
              <label className="hidden md:block text-sm font-medium text-muted-foreground">Password</label>
              <GlassInputWrapper>
                <LockIcon className="w-5 h-5 text-muted-foreground ms-2 shrink-0" /> 
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="flex-1 bg-transparent text-sm p-4 pe-12 rounded-2xl focus:outline-none"
                    value={formValues.password}
                    onChange={handleInputChange}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center z-10">
                    {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" /> : <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />}
                  </button>
              </GlassInputWrapper>
            </div>

            <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
              <div className="flex items-center">
                <ModeToggle />
              </div>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onResetPassword?.();
                }}
                className="hover:underline text-violet-400 transition-colors"
              >
                Reset password
              </a>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitDisabled}
              className="animate-element animate-delay-600 w-full rounded-2xl bg-violet-500 dark:bg-violet-600 py-4 font-medium text-white hover:bg-violet-600 dark:hover:bg-violet-700 transition-all cursor-pointer disabled:opacity-60 disabled:bg-violet-400 dark:disabled:bg-violet-700/50 disabled:hover:bg-violet-400 dark:disabled:hover:bg-violet-700/50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <TextShimmerWave duration={1.5} spread={1.2}>
                  Signing in...
                </TextShimmerWave>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="animate-element animate-delay-700 text-center text-sm text-muted-foreground">
            New to our platform? <a href="#" onClick={(e) => { e.preventDefault(); onCreateAccount?.(); }} className="text-violet-400 hover:underline transition-colors">Create Account</a>
          </p>
        </div>
      </div>
    </AuthenticationLayout>
  );
};

