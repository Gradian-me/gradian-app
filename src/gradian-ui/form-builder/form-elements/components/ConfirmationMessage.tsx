'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { cn } from '@/gradian-ui/shared/utils';
import { useDialogBackHandler } from '@/gradian-ui/shared/contexts/DialogContext';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

/**
 * Title/message can be a plain string or inline translations:
 * - string: "Delete Item"
 * - array: [{"en": "Delete Item"}, {"fa": "حذف آیتم"}]
 * - object: {"en": "Delete Item", "fa": "حذف آیتم"}
 */
export type TranslatableText = string | Array<Record<string, string>> | Record<string, string>;

function resolveTranslatable(
  value: TranslatableText | undefined,
  lang: string,
  defaultLang: string,
  fallback: string
): string {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  const merged: Record<string, string> = {};
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (entry && typeof entry === 'object') {
        for (const [l, v] of Object.entries(entry)) {
          if (v != null && String(v).trim() !== '') merged[l] = String(v).trim();
        }
      }
    }
  } else if (typeof value === 'object') {
    for (const [l, v] of Object.entries(value)) {
      if (v != null && String(v).trim() !== '') merged[l] = String(v).trim();
    }
  }
  if (merged[lang]) return merged[lang];
  if (merged[defaultLang]) return merged[defaultLang];
  const first = Object.values(merged).find(Boolean);
  return first ?? fallback;
}

function isTranslatableMessage(
  message: string | React.ReactNode | TranslatableText
): message is TranslatableText {
  if (typeof message === 'string') return true;
  if (React.isValidElement(message)) return false;
  if (Array.isArray(message)) {
    return message.length > 0 && message.every(
      (item) => typeof item === 'object' && item !== null && !React.isValidElement(item) && Object.values(item).every((v) => typeof v === 'string')
    );
  }
  if (typeof message === 'object' && message !== null) {
    return Object.values(message).every((v) => typeof v === 'string');
  }
  return false;
}

export interface ConfirmationButton {
  label: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'gradient';
  icon?: string; // Icon name for IconRenderer
  action: () => void;
  disabled?: boolean;
  className?: string;
}

export interface ConfirmationMessageProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  /**
   * Callback when dialog state changes
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Title: plain string or inline translations (array of {lang: text} or object {lang: text})
   */
  title: TranslatableText;
  /**
   * Optional subtitle: plain string or inline translations
   */
  subtitle?: TranslatableText;
  /**
   * Main message: plain string, React node, or inline translations
   */
  message: string | React.ReactNode | TranslatableText;
  /**
   * Array of buttons. Default: [{ label: 'Cancel', variant: 'outline', action: closes dialog }]
   */
  buttons?: ConfirmationButton[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'default' | 'warning' | 'destructive';
}

export const ConfirmationMessage: React.FC<ConfirmationMessageProps> = ({
  isOpen,
  onOpenChange,
  title: titleProp,
  subtitle: subtitleProp,
  message: messageProp,
  buttons,
  size = 'md',
  className,
  variant = 'default',
}) => {
  const language = useLanguageStore((s) => s.language) ?? 'en';
  const defaultLang = getDefaultLanguage();

  const handleClose = React.useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  useDialogBackHandler(isOpen, handleClose, 'dialog', 'confirmation-message');

  const title = resolveTranslatable(titleProp, language, defaultLang, typeof titleProp === 'string' ? titleProp : '');
  const subtitle = subtitleProp != null ? resolveTranslatable(subtitleProp, language, defaultLang, typeof subtitleProp === 'string' ? subtitleProp : '') : '';
  const resolvedMessage = isTranslatableMessage(messageProp)
    ? resolveTranslatable(messageProp, language, defaultLang, typeof messageProp === 'string' ? messageProp : '')
    : messageProp;

  const cancelLabel = getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang);
  const defaultButtons: ConfirmationButton[] = [
    {
      label: cancelLabel,
      variant: 'outline',
      action: () => onOpenChange?.(false),
    },
  ];

  const finalButtons = buttons && buttons.length > 0 ? buttons : defaultButtons;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };
  const variantStyles = {
    default: '',
    warning: 'border-amber-200',
    destructive: 'border-red-200',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn(sizeClasses[size], variantStyles[variant], className)}>
        <DialogHeader>
          <DialogTitle>
            {title}
          </DialogTitle>
          {subtitle && (
            <DialogDescription>
              {subtitle}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="py-4 text-gray-700 dark:text-gray-300">
          {typeof resolvedMessage === 'string' ? (
            <p className="text-sm leading-relaxed">{resolvedMessage}</p>
          ) : (
            resolvedMessage
          )}
        </div>

        <DialogFooter className="gap-2">
          {finalButtons.map((button, index) => (
            <Button
              key={index}
              variant={button.variant || 'default'}
              onClick={button.action}
              disabled={button.disabled}
              className={button.className}
              type="button"
            >
              {button.icon && <IconRenderer iconName={button.icon} className="h-4 w-4 me-2" />}
              {button.label}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

ConfirmationMessage.displayName = 'ConfirmationMessage';

