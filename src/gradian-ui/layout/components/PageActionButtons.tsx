// PageActionButtons Component
// Action buttons for pages including QR code, share, download, and go to URL

'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/gradian-ui/shared/utils';
import { URL_HOME } from '@/gradian-ui/shared/constants/application-variables';
import { Home, QrCode } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ShareButton } from './ShareButton';

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
      {/* Left side - Home button (only in default layout) */}
      {!isInline && showHome && (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-10 w-10 p-0 rounded-lg"
          title="Go to Apps"
        >
          <Link href={URL_HOME} aria-label="Go to Apps">
            <Home className="h-4 w-4" />
          </Link>
        </Button>
      )}

      {/* Right side / inline actions */}
      <div className={cn('flex items-center gap-2', isInline && 'justify-end')}>
        {showQRCode && (
          <Button
            onClick={() => setIsQRDialogOpen(true)}
            variant="outline"
            size={isInline ? 'icon' : 'sm'}
            className={cn(
              isInline
                ? 'h-11 w-11 p-0 rounded-xl'
                : 'h-10 w-10 p-0 rounded-lg',
            )}
            title="Show QR Code"
          >
            <QrCode className="h-4 w-4" />
          </Button>
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

