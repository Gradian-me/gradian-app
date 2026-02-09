// QRCodeDialog Component
// Reusable QR code dialog component

'use client';

import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QRCodeCanvas } from '@/gradian-ui/form-builder/form-elements/components/QRCodeCanvas';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import { useQrcodeDownload } from 'react-qrcode-pretty';
import { toast } from 'sonner';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

import { QRCodeCanvasProps } from '@/gradian-ui/form-builder/form-elements/components/QRCodeCanvas';

export interface QRCodeDialogProps {
  value: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  showGoToUrl?: boolean;
  qrConfig?: Partial<QRCodeCanvasProps>;
}

export const QRCodeDialog: React.FC<QRCodeDialogProps> = ({
  value,
  isOpen,
  onOpenChange,
  showGoToUrl = true,
  qrConfig,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [setQrcode, download, isReady] = useQrcodeDownload();
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isValidUrl = (str: string): boolean => {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleGoToUrl = () => {
    if (value && isValidUrl(value)) {
      window.open(value, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownload = () => {
    if (isReady && download) {
      download('qrcode');
    }
  };

  const handleQRReady = (element: HTMLCanvasElement) => {
    if (setQrcode) {
      setQrcode(element);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{getT(TRANSLATION_KEYS.TITLE_QR_CODE, language, defaultLang)}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="bg-white p-4 rounded-3xl shadow-sm max-w-[400px] mx-auto">
            <QRCodeCanvas
              value={value}
              onReady={handleQRReady}
              {...qrConfig}
            />
          </div>
          <div className="w-full">
            <div className="flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300 break-all flex-1 text-center font-mono">
                {value}
              </p>
              <CopyContent content={value} />
            </div>
          </div>
          {isMounted && (
            <div className="flex items-center gap-2 w-full">
              {showGoToUrl && value && isValidUrl(value) && (
                <Button
                  onClick={handleGoToUrl}
                  variant="outline"
                  size="sm"
                  className="h-10 flex-1"
                >
                  <ExternalLink className="h-4 w-4 me-2" />
                  {getT(TRANSLATION_KEYS.ACTION_OPEN_URL, language, defaultLang)}
                </Button>
              )}
              <Button
                onClick={handleDownload}
                disabled={!isReady}
                variant="default"
                size="sm"
                className="h-10 flex-1"
              >
                <Download className="h-4 w-4 me-2" />
                {getT(TRANSLATION_KEYS.ACTION_DOWNLOAD, language, defaultLang)}
              </Button>
              <Button
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: getT(TRANSLATION_KEYS.TITLE_SHARE_QR_CODE, language, defaultLang),
                        text: getT(TRANSLATION_KEYS.TEXT_CHECK_OUT_THIS_QR_CODE, language, defaultLang),
                        url: value,
                      });
                    } catch (error) {
                      if (error instanceof Error && error.name !== 'AbortError') {
                        console.error('Error sharing:', error);
                      }
                    }
                  } else {
                    try {
                      await navigator.clipboard.writeText(value);
                      toast.success(getT(TRANSLATION_KEYS.MESSAGE_COPIED_TO_CLIPBOARD, language, defaultLang));
                    } catch (error) {
                      console.error('Error copying to clipboard:', error);
                      toast.error(getT(TRANSLATION_KEYS.MESSAGE_FAILED_TO_COPY, language, defaultLang));
                    }
                  }
                }}
                variant="default"
                size="sm"
                className="h-10 flex-1"
              >
                <Share2 className="h-4 w-4 me-2" />
                {getT(TRANSLATION_KEYS.ACTION_SHARE, language, defaultLang)}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

QRCodeDialog.displayName = 'QRCodeDialog';

