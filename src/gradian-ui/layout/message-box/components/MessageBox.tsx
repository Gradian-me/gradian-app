'use client';

import React, { useMemo } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { MessageBoxProps } from '../types';
import { useLanguageStore } from '@/stores/language.store';

/**
 * Get localized message from a message value
 * @param message - Can be a string or an object with language keys
 * @param language - Current language code
 * @returns Localized message string
 */
const getLocalizedMessage = (
  message: string | Record<string, string>,
  language: string
): string => {
  if (typeof message === 'string') {
    return message;
  }
  
  // If it's an object, try to get the message for the current language
  // Fallback to 'en' if current language not found, then to first available
  if (typeof message === 'object' && message !== null) {
    return message[language] || message['en'] || message[Object.keys(message)[0]] || '';
  }
  
  return '';
};

/**
 * MessageBox component to display API response messages
 * Supports multi-language messages based on the selected language
 */
export const MessageBox: React.FC<MessageBoxProps> = ({
  messages = [],
  message,
  statusCode,
  className,
  variant = 'default',
  dismissible = false,
  onDismiss,
}) => {
  const language = useLanguageStore((state) => state.getLanguage());

  // Process messages array
  const processedMessages = useMemo(() => {
    const result: Array<{ path?: string; text: string }> = [];

    // Handle single message prop
    if (message) {
      const text = getLocalizedMessage(message, language);
      if (text) {
        result.push({ text });
      }
    }

    // Handle messages array
    messages.forEach((msg) => {
      const text = getLocalizedMessage(msg.message, language);
      if (text) {
        result.push({
          path: msg.path,
          text,
        });
      }
    });

    return result;
  }, [messages, message, language]);

  if (processedMessages.length === 0) {
    return null;
  }

  const variantStyles = {
    default: 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-800/30 dark:border-gray-700 dark:text-gray-200',
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
    warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300',
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
  };

  const variantIcons = {
    default: Info,
    error: AlertCircle,
    warning: AlertTriangle,
    success: CheckCircle,
    info: Info,
  };

  const Icon = variantIcons[variant];

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-2',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          {processedMessages.map((msg, index) => (
            <div key={index} className="space-y-1">
              {msg.path && (
                <div className="text-xs font-medium opacity-75">
                  {msg.path}
                </div>
              )}
              <div className="text-sm">
                {statusCode !== undefined && index === 0 && (
                  <Badge 
                    variant={statusCode >= 200 && statusCode < 300 ? 'success' : statusCode >= 400 ? 'destructive' : 'default'}
                    className="text-xs shrink-0 me-2"
                  >
                    {statusCode}
                  </Badge>
                )}
                {msg.text}
              </div>
            </div>
          ))}
        </div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

MessageBox.displayName = 'MessageBox';

