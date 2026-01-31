'use client';

import React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';

interface FormDialogErrorBoundaryProps {
  children: React.ReactNode;
  onClose: () => void;
  /** Optional key to reset boundary when modal/schema changes */
  resetKey?: string;
}

interface FormDialogErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/** Detect null/undefined property access (e.g. reading 'length' on null) for clearer UX. */
function isSchemaOrNullLengthError(error: Error | null): boolean {
  if (!error?.message) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("cannot read properties of null") ||
    msg.includes("cannot read properties of undefined") ||
    (msg.includes("reading 'length'") && (msg.includes('null') || msg.includes('undefined'))) ||
    msg.includes("cannot read property 'length'")
  );
}

/**
 * Error boundary for form dialogs. Catches render/effect errors, toasts the
 * error, and shows an inline Close instead of bubbling to the global error page.
 */
export class FormDialogErrorBoundary extends React.Component<
  FormDialogErrorBoundaryProps,
  FormDialogErrorBoundaryState
> {
  constructor(props: FormDialogErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): FormDialogErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const rawMessage = error?.message || 'An unexpected error occurred while loading the form.';
    const isSchemaStyle = isSchemaOrNullLengthError(error);
    const toastTitle = isSchemaStyle
      ? 'Form configuration error'
      : 'Something went wrong';
    const toastDescription = isSchemaStyle
      ? 'The form schema may have missing or invalid data (e.g. fields, sections, or arrays). Please check the schema or try again.'
      : rawMessage;
    toast.error(toastTitle, { description: toastDescription });
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.error('[FormDialogErrorBoundary]', error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: FormDialogErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleClose = () => {
    this.setState({ hasError: false, error: null });
    this.props.onClose();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const detail =
        this.state.error?.message || 'An unexpected error occurred while loading the form.';
      const isSchemaStyle = isSchemaOrNullLengthError(this.state.error);
      const title = isSchemaStyle
        ? 'Form configuration error'
        : 'Something went wrong';
      const subtitle = isSchemaStyle
        ? 'The form schema may have missing or invalid data (e.g. fields, sections, or arrays). This can happen when the schema returns null for lists that the form expects to be arrays. Please check the schema or try again.'
        : detail;
      return (
        <div className="flex flex-col gap-4 py-6 px-4">
          <FormAlert
            type="error"
            message={title}
            subtitle={subtitle}
            className="mb-2"
          />
          <Button type="button" variant="outline" onClick={this.handleClose}>
            Close
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
