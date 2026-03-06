"use client";

import { useMemo } from "react";
import { transformDocToSvg } from "../utils/transform";
import type { PrinterConfig, ReceiptLineDoc } from "../types";

export interface UseReceiptSvgResult {
  svg: string;
  error: Error | null;
}

/**
 * Memoized transformation of a ReceiptLine document to SVG.
 * Re-runs only when doc or printerConfig change.
 */
export function useReceiptSvg(
  doc: ReceiptLineDoc,
  printerConfig?: Partial<PrinterConfig>
): UseReceiptSvgResult {
  const configKey = useMemo(
    () => JSON.stringify(printerConfig ?? {}),
    [printerConfig]
  );
  return useMemo(() => {
    const config = printerConfig ?? undefined;
    const svg = transformDocToSvg(doc, config);
    if (svg.length === 0 && doc.trim().length > 0) {
      return {
        svg: "",
        error: new Error("ReceiptLine transform returned empty result"),
      };
    }
    return { svg, error: null };
    // configKey stabilizes when config shape/values are unchanged
  }, [doc, configKey]);
}
