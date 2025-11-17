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
    'bg-white dark:bg-gray-900 shadow-xl overflow-hidden',
    'rounded-none lg:rounded-2xl', // No rounded corners on mobile, rounded on desktop
    'h-full w-full lg:max-w-5xl lg:max-h-[90vh]', // Full screen on mobile, auto on desktop
    'mx-0 md:mx-2', // No margin on mobile, margin on desktop
    'flex flex-col', // Add flex column layout
    className
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={modalClasses} 
        onInteractOutside={(e) => {
          if (!closeOnOutsideClick) {
            e.preventDefault();
          }
        }}
        {...props}
      >
        {(title || description) && (
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
        <div className="flex-1 sm:px-2 px-4 pb-4 overflow-y-auto">
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
