// PageActionButtons Component
// Action buttons for pages including QR code, share, download, and go to URL

'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/gradian-ui/shared/utils';
import { URL_HOME } from '@/gradian-ui/shared/constants/application-variables';
import { LayoutDashboard, QrCode } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { ShareButton } from './ShareButton';
import { MaximizeButton } from './MaximizeButton';
import { useLayoutContext } from '../contexts/LayoutContext';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';

// Dynamically import QRCodeDialog to avoid SSR issues with HTMLCanvasElement
const QRCodeDialog = dynamic(
  () => import('./QRCodeDialog').then(mod => ({ default: mod.QRCodeDialog })),
  { ssr: false }
);

export interface PageActionButtonsProps {
  value?: string;
  className?: string;
  showQRCode?: boolean;
  showShare?: boolean;
  showDownload?: boolean;
  showGoToUrl?: boolean;
  showHome?: boolean;
  /**
   * Layout variant:
   * - "default": full-width bar with left/right sections
   * - "inline": compact inline actions (for headers/toolbars)
   */
  layout?: 'default' | 'inline';
}

export const PageActionButtons: React.FC<PageActionButtonsProps> = ({
  value,
  className,
  showQRCode = true,
  showShare = true,
  showDownload = true,
  showGoToUrl = true,
  showHome = true,
  layout = 'default',
}) => {
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState<string>('');
  const pathname = usePathname();
  const { isMaximized, title, icon } = useLayoutContext();

  useEffect(() => {
    // Use provided value or current URL
    if (value) {
      setCurrentValue(value);
    } else if (typeof window !== 'undefined') {
      setCurrentValue(window.location.href);
    }
  }, [value, pathname]);


  const isInline = layout === 'inline';

  return (
    <div
      className={cn(
        isInline
          ? 'flex items-center gap-2 w-auto'
          : 'flex items-center justify-between w-full',
        className,
      )}
    >
      {/* Left side - Home button and Title (only in default layout) */}
      {!isInline && (
        <div className="flex items-center gap-3">
          {showHome && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 rounded-lg"
                aria-label="Go to Apps"
              >
                <Link href={URL_HOME}>
                  <LayoutDashboard className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Go to Apps</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
          )}
          {/* Animated Title - Only show when maximized */}
          <AnimatePresence mode="wait">
            {isMaximized && title && (
              <motion.div
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.95 }}
                transition={{
                  duration: 0.3,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="flex items-center gap-2"
              >
                {icon && (
                  <motion.div
                    initial={{ opacity: 0, rotate: -180, scale: 0 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    transition={{
                      duration: 0.4,
                      delay: 0.1,
                      ease: [0.34, 1.56, 0.64, 1],
                    }}
                  >
                    <IconRenderer
                      iconName={icon}
                      className="h-5 w-5 text-violet-600 dark:text-violet-300"
                    />
                  </motion.div>
                )}
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className="text-lg font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap"
                >
                  {title}
                </motion.h1>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Right side / inline actions */}
      <div className={cn('flex items-center gap-2', isInline && 'justify-end')}>
        <MaximizeButton layout={isInline ? 'inline' : 'default'} />
        {showQRCode && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setIsQRDialogOpen(true)}
                  variant="outline"
                  size={isInline ? 'icon' : 'sm'}
                  className={cn(
                    isInline
                      ? 'h-11 w-11 p-0 rounded-xl'
                      : 'h-10 w-10 p-0 rounded-lg',
                  )}
                  aria-label="Show QR Code"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Show QR Code</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {showShare && (
          <ShareButton
            value={currentValue}
            title="Share this page"
            text="Check out this page"
            variant="outline"
            size={isInline ? 'sm' : 'md'}
            className={cn(
              isInline
                ? 'h-11 w-11 p-0 rounded-xl flex items-center justify-center'
                : 'rounded-lg',
            )}
          />
        )}
      </div>

      {/* QR Code Dialog */}
      <QRCodeDialog
        value={currentValue}
        isOpen={isQRDialogOpen}
        onOpenChange={setIsQRDialogOpen}
        showGoToUrl={showGoToUrl}
      />
    </div>
  );
};

PageActionButtons.displayName = 'PageActionButtons';

