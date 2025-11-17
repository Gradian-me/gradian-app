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

export interface ConfirmationButton {
  label: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
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
   * Title of the confirmation dialog
   */
  title: string;
  
  /**
   * Optional subtitle or additional description
   */
  subtitle?: string;
  
  /**
   * Main message/content of the confirmation
   */
  message: string | React.ReactNode;
  
  /**
   * Array of buttons to display
   * Default: [{ label: 'Cancel', variant: 'outline', action: closes dialog }]
   */
  buttons?: ConfirmationButton[];
  
  /**
   * Size of the dialog
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Additional className for the dialog content
   */
  className?: string;
  
  /**
   * Show warning/destructive styling
   */
  variant?: 'default' | 'warning' | 'destructive';
}

export const ConfirmationMessage: React.FC<ConfirmationMessageProps> = ({
  isOpen,
  onOpenChange,
  title,
  subtitle,
  message,
  buttons,
  size = 'md',
  className,
  variant = 'default',
}) => {
  // Register dialog for back button handling on mobile
  const handleClose = React.useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);
  
  useDialogBackHandler(isOpen, handleClose, 'dialog', 'confirmation-message');

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  // Default buttons if none provided
  const defaultButtons: ConfirmationButton[] = [
    {
      label: 'Cancel',
      variant: 'outline',
      action: () => onOpenChange?.(false),
    },
  ];

  const finalButtons = buttons && buttons.length > 0 ? buttons : defaultButtons;

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
        
        <div className="py-4 text-gray-700">
          {typeof message === 'string' ? (
            <p className="text-sm leading-relaxed">{message}</p>
          ) : (
            message
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
              {button.icon && <IconRenderer iconName={button.icon} className="h-4 w-4 mr-2" />}
              {button.label}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

ConfirmationMessage.displayName = 'ConfirmationMessage';

