'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FormAlert } from '@/components/ui/form-alert';
import { SchemaFormWrapper } from '@/gradian-ui/form-builder';
import { asFormBuilderSchema } from '@/gradian-ui/schema-manager/utils/schema-utils';
import type { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { config } from '@/lib/config';
import { useCompanyStore } from '@/stores/company.store';
import { AuthenticationLayout } from '@/components/authentication';

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const getCompanyId = useCompanyStore((state) => state.getCompanyId);

  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialValues, setInitialValues] = useState<Record<string, any>>({});
  const [submitFeedback, setSubmitFeedback] = useState<FeedbackState | null>(null);
  const [submitForm, setSubmitForm] = useState<(() => void) | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSchema = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        const response = await fetch(`${config.schemaApi.basePath}/users`);
        
        if (!response.ok) {
          let errorMessage = `Failed to load user schema (${response.status})`;
          try {
            const errorResult = await response.json();
            errorMessage = errorResult.error || errorResult.message || errorMessage;
          } catch {
            // If response is not JSON, use status text
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || result.message || 'Unable to load user schema.');
        }

        if (isMounted) {
          const formSchema = asFormBuilderSchema(result.data);
          const updatedSchema = {
            ...formSchema,
            isCollapsibleSections: false, // Sign-up form should always be expanded
            fields: formSchema.fields.map((field) =>
              field.name === 'status'
                ? {
                    ...field,
                    defaultValue: field.defaultValue ?? 'pending',
                    disabled: true,
                  }
                : field
            ),
          };

          setSchema(updatedSchema);
          setInitialValues((prev) =>
            prev.status === 'pending'
              ? prev
              : {
                  ...prev,
                  status: 'pending',
                }
          );
          setLoadError(null);
        }
      } catch (error) {
        console.error('Failed to load users schema:', error);
        if (isMounted) {
          let errorMessage = 'Failed to load schema. Please try again later.';
          
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          } else if (error && typeof error === 'object' && 'message' in error) {
            errorMessage = String(error.message);
          }
          
          // Handle network errors specifically
          if (errorMessage.includes('fetch failed') || errorMessage.includes('Failed to fetch')) {
            errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection and try again.';
          }
          
          setLoadError(errorMessage);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSchema();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Sign Up | Gradian';
    }
  }, []);

  const handleSubmit = useCallback(
    async (values: Record<string, any>) => {
      // Check if schema is company-based
      const isNotCompanyBased = schema?.isNotCompanyBased === true;
      const isCompanyBased = !isNotCompanyBased;

      // Only require companyId if schema is company-based
      let companyId: string | null = null;
      if (isCompanyBased) {
        const companyIdValue = getCompanyId();
        companyId = companyIdValue !== null && companyIdValue !== undefined ? String(companyIdValue) : null;

        if (!companyId) {
          setSubmitFeedback({
            type: 'error',
            message: 'Please select a company before creating an account.',
          });
          return;
        }
      }

      setIsSubmitting(true);
      setSubmitFeedback(null);

      try {
        // Use config to determine correct URL based on demo mode
        const apiUrl = `${config.dataApi.basePath}/users`;
        
        // Only include companyId in request body if schema is company-based
        const requestBody = isCompanyBased && companyId
          ? { ...values, companyId }
          : { ...values };

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          const errorMessage = result.error || 'Failed to create user account. Please try again.';
          setSubmitFeedback({ type: 'error', message: errorMessage });
          return;
        }

        setSubmitFeedback({
          type: 'success',
          message: 'Account created successfully! Redirecting to the login page...',
        });

        // Redirect after a short delay to allow users to read the message
        setTimeout(() => {
          router.push('/authentication/login');
        }, 2000);
      } catch (error) {
        console.error('Error submitting signup form:', error);
        setSubmitFeedback({
          type: 'error',
          message: 'Something went wrong while creating your account. Please try again.',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [getCompanyId, router, schema]
  );

  const renderContent = useMemo(() => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          {/* Section Header Skeleton */}
          <div className="space-y-2 pb-4 border-b border-border/40">
            <Skeleton className="h-7 w-40 bg-gray-200/60 dark:bg-gray-700/60" />
            <Skeleton className="h-4 w-56 bg-gray-200/40 dark:bg-gray-700/40" />
          </div>

          {/* Form Fields Skeleton - 2 Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Field 1 - Username */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 bg-gray-200/60 dark:bg-gray-700/60" />
              <Skeleton className="h-10 w-full rounded-lg bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-600/50" />
              <Skeleton className="h-3 w-full max-w-xs bg-gray-200/40 dark:bg-gray-700/30" />
            </div>

            {/* Field 2 - First Name */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 bg-gray-200/60 dark:bg-gray-700/60" />
              <Skeleton className="h-10 w-full rounded-lg bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-600/50" />
            </div>

            {/* Field 3 - Last Name */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 bg-gray-200/60 dark:bg-gray-700/60" />
              <Skeleton className="h-10 w-full rounded-lg bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-600/50" />
            </div>

            {/* Field 4 - Email */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-16 bg-gray-200/60 dark:bg-gray-700/60" />
              <Skeleton className="h-10 w-full rounded-lg bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-600/50" />
            </div>

            {/* Field 5 - Post Title */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 bg-gray-200/60 dark:bg-gray-700/60" />
              <Skeleton className="h-10 w-full rounded-lg bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-600/50" />
            </div>

            {/* Field 6 - Company */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 bg-gray-200/60 dark:bg-gray-700/60" />
              <Skeleton className="h-10 w-full rounded-lg bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-600/50" />
            </div>

            {/* Field 7 - Status (Dropdown) */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-16 bg-gray-200/60 dark:bg-gray-700/60" />
              <Skeleton className="h-10 w-full rounded-lg bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-600/50" />
            </div>
          </div>
        </div>
      );
    }

    if (loadError) {
      return (
        <FormAlert
          type="error"
          message={loadError}
          dismissible
          onDismiss={() => setLoadError(null)}
        />
      );
    }

    if (!schema) {
      return (
        <FormAlert
          type="error"
          message="Unable to load the sign up form at this time."
        />
      );
    }

    return (
      <SchemaFormWrapper
        schema={schema}
        onSubmit={handleSubmit}
        initialValues={initialValues}
        onMount={(submitFn) => setSubmitForm(() => submitFn)}
        hideActions
        disabled={isSubmitting}
      />
    );
  }, [isLoading, loadError, schema, handleSubmit, isSubmitting]);

  return (
    <AuthenticationLayout
      heroImageSrc="/screenshots/gradian.me_bg_desktop.png"
    >
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight">
              Create account
            </h1>
            <p className="animate-element animate-delay-200 text-muted-foreground hidden md:block">
              The password link would be sent to your email address after the account is activated by administrator.
            </p>

            {submitFeedback && (
              <div className={`animate-element animate-delay-250 rounded-2xl border p-4 ${
                submitFeedback.type === 'error'
                  ? 'border-red-500/50 bg-red-500/10 dark:bg-red-500/5'
                  : 'border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/5'
              }`}>
                <p className={`text-sm font-medium ${
                  submitFeedback.type === 'error'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {submitFeedback.message}
                </p>
              </div>
            )}

            {loadError && (
              <div className="animate-element animate-delay-250">
                <FormAlert
                  type="error"
                  message={loadError}
                  dismissible
                  onDismiss={() => setLoadError(null)}
                />
              </div>
            )}

            <div className="animate-element animate-delay-300">
              {renderContent}
            </div>

            <div className="animate-element animate-delay-500 flex flex-col gap-4">
              <Button
                type="button"
                onClick={() => submitForm?.()}
                disabled={!submitForm || isSubmitting || isLoading || !!loadError}
                className="w-full rounded-2xl bg-violet-500 py-4 font-medium text-violet-50 hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </Button>

              <p className="animate-element animate-delay-700 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/authentication/login" className="text-violet-400 hover:underline transition-colors">
                  Sign in instead
                </Link>
              </p>
            </div>
          </div>
        </div>
    </AuthenticationLayout>
  );
}
