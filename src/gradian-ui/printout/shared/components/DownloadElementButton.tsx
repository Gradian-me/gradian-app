"use client";

import React, { useCallback } from "react";
import type { RefObject } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, getExportTimestamp } from "@/gradian-ui/shared/utils";
import { downloadElementAsImage, type PrintExportType } from "../utils/print-element-as-image";

const DEFAULT_EXPORT_FILENAME = () => `Gradian_Label_Export_${getExportTimestamp()}.png`;

export interface DownloadElementButtonProps {
  /** Ref to the element to capture and download (e.g. ticket card root). */
  elementRef: RefObject<HTMLElement | null>;
  /**
   * Export method: "png" (default) or "canvas" (toCanvas then toBlob; use for ticket/card).
   * @default "png"
   */
  exportType?: PrintExportType;
  /** Filename for the download. Default: Gradian_Label_Export_{yyyy-MM-dd_HH-mm-ss}.png */
  filename?: string;
  /** Optional class for the button. */
  className?: string;
  /** Optional label (default: "Download"). */
  label?: string;
  /** Called when download fails. */
  onError?: (error: Error) => void;
  /** When true, button is disabled (e.g. while another action like QR capture is in progress). */
  disabled?: boolean;
  /** Button variant/size - passed to Button. */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Button that captures the element at elementRef as PNG (via toBlob when exportType is "canvas")
 * and triggers a file download. Hidden when printing (print:hidden).
 */
export function DownloadElementButton({
  elementRef,
  exportType = "png",
  filename,
  className,
  label = "Download",
  onError,
  disabled: disabledProp = false,
  variant = "outline",
  size = "sm",
}: DownloadElementButtonProps) {
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = useCallback(async () => {
    const el = elementRef.current;
    if (!el) return;
    setDownloading(true);
    try {
      const name = filename ?? DEFAULT_EXPORT_FILENAME();
      await downloadElementAsImage(el, {
        quality: "normal",
        exportType,
        filename: name,
        onError: (err) => {
          onError?.(err);
        },
      });
    } finally {
      setDownloading(false);
    }
  }, [elementRef, exportType, filename, onError]);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={downloading || disabledProp}
      className={cn("print:hidden", className)}
      title={downloading ? "Saving…" : label}
      aria-label={downloading ? "Saving…" : label}
    >
      {downloading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        <Download className="h-4 w-4 shrink-0" aria-hidden />
      )}
      {size !== "icon" && label ? (
        <span className="ml-1.5">{downloading ? "Saving…" : label}</span>
      ) : null}
    </Button>
  );
}
