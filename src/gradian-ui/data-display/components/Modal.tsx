// Modal Component

'use client';

import { Button } from '@/components/ui/button';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { getDefaultLanguage, getT } from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';
import { Maximize2, Minimize2 } from 'lucide-react';
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { cn } from '../../shared/utils';
import { ModalProps } from '../types';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import { Badge } from '@/gradian-ui/form-builder/form-elements/components/Badge';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';

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
  enableMaximize,
  defaultMaximized,
  onMaximizeChange,
  enableCopy = false,
  copyContent,
  headerBadges = [],
  ...props
}) => {
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const closeButtonLabel = getT(TRANSLATION_KEYS.BUTTON_CLOSE, language, defaultLang);

  const [isMaximized, setIsMaximized] = React.useState<boolean>(!!defaultMaximized);

  React.useEffect(() => {
    if (typeof onMaximizeChange === 'function') {
      onMaximizeChange(isMaximized);
    }
  }, [isMaximized, onMaximizeChange]);

  const modalClasses = cn(
    hideDialogHeader 
      ? 'border-0 bg-white dark:bg-gray-900 shadow-none overflow-hidden rounded-none h-full w-full' // Full screen, no border, no rounded corners, no max constraints when header is hidden
      : cn(
          'border-none bg-white dark:bg-gray-900 shadow-xl overflow-hidden rounded-none lg:rounded-2xl h-full w-full',
          // When not maximized, use default max size (caller className can override)
          !(enableMaximize && isMaximized) && 'lg:max-h-[90vh] lg:max-w-[90vw]',
        ),
    'mx-0', // No margin on mobile, margin on desktop
    'flex flex-col', // Add flex column layout
    // When maximized, don't apply caller className for size so our maximized style wins
    !(enableMaximize && isMaximized) && className
  );

  // When maximized, use inline style so dialog actually resizes (overrides any className)
  const maximizedStyle =
    enableMaximize && isMaximized
      ? { width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh' }
      : undefined;

  // Always render DialogTitle for accessibility (Radix UI requirement)
  // Hide it visually when hideDialogHeader is true
  const titleContent = title || 'Dialog';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={modalClasses}
        style={maximizedStyle}
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
        ) : (title || description || headerActions || enableMaximize || (enableCopy && copyContent !== undefined && copyContent !== null) || headerBadges.length > 0) && (
          <DialogHeader className="px-6 pt-2 pb-2 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 gap-2 flex flex-col">
                {title && (
                <DialogTitle className="line-clamp-3 wrap-break-word">
                  {title}
                </DialogTitle>
              )}
                {description && (!enableMaximize || !isMaximized) && (
                  <DialogDescription>{description}</DialogDescription>
                )}
              </div>
              {(headerActions || enableMaximize || (enableCopy && copyContent !== undefined && copyContent !== null) || headerBadges.length > 0) && (
                <div className="flex items-center justify-end gap-2 shrink-0 flex-wrap">
                  {headerBadges.length > 0 && (
                    <>
                      {headerBadges.map((badge) => (
                        <Badge key={badge.id} size="sm" color={badge.color || 'cyan'}>
                          {badge.icon && <IconRenderer iconName={badge.icon} className="h-3 w-3 me-1" />}
                          {badge.label}
                        </Badge>
                      ))}
                    </>
                  )}
                  {enableCopy && copyContent !== undefined && copyContent !== null && (
                    <CopyContent content={copyContent} className="h-8 w-8" />
                  )}
                  {headerActions}
                  {enableMaximize && (
                    // By default show on large screens; callers can further control with wrapper classes.
                    <Button
                      type="button"
                      variant="square"
                      size="sm"
                      className="hidden lg:inline-flex"
                      onClick={() => setIsMaximized((prev) => !prev)}
                      aria-label={isMaximized ? 'Restore dialog size' : 'Maximize dialog'}
                    >
                      {isMaximized ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
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
