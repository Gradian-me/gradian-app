"use client";

import React, { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { QrCode, Loader2 } from "lucide-react";
import { cn } from "@/gradian-ui/shared/utils";
import {
  PrintElementButton,
  DownloadElementButton,
  captureElementAsDataUrl,
} from "@/gradian-ui/printout";
import { Button } from "@/components/ui/button";
import { ensurePngDataUrl } from "@/gradian-ui/shared/utils/image-utils";

const QRCodeDialog = dynamic(
  () =>
    import("@/gradian-ui/layout/components/QRCodeDialog").then((mod) => ({
      default: mod.QRCodeDialog,
    })),
  { ssr: false }
);

export type TicketCardOrientation = "portrait" | "landscape";

/** CSS mask cutout: notch radius and vertical position (e.g. "50%" or "120px"). */
const NOTCH_RADIUS_PX = 16;
const NOTCH_Y_DEFAULT = "50%";
/** Rough upper bound for data URL length that typical QR codes can handle. */
const MAX_QR_DATA_URL_LENGTH = 4500;

export interface TicketCardWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  /** When true, punch left/right circular notches via CSS mask for ticket strip effect. Disable in modals if it clashes. */
  showCutouts?: boolean;
  /** Tailwind class for the cut-out circles so they match the background behind the ticket (e.g. "bg-white dark:bg-gray-800"). Unused when using mask cutouts; kept for API compatibility. */
  cutoutClassName?: string;
  /** When true, show a print button (top right) that captures the ticket as PNG and opens the print dialog. Button is hidden when printing. */
  showPrintButton?: boolean;
  /** Portrait (default) = taller/narrower; landscape = wider ticket, optimised horizontally. */
  orientation?: TicketCardOrientation;
}

function setRef<T>(ref: React.Ref<T> | null | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.MutableRefObject<T | null>).current = value;
}

/**
 * Inline mask style that punches two circles out of the card edges.
 * Layers: [left circle, right circle, full fill]; composite excludes circles from full so mask is visible everywhere except the notches.
 */
function getCutoutMaskStyle(): React.CSSProperties {
  const notch = `${NOTCH_RADIUS_PX}px`;
  const ny = NOTCH_Y_DEFAULT;
  const leftRadial = `radial-gradient(circle ${notch} at 0 ${ny}, black 99%, transparent 100%)`;
  const rightRadial = `radial-gradient(circle ${notch} at 100% ${ny}, black 99%, transparent 100%)`;
  const full = "linear-gradient(black, black)";
  const maskImage = `${leftRadial}, ${rightRadial}, ${full}`;
  return {
    WebkitMaskImage: maskImage,
    WebkitMaskComposite: "destination-out, destination-out",
    maskImage,
    maskComposite: "exclude, exclude",
  } as React.CSSProperties;
}

const TicketCardWrapper = React.forwardRef<HTMLDivElement, TicketCardWrapperProps>(
  (
    {
      className,
      showCutouts = true,
      cutoutClassName = "bg-background",
      showPrintButton = true,
      orientation = "portrait",
      children,
      style,
      ...props
    },
    ref
  ) => {
    const internalRef = React.useRef<HTMLDivElement>(null);
    const [qrDialogOpen, setQrDialogOpen] = useState(false);
    const [qrValue, setQrValue] = useState<string>("");
    const [qrLoading, setQrLoading] = useState(false);

    const setRefs = React.useCallback(
      (el: HTMLDivElement | null) => {
        (internalRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        setRef(ref, el);
      },
      [ref]
    );

    const handleQrClick = useCallback(async () => {
      const el = internalRef.current;
      if (!el || qrLoading) return;
      setQrLoading(true);
      setQrValue("");
      try {
        const dataUrl = await captureElementAsDataUrl(el, {
          exportType: "canvas",
          quality: "draft",
          maxDimension: 100,
          onError: (err) => {
            console.error("[TicketCardWrapper] QR capture failed:", err);
          },
        });
        if (!dataUrl || typeof dataUrl !== "string") {
          return;
        }
        if (dataUrl.length > MAX_QR_DATA_URL_LENGTH) {
          console.warn(
            "[TicketCardWrapper] QR payload too large for QR code; length=",
            dataUrl.length
          );
          return;
        }
        const pngDataUrl = ensurePngDataUrl(dataUrl);
        setQrValue(pngDataUrl);
        setQrDialogOpen(true);
      } catch (err) {
        console.error("[TicketCardWrapper] QR capture error:", err);
      } finally {
        setQrLoading(false);
      }
    }, [qrLoading]);

    const maskStyle = showCutouts ? getCutoutMaskStyle() : undefined;
    const combinedStyle = style ?? maskStyle ? { ...style, ...maskStyle } : undefined;
    return (
      <div
        ref={setRefs}
        className={cn(
          "relative w-full rounded-2xl font-sans print:shadow-none",
          orientation === "portrait" ? "max-w-sm" : "max-w-2xl",
          "border border-gray-200 dark:border-gray-700",
          "bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-gray-100",
          "animate-in fade-in-0 zoom-in-95 duration-300",
          className
        )}
        style={combinedStyle}
        data-orientation={orientation}
        data-cutouts={showCutouts ? "mask" : "none"}
        {...props}
      >
        {showPrintButton && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={handleQrClick}
              disabled={qrLoading}
              className="print:hidden h-8 w-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Show as QR code (scan to open image offline)"
              aria-label={qrLoading ? "Loading QR code…" : "Show ticket as QR code"}
            >
              {qrLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <QrCode className="h-4 w-4" aria-hidden />
              )}
            </Button>
            <DownloadElementButton
              elementRef={internalRef}
              exportType="canvas"
              size="icon"
              variant="secondary"
              disabled={qrLoading}
              className="h-8 w-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 hover:bg-gray-100 dark:hover:bg-gray-700"
            />
            <PrintElementButton
              elementRef={internalRef}
              exportType="canvas"
              size="icon"
              variant="secondary"
              disabled={qrLoading}
              className="h-8 w-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 hover:bg-gray-100 dark:hover:bg-gray-700"
            />
          </div>
        )}
        {showCutouts && (
          <>
            <div
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full border border-gray-200 dark:border-gray-700 bg-transparent"
              aria-hidden
              style={{
                width: NOTCH_RADIUS_PX * 2,
                height: NOTCH_RADIUS_PX * 2,
                left: -NOTCH_RADIUS_PX,
              }}
            />
            <div
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full border border-gray-200 dark:border-gray-700 bg-transparent"
              aria-hidden
              style={{
                width: NOTCH_RADIUS_PX * 2,
                height: NOTCH_RADIUS_PX * 2,
                right: -NOTCH_RADIUS_PX,
              }}
            />
          </>
        )}
        <QRCodeDialog
          value={qrValue}
          isOpen={qrDialogOpen}
          onOpenChange={setQrDialogOpen}
          showGoToUrl={false}
        />
        {children}
      </div>
    );
  }
);

TicketCardWrapper.displayName = "TicketCardWrapper";

export { TicketCardWrapper };
