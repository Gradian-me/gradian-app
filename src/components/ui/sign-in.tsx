'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, LockIcon, UserIcon } from 'lucide-react';
import { AuthenticationLayout, GlassInputWrapper } from '@/components/authentication';

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
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight">{title}</h1>
          <p className="animate-element animate-delay-200 text-muted-foreground">{description}</p>

          {error && (
            <div className="animate-element animate-delay-250 rounded-2xl border border-red-500/50 bg-red-500/10 dark:bg-red-500/5 p-4">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={onSignIn}>
            <div className="animate-element animate-delay-300 flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Email Address</label>
              <GlassInputWrapper>
                <UserIcon className="w-5 h-5 text-muted-foreground ms-2 shrink-0" />
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email address"
                  className="flex-1 bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                  value={formValues.email}
                  onChange={handleInputChange}
                />
              </GlassInputWrapper>
            </div>

            <div className="animate-element animate-delay-400 flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">Password</label>
              <GlassInputWrapper>
                <LockIcon className="w-5 h-5 text-muted-foreground ms-2 shrink-0" /> 
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="flex-1 bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none"
                    value={formValues.password}
                    onChange={handleInputChange}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center z-10">
                    {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" /> : <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />}
                  </button>
              </GlassInputWrapper>
            </div>

            <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="rememberMe" className="custom-checkbox" />
                <span className="text-foreground/90">Keep me signed in</span>
              </label>
              <a href="#" onClick={(e) => { e.preventDefault(); onResetPassword?.(); }} className="hover:underline text-violet-400 transition-colors">Reset password</a>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitDisabled}
              className="animate-element animate-delay-600 w-full rounded-2xl bg-violet-500 dark:bg-violet-600 py-4 font-medium text-white hover:bg-violet-600 dark:hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
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

