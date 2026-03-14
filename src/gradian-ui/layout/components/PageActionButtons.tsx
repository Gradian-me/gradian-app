// PageActionButtons Component
// Action buttons for pages including QR code, share, download, and go to URL

'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/gradian-ui/shared/utils';
import { URL_HOME } from '@/gradian-ui/shared/configs/ui-config';
import { LayoutDashboard, MoreVertical, QrCode, ScanBarcode, Share2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { MaximizeButton } from './MaximizeButton';
import { useLayoutContext } from '../contexts/LayoutContext';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { ModeToggle } from '../mode-toggle';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { useUserStore } from '@/stores/user.store';
import { canAccessSystemAdminRoute } from '@/gradian-ui/shared/utils/access-control';
import { FormDialog } from '@/gradian-ui/form-builder/components/FormDialog';
import type { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { Settings2 } from 'lucide-react';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { toast } from '@/components/ui/sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Dynamically import QRCodeDialog to avoid SSR issues with HTMLCanvasElement
const QRCodeDialog = dynamic(
  () =>
    import('@/gradian-ui/barcode-management/barcode-generator/components/QRCodeDialog').then(
      (mod) => ({ default: mod.QRCodeDialog })
    ),
  { ssr: false }
);

// Dynamically import BarcodeScannerWrapper (camera/media APIs)
const BarcodeScannerWrapper = dynamic(
  () =>
    import('@/gradian-ui/barcode-management').then((mod) => ({ default: mod.BarcodeScannerWrapper })),
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
  showBarcodeScanner?: boolean;
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
  showBarcodeScanner = true,
  layout = 'default',
}) => {
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState<string>('');
  const pathname = usePathname();
  const { isMaximized, title, icon } = useLayoutContext();
  const language = useLanguageStore((s) => s.language);
  const user = useUserStore((s) => s.user);
  const defaultLang = getDefaultLanguage();
  const labelGoToApps = getT(TRANSLATION_KEYS.ACTION_GO_TO_APPS, language, defaultLang);
  const labelToggleTheme = getT(TRANSLATION_KEYS.ACTION_TOGGLE_THEME, language, defaultLang);
  const labelShowQRCode = getT(TRANSLATION_KEYS.ACTION_SHOW_QR_CODE, language, defaultLang);
  const labelOpenBarcodeScanner = getT(TRANSLATION_KEYS.ACTION_OPEN_BARCODE_SCANNER, language, defaultLang);
  const labelMoreActions = getT(TRANSLATION_KEYS.ACTION_MORE_ACTIONS, language, defaultLang);
  const labelShare = getT(TRANSLATION_KEYS.ACTION_SHARE, language, defaultLang);
  const labelMaximizeView = getT(TRANSLATION_KEYS.ACTION_MAXIMIZE_VIEW, language, defaultLang);
  const labelMinimizeView = getT(TRANSLATION_KEYS.ACTION_MINIMIZE_VIEW, language, defaultLang);
  const labelOpenSettings = 'Application Settings';
  const titleSharePage = getT(TRANSLATION_KEYS.TITLE_SHARE_THIS_PAGE, language, defaultLang);
  const textSharePage = getT(TRANSLATION_KEYS.TEXT_CHECK_OUT_THIS_PAGE, language, defaultLang);

  const [isAppConfigDialogOpen, setIsAppConfigDialogOpen] = useState(false);
  const [appConfigSchema, setAppConfigSchema] = useState<FormSchema | null>(null);
  const [isLoadingAppConfigSchema, setIsLoadingAppConfigSchema] = useState(false);
  const [appConfigInitialValues, setAppConfigInitialValues] = useState<Record<string, any> | null>(null);
  const [isSavingAppConfig, setIsSavingAppConfig] = useState(false);

  const isSystemAdministrator = user ? canAccessSystemAdminRoute(user) : false;

  const handleOpenApplicationConfig = async () => {
    if (!isSystemAdministrator) return;
    try {
      setIsLoadingAppConfigSchema(true);
      let schema = appConfigSchema;
      if (!schema) {
        const response = await apiRequest<FormSchema>('/api/schemas/application-config');
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to load application-config schema');
        }
        schema = response.data as FormSchema;
        setAppConfigSchema(schema);
      }

      // Load current singleton application-config data; if not found, start with default id
      const entityResponse = await apiRequest<any>('/api/data/application-config/application-config');
      if (entityResponse.success && entityResponse.data) {
        setAppConfigInitialValues({
          id: 'application-config',
          ...entityResponse.data,
        });
      } else if (entityResponse.statusCode === 404) {
        // No existing config yet – initialize with fixed singleton id
        setAppConfigInitialValues({ id: 'application-config' });
      } else if (!entityResponse.success) {
        loggingCustom(
          LogType.CLIENT_LOG,
          'error',
          `[PageActionButtons] Failed to load application-config entity: ${entityResponse.error || 'Unknown error'}`,
        );
        setAppConfigInitialValues({ id: 'application-config' });
      }

      setIsAppConfigDialogOpen(true);
    } catch (error) {
      loggingCustom(
        LogType.CLIENT_LOG,
        'error',
        `[PageActionButtons] Failed to load application-config schema: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setIsLoadingAppConfigSchema(false);
    }
  };

  useEffect(() => {
    // Use provided value or current URL
    if (value) {
      setCurrentValue(value);
    } else if (typeof window !== 'undefined') {
      setCurrentValue(window.location.href);
    }
  }, [value, pathname]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: titleSharePage || undefined,
          text: textSharePage || currentValue,
          url: currentValue,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          loggingCustom(LogType.CLIENT_LOG, 'error', `[PageActionButtons] Share failed: ${err.message}`);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(currentValue);
        toast.success(labelShare, { description: 'Link copied to clipboard' });
      } catch {
        toast.error('Failed to copy link');
      }
    }
  };

  const hasActionsMenuItems = showQRCode || showShare || showBarcodeScanner;
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
              <div
                className={cn(buttonVariants({ variant: 'square', size: 'sm' }), 'relative')}
                role="presentation"
              >
                <Link
                  href={URL_HOME}
                  className="absolute inset-0 flex items-center justify-center no-underline text-violet-700 hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-300 focus:outline-none"
                  aria-label={labelGoToApps}
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                </Link>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{labelGoToApps}</p>
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
        <MaximizeButton
          layout={isInline ? 'inline' : 'default'}
          labelMaximize={labelMaximizeView}
          labelMinimize={labelMinimizeView}
        />
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ModeToggle
                  variant="square"
                  className={isInline ? 'h-11 w-11 p-0' : undefined}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{labelToggleTheme}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {hasActionsMenuItems && (
          <DropdownMenu>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="square"
                      size="sm"
                      className={cn(isInline && 'h-11 w-11 p-0')}
                      aria-label={labelMoreActions}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{labelMoreActions}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent
              align="end"
              className="min-w-44 rounded-xl border border-gray-200/80 bg-white/95 p-1.5 shadow-xl shadow-gray-200/50 backdrop-blur-md dark:border-gray-600/80 dark:bg-gray-800/95 dark:shadow-gray-950/50"
            >
              {showQRCode && (
                <DropdownMenuItem
                  onSelect={() => setIsQRDialogOpen(true)}
                  className="flex items-center gap-2.5 rounded-lg py-2 text-xs cursor-pointer text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/80"
                >
                  <QrCode className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                  {labelShowQRCode}
                </DropdownMenuItem>
              )}
              {showShare && (
                <DropdownMenuItem
                  onSelect={() => handleShare()}
                  className="flex items-center gap-2.5 rounded-lg py-2 text-xs cursor-pointer text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/80"
                >
                  <Share2 className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                  {labelShare}
                </DropdownMenuItem>
              )}
              {showBarcodeScanner && (
                <DropdownMenuItem
                  onSelect={() => setIsBarcodeScannerOpen(true)}
                  className="flex items-center gap-2.5 rounded-lg py-2 text-xs cursor-pointer text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/80"
                >
                  <ScanBarcode className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                  {labelOpenBarcodeScanner}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {isSystemAdministrator && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleOpenApplicationConfig}
                  variant="square"
                  size="sm"
                  className={isInline ? 'h-11 w-11 p-0' : undefined}
                  aria-label={labelOpenSettings}
                  disabled={isLoadingAppConfigSchema}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{labelOpenSettings}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* QR Code Dialog */}
      <QRCodeDialog
        value={currentValue}
        isOpen={isQRDialogOpen}
        onOpenChange={setIsQRDialogOpen}
        showGoToUrl={showGoToUrl}
      />

      {/* Single barcode scanner drawer */}
      {showBarcodeScanner && (
        <BarcodeScannerWrapper
          open={isBarcodeScannerOpen}
          onOpenChange={setIsBarcodeScannerOpen}
          allowedFormats={['Code128', 'QR', 'DataMatrix', 'EAN']}
          enableBeep
          enableMultipleScan={false}
          enableChangeCount={false}
          enableMockData
          onScan={async (value) => {
            try {
              await navigator.clipboard.writeText(value);
              toast.success('Scanned', {
                description: value.length > 40 ? `${value.slice(0, 40)}…` : value,
              });
            } catch {
              toast.success('Scanned', { description: value });
            }
          }}
          title={labelOpenBarcodeScanner}
        />
      )}

      {isSystemAdministrator && appConfigSchema && (
        <FormDialog
          isOpen={isAppConfigDialogOpen}
          onClose={() => setIsAppConfigDialogOpen(false)}
          schema={appConfigSchema}
          title={labelOpenSettings}
          description="Manage global application configuration."
          size="lg"
          initialValues={appConfigInitialValues ?? { id: 'application-config' }}
          disabled={isSavingAppConfig}
          onSubmit={async (values) => {
            try {
              setIsSavingAppConfig(true);
              const response = await apiRequest<any>('/api/data/application-config/application-config', {
                method: 'PUT',
                body: {
                  ...values,
                  id: 'application-config',
                },
              });
              if (!response.success) {
                throw new Error(response.error || 'Failed to save application configuration');
              }
              if (response.data) {
                setAppConfigInitialValues({
                  id: 'application-config',
                  ...response.data,
                });
              } else {
                setAppConfigInitialValues({
                  id: 'application-config',
                  ...values,
                });
              }
            } catch (error) {
              loggingCustom(
                LogType.CLIENT_LOG,
                'error',
                `[PageActionButtons] Failed to save application-config entity: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              );
              throw error;
            } finally {
              setIsSavingAppConfig(false);
            }
          }}
        />
      )}
    </div>
  );
};

PageActionButtons.displayName = 'PageActionButtons';

