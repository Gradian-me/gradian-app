'use client';

import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Modal } from './Modal';
import { cn } from '@/gradian-ui/shared/utils';
import { useLanguageStore } from '@/stores/language.store';
import { isRTL } from '@/gradian-ui/shared/utils/translation-utils';

export interface DrawerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /**
   * Modal size used when rendered as dialog on larger screens.
   * Defaults to 'lg'.
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /**
   * When true, always render as drawer on all breakpoints.
   * When false/undefined, render as drawer on small screens and modal on larger screens.
   */
  alwaysDrawer?: boolean;
  /**
   * Visual position for the drawer handle when using drawer variant.
   * - 'top': centered at top (default)
   * - 'side': vertical handle on the side (RTL-aware)
   */
  handlerPosition?: 'top' | 'side';
  /**
   * Optional extra className for drawer content container.
   */
  drawerClassName?: string;
}

function useIsSmallScreen(): boolean {
  const [isSmall, setIsSmall] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 639px)');
    const handler = (event: MediaQueryListEvent) => {
      setIsSmall(event.matches);
    };
    setIsSmall(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isSmall;
}

export const DrawerDialog: React.FC<DrawerDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = 'lg',
  alwaysDrawer,
  handlerPosition = 'top',
  drawerClassName,
}) => {
  const language = useLanguageStore((s) => s.language) || 'en';
  const isRTLLanguage = isRTL(language);
  const isSmallScreen = useIsSmallScreen();

  const useDrawer = alwaysDrawer || isSmallScreen;

  if (!useDrawer) {
    return (
      <Modal
        isOpen={open}
        onClose={() => onOpenChange(false)}
        title={title}
        description={typeof description === 'string' ? description : undefined}
        size={size}
        showCloseButton={true}
      >
        {children}
      </Modal>
    );
  }

  const showSideHandle = handlerPosition === 'side';

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isRTLLanguage ? 'left' : 'right'}>
      <DrawerContent
        className={cn(
          'inset-y-0 mt-0 h-full w-full max-w-full sm:w-160 sm:max-w-[100vw] flex flex-col p-0 [&>button]:z-20 z-100! **:data-drawer-handle:hidden',
          isRTLLanguage ? 'left-0 right-auto' : 'right-0 left-auto',
          drawerClassName,
        )}
      >
        {/* Custom handler: side = on inner edge — left when RTL (drawer opens from left), right when LTR (drawer opens from right) */}
        {showSideHandle ? (
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 h-20 w-2 rounded-full bg-gray-200 dark:bg-gray-700',
              isRTLLanguage ? 'left-1' : 'right-1'
            )}
          />
        ) : (
          <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-gray-200 dark:bg-gray-700" />
        )}

        <DrawerHeader className="px-6 pt-6 pb-4 pe-12 border-b border-gray-200 dark:border-gray-700 shrink-0 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        <div className="no-scrollbar flex-1 overflow-y-auto">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

DrawerDialog.displayName = 'DrawerDialog';

