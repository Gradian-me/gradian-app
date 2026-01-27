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
    const message = error?.message || 'An unexpected error occurred while loading the form.';
    toast.error('Something went wrong', { description: message });
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
      return (
        <div className="flex flex-col gap-4 py-6 px-4">
          <FormAlert
            type="error"
            message="Something went wrong"
            subtitle={detail}
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
