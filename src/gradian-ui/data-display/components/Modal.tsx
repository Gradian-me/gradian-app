// Modal Component

'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { ModalProps } from '../types';
import { cn } from '../../shared/utils';
import { Button } from '@/components/ui/button';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

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
  footerLeftActions,
  headerActions,
  ...props
}) => {
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const closeButtonLabel = getT(TRANSLATION_KEYS.BUTTON_CLOSE, language, defaultLang);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'md:max-w-4xl',
    lg: 'lg:max-w-7xl',
    xl: 'xl:max-w-[88rem]',
    full: 'max-w-full mx-4',
  };

  const modalClasses = cn(
    hideDialogHeader 
      ? 'border-0 bg-white dark:bg-gray-900 shadow-none overflow-hidden rounded-none h-full w-full' // Full screen, no border, no rounded corners, no max constraints when header is hidden
      : 'border-none bg-white dark:bg-gray-900 shadow-xl overflow-hidden rounded-none lg:rounded-2xl h-full w-full lg:max-w-5xl lg:max-h-[90vh]', // No rounded corners on mobile, rounded on desktop
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
          <DialogTitle className="sr-only absolute w-0 h-0 overflow-hidden pointer-events-none">
            {titleContent}
          </DialogTitle>
        ) : (title || description || headerActions) && (
          <DialogHeader className="px-6 pt-2 pb-2 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 gap-2 flex flex-col">
                {title && (
                <DialogTitle className="line-clamp-3 wrap-break-word">
                  {title}
                </DialogTitle>
              )}
                {description && <DialogDescription>{description}</DialogDescription>}
              </div>
              {headerActions && (
                <div className="flex items-center gap-2 shrink-0">
                  {headerActions}
                </div>
              )}
            </div>
          </DialogHeader>
        )}
        {actions && (
          <div className="px-6 py-2 shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            {actions}
          </div>
        )}
        <div className={cn("flex-1 overflow-y-auto", hideDialogHeader ? "px-1 md:px-2 pb-4 pt-0" : "px-1 md:px-2 pb-4")}>
          {children}
        </div>
        {showCloseButton && (
          <div className={cn(
            "flex px-6 pb-4 pt-2 border-t shrink-0",
            footerLeftActions ? "justify-between" : "justify-end"
          )}>
            {footerLeftActions && (
              <div className="flex items-center gap-2">
                {footerLeftActions}
              </div>
            )}
            <Button variant="outline" onClick={onClose}>
              {closeButtonLabel}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

Modal.displayName = 'Modal';
