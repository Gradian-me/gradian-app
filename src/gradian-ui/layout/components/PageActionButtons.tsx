// PageActionButtons Component
// Action buttons for pages including QR code, share, download, and go to URL

'use client';

import React, { useState, useEffect } from 'react';
import { QrCode, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ShareButton } from './ShareButton';
import { QRCodeDialog } from './QRCodeDialog';
import { cn } from '@/gradian-ui/shared/utils';
import { usePathname, useRouter } from 'next/navigation';
import { Home } from 'lucide-react';

export interface PageActionButtonsProps {
  value?: string;
  className?: string;
  showQRCode?: boolean;
  showShare?: boolean;
  showDownload?: boolean;
  showGoToUrl?: boolean;
  showHome?: boolean;
}

export const PageActionButtons: React.FC<PageActionButtonsProps> = ({
  value,
  className,
  showQRCode = true,
  showShare = true,
  showDownload = true,
  showGoToUrl = true,
  showHome = true,
}) => {
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState<string>('');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Use provided value or current URL
    if (value) {
      setCurrentValue(value);
    } else if (typeof window !== 'undefined') {
      setCurrentValue(window.location.href);
    }
  }, [value, pathname]);


  return (
    <div className={cn('flex items-center justify-between w-full', className)}>
      {/* Left side - Home button */}
      {showHome && (
        <Button
          onClick={() => router.push('/apps')}
          variant="outline"
          size="sm"
          className="h-10 w-10 p-0"
          title="Go to Apps"
        >
          <Home className="h-4 w-4" />
        </Button>
      )}

      {/* Right side - Action buttons */}
      <div className="flex items-center gap-2">
        {showQRCode && (
          <Button
            onClick={() => setIsQRDialogOpen(true)}
            variant="outline"
            size="sm"
            className="h-10 w-10 p-0"
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
            size="md"
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

