'use client';

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveFromTranslationsArray, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';

export type FormAlertMessage = string | Array<Record<string, string>>;

interface FormAlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: FormAlertMessage;
  subtitle?: string;
  className?: string;
  onDismiss?: () => void;
  dismissible?: boolean;
  statusCode?: number;
  action?: React.ReactNode;
}

export const FormAlert: React.FC<FormAlertProps> = ({
  type,
  message,
  subtitle,
  className,
  onDismiss,
  dismissible = false,
  statusCode,
  action,
}) => {
  const lang = useLanguageStore((s) => s.getLanguage());
  const defaultLang = getDefaultLanguage();
  const resolvedMessage =
    typeof message === 'string'
      ? message
      : resolveFromTranslationsArray(message, lang, defaultLang);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const styles = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  const iconStyles = {
    success: 'text-emerald-600',
    error: 'text-red-600',
    warning: 'text-amber-600',
    info: 'text-blue-600',
  };

  const Icon = icons[type];

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border',
        styles[type],
        className
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', iconStyles[type])} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {statusCode && (
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-lg',
              type === 'error' && 'bg-red-100 text-red-700',
              type === 'warning' && 'bg-amber-100 text-amber-700',
              type === 'success' && 'bg-emerald-100 text-emerald-700',
              type === 'info' && 'bg-blue-100 text-blue-700'
            )}>
              {statusCode}
            </span>
          )}
          <p className="text-xs font-medium">{resolvedMessage}</p>
        </div>
        {subtitle && (
          <p className="mt-1 text-sm text-current text-opacity-80">
            {subtitle}
          </p>
        )}
        {action && (
          <div className="mt-3 pt-3 border-t border-current border-opacity-20">
            {action}
          </div>
        )}
      </div>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'shrink-0 p-1 rounded hover:bg-opacity-10 hover:bg-current transition-colors',
            iconStyles[type]
          )}
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

