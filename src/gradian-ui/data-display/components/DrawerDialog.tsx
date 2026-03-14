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
import { cn, useBackButtonClose } from '@/gradian-ui/shared/utils';
import { useLanguageStore } from '@/stores/language.store';
import { isRTL } from '@/gradian-ui/shared/utils/translation-utils';
import { ConfirmationMessage } from '@/gradian-ui/form-builder/form-elements/components/ConfirmationMessage';

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
   * When rendering as modal, controls whether the footer Close button is shown.
   * Defaults to true.
   */
  showCloseButton?: boolean;
  /**
   * When rendering as modal, hides the top-right X close button when true.
   * Useful when close is handled via explicit actions.
   */
  hideCloseButton?: boolean;
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
  /**
   * Drawer slide direction. 'bottom' = sheet from bottom (closes top to bottom).
   * 'side' = from left/right (RTL-aware). Defaults to 'side'.
   */
  drawerDirection?: 'bottom' | 'side';
  /**
   * Max height of the drawer when using drawer variant (e.g. '95vh', '85%').
   * When unset and direction is bottom: 95vh on mobile, 85vh on larger screens.
   */
  drawerHeight?: string;
  /**
   * When true, bottom drawer uses 95dvh height with no top margin.
   * Ignored for side drawer.
   */
  drawerFullHeight?: boolean;
  /**
   * When true (default), the drawer body wraps children in a scrollable container.
   * When false, scrolling must be handled by children (useful when only an inner
   * list should scroll, not the whole drawer).
   */
  bodyScrollable?: boolean;
  /**
   * Optional actions to render in the header area.
   * - In modal mode: passed to Modal.headerActions (shown on the right side).
   * - In drawer mode: rendered on the right side of the drawer header.
   */
  headerActions?: React.ReactNode;
  /**
   * Optional actions to render on the left side of the modal footer,
   * typically used for a primary action shown next to the default Close button.
   * Only used in modal mode.
   */
  footerLeftActions?: React.ReactNode;
  /**
   * When true, enables a maximize/minimize toggle button in the modal header (dialog mode only).
   */
  enableMaximize?: boolean;
  /**
   * When true, shows a confirmation dialog before closing (both drawer and modal).
   * Useful when the user has unsaved changes or unconfirmed items.
   */
  showConfirmationOnClose?: boolean;
  /**
   * Title for the close confirmation dialog. Defaults to "Close".
   */
  confirmOnCloseTitle?: string;
  /**
   * Message for the close confirmation dialog.
   */
  confirmOnCloseMessage?: string;
  /**
   * Label for the confirm-close action button. Defaults to "Close anyway".
   */
  confirmOnCloseLabel?: string;
  /**
   * When true (drawer only), drag/swipe on the content area will not close the drawer.
   * Use when the content has inputs or scroll so that scrolling does not trigger close.
   */
  noDragOnContent?: boolean;
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
  showCloseButton = true,
  hideCloseButton = false,
  alwaysDrawer,
  handlerPosition = 'top',
  drawerClassName,
  drawerDirection = 'side',
  drawerHeight,
  drawerFullHeight = false,
  bodyScrollable = true,
  headerActions,
  footerLeftActions,
  enableMaximize,
  showConfirmationOnClose = false,
  confirmOnCloseTitle = 'Close',
  confirmOnCloseMessage = 'Are you sure you want to close?',
  confirmOnCloseLabel = 'Close anyway',
  noDragOnContent = false,
}) => {
  const language = useLanguageStore((s) => s.language) || 'en';
  const isRTLLanguage = isRTL(language);
  const isSmallScreen = useIsSmallScreen();
  const [closeConfirmOpen, setCloseConfirmOpen] = React.useState(false);

  const useDrawer = alwaysDrawer || isSmallScreen;

  const handleCloseRequest = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && showConfirmationOnClose) {
        setCloseConfirmOpen(true);
        return;
      }
      onOpenChange(nextOpen);
    },
    [showConfirmationOnClose, onOpenChange],
  );
  useBackButtonClose(open, handleCloseRequest, { markerKey: '__gradianDialog' });

  const closeConfirmNode = showConfirmationOnClose ? (
    <ConfirmationMessage
      isOpen={closeConfirmOpen}
      onOpenChange={(o) => { if (!o) setCloseConfirmOpen(false); }}
      title={confirmOnCloseTitle}
      message={confirmOnCloseMessage}
      variant="warning"
      showSwipe
      buttons={[
        {
          label: 'Cancel',
          variant: 'outline',
          action: () => setCloseConfirmOpen(false),
        },
        {
          label: confirmOnCloseLabel,
          variant: 'destructive',
          action: () => {
            setCloseConfirmOpen(false);
            onOpenChange(false);
          },
        },
      ]}
    />
  ) : null;

  if (!useDrawer) {
    return (
      <>
        <Modal
          isOpen={open}
          onClose={() => handleCloseRequest(false)}
          title={title}
          description={typeof description === 'string' ? description : undefined}
          size={size}
          showCloseButton={showCloseButton}
          hideCloseButton={hideCloseButton}
          headerActions={headerActions}
          footerLeftActions={footerLeftActions}
          enableMaximize={enableMaximize}
        >
          {children}
        </Modal>
        {closeConfirmNode}
      </>
    );
  }

  const isBottom = drawerDirection === 'bottom';
  const showSideHandle = !isBottom && handlerPosition === 'side';
  const vaulDirection = isBottom ? 'bottom' : (isRTLLanguage ? 'left' : 'right');
  const bottomMaxHeight =
    drawerHeight ?? (drawerFullHeight ? '100dvh' : (isSmallScreen ? '95vh' : '85vh'));
  const bottomDrawerFull = isBottom && drawerFullHeight;

  return (
    <>
    <Drawer open={open} onOpenChange={handleCloseRequest} direction={vaulDirection}>
      <DrawerContent
        className={cn(
          'flex flex-col p-0 [&>button]:z-20 z-126 **:data-drawer-handle:hidden',
          isBottom
            ? bottomDrawerFull
              ? 'inset-x-0 bottom-0 top-auto mt-0 w-full max-w-full rounded-t-2xl'
              : 'inset-x-0 bottom-0 top-auto mt-24 w-full max-w-full rounded-t-2xl'
            : cn(
                'inset-y-0 mt-0 h-full w-full max-w-full sm:w-160 sm:max-w-[100vw]',
                isRTLLanguage ? 'left-0 right-auto' : 'right-0 left-auto',
              ),
          drawerClassName,
        )}
        style={isBottom ? { maxHeight: bottomMaxHeight, height: bottomDrawerFull ? '100dvh' : undefined } : undefined}
      >
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

        <DrawerHeader className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <DrawerTitle>{title}</DrawerTitle>
              {description && <DrawerDescription>{description}</DrawerDescription>}
            </div>
            {headerActions && (
              <div className="flex items-center justify-end gap-2 shrink-0 flex-wrap">
                {headerActions}
              </div>
            )}
          </div>
        </DrawerHeader>
        <div
          className={cn(
            'no-scrollbar flex-1',
            bodyScrollable ? 'overflow-y-auto' : 'overflow-y-hidden'
          )}
          data-vaul-no-drag={showConfirmationOnClose || noDragOnContent ? '' : undefined}
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
    {closeConfirmNode}
    </>
  );
};

DrawerDialog.displayName = 'DrawerDialog';

