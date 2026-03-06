"use client";

import React from "react";
import { cn } from "@/gradian-ui/shared/utils";

const DEFAULT_WIDTH_PX = 384; // ~48 cpl thermal

const PRINT_STYLES = `
  @media print {
    html, body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { display: flex !important; justify-content: center !important; }
    svg { max-width: 100% !important; }
  }
`;

/** Strip receiptline's @import of Google Fonts so CSP (style-src) is not violated. Fallback fonts (Courier New, Courier, monospace) are used. */
function stripExternalFontImports(svg: string): string {
  if (!svg) return svg;
  return svg.replace(
    /@import\s+url\s*\(\s*["']?https?:\/\/fonts\.googleapis\.com[^"')]+["']?\s*\)\s*;?/gi,
    ""
  );
}

export interface PrintoutReceiptIframeProps {
  /** SVG string from receiptline.transform (command: 'svg'). */
  svg: string;
  /** Fixed width in px for the receipt strip (default 384). */
  width?: number;
  className?: string;
}

/**
 * Renders receipt SVG inside a fixed-width iframe for label/heat printer preview.
 * Uses srcdoc with a minimal HTML document for isolation and print behavior.
 * Forward ref to the iframe so parent can call contentWindow.print() to print only the receipt.
 */
export const PrintoutReceiptIframe = React.forwardRef<
  HTMLIFrameElement,
  PrintoutReceiptIframeProps
>(function PrintoutReceiptIframe({ svg, width = DEFAULT_WIDTH_PX, className }, ref) {
  const srcdoc = React.useMemo(() => {
    const safeSvg = svg ? stripExternalFontImports(svg) : "";
    const doc = [
      "<!DOCTYPE html>",
      "<html><head><meta charset='utf-8'>",
      "<style>",
      PRINT_STYLES,
      "</style>",
      "</head><body style='margin:0;display:flex;justify-content:center;'>",
      safeSvg || "<p style='color:#666;'>No receipt content</p>",
      "</body></html>",
    ].join("");
    return doc;
  }, [svg]);

  return (
    <iframe
      ref={ref}
      title="Receipt print preview"
      srcDoc={srcdoc}
      className={cn("border-0 bg-white rounded-lg overflow-hidden", className)}
      style={{ width: width ?? DEFAULT_WIDTH_PX, minHeight: 300 }}
      sandbox="allow-same-origin allow-scripts allow-modals"
    />
  );
});
