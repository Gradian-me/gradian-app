// Modal Component

'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { ModalProps } from '../types';
import { cn } from '../../shared/utils';
import { Button } from '@/components/ui/button';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOutsideClick = false,
  actions,
  className,
  hideDialogHeader = false,
  hideCloseButton = false,
  ...props
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'md:max-w-4xl',
    lg: 'lg:max-w-7xl',
    xl: 'xl:max-w-[88rem]',
    full: 'max-w-full mx-4',
  };

  const modalClasses = cn(
    'border-none bg-white dark:bg-gray-900 shadow-xl overflow-hidden',
    'rounded-none lg:rounded-2xl', // No rounded corners on mobile, rounded on desktop
    'h-full w-full lg:max-w-5xl lg:max-h-[90vh]', // Full screen on mobile, auto on desktop
    'mx-0', // No margin on mobile, margin on desktop
    'flex flex-col', // Add flex column layout
    className
  );

  // Always render DialogTitle for accessibility (Radix UI requirement)
  // Hide it visually when hideDialogHeader is true
  const titleContent = title || 'Dialog';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={modalClasses} 
        hideCloseButton={hideCloseButton}
        onInteractOutside={(e) => {
          if (!closeOnOutsideClick) {
            e.preventDefault();
          }
        }}
        {...props}
      >
        {hideDialogHeader ? (
          // Visually hidden title for accessibility (no layout impact)
          <DialogTitle className="sr-only absolute w-0 h-0 overflow-hidden pointer-events-none">{titleContent}</DialogTitle>
        ) : (title || description) && (
          <DialogHeader className="px-6 pt-2 pb-2 shrink-0">
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {actions && (
          <div className="px-6 py-2 shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            {actions}
          </div>
        )}
        <div className={cn("flex-1 overflow-y-auto", hideDialogHeader ? "sm:px-2 px-4 pb-4 pt-0" : "sm:px-2 px-4 pb-4")}>
          {children}
        </div>
        {showCloseButton && (
          <div className="flex justify-end px-6 pb-4 pt-2 border-t shrink-0">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

Modal.displayName = 'Modal';
