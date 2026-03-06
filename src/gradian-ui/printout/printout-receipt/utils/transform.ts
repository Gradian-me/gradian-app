import receiptline from "receiptline";
import type { PrinterConfig, ReceiptLineDoc } from "../types";

/** Heat-printer-oriented defaults for browser SVG preview (no cutting). */
export const DEFAULT_PRINTER_CONFIG: Readonly<Partial<PrinterConfig>> = {
  command: "svg",
  cpl: 48,
  encoding: "multilingual",
  spacing: false,
  cutting: false,
  gradient: false,
  gamma: 1.8,
  threshold: 128,
  upsideDown: false,
  margin: 0,
  marginRight: 0,
};

/**
 * Transforms a ReceiptLine document to an SVG string for display or print.
 * Uses heat-printer-friendly defaults; pass printerConfig to override.
 *
 * @param doc - ReceiptLine document string
 * @param printer - Optional partial printer config (merged with defaults)
 * @returns SVG string, or empty string on error
 */
export function transformDocToSvg(
  doc: ReceiptLineDoc,
  printer?: Partial<PrinterConfig>
): string {
  if (typeof doc !== "string" || doc.trim().length === 0) {
    return "";
  }
  try {
    const config: PrinterConfig = {
      ...DEFAULT_PRINTER_CONFIG,
      ...printer,
    };
    const result = receiptline.transform(doc, config);
    return typeof result === "string" ? result : "";
  } catch {
    return "";
  }
}
