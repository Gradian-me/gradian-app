import type { ReceiptLineDoc } from "../types";
import { getBarcodeTime, getCurrentDateTime } from "@/gradian-ui/shared/utils/date-utils";
import { sha256 } from "js-sha256";

// Reshape Persian/Arabic to contextual forms (initial/medial/final/isolated) for correct glyphs when drawn LTR
const arabicPersianReshaper = require("arabic-persian-reshaper") as {
  PersianShaper: { convertArabic: (s: string) => string };
  ArabicShaper: { convertArabic: (s: string) => string };
};

/**
 * ReceiptLine spec: special characters in text (| column, - rule, _ underline, " emphasis, ` invert, ^ size),
 * escape sequences (\\ \| \{ \} \- \= \~ \_ \" \` \^ \n), and properties ({width:w, image:i, code:c, option:o, align:a}).
 * @see https://www.npmjs.com/package/receiptline OFSC ReceiptLine Specification
 */

/** LRE = Left-to-Right Embedding, PDF = Pop Directional Formatting. Force the run to be drawn LTR so it isn't re-reversed by bidi. */
const LRE = "\u202A";
const PDF = "\u202C";

/**
 * True if the string contains strong RTL characters (Arabic, Hebrew, Persian, etc.).
 */
function hasRtlCharacter(str: string): boolean {
  return /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/.test(str);
}

/**
 * For RTL text: reshape first (logical order → correct contextual glyphs), then reverse
 * so that when the receipt draws LTR we get correct visual order and correct joining.
 * Wrap with LRE+PDF so the browser doesn't re-reverse. Works with mixed Persian + Latin.
 */
function reverseAndReshapeRtl(text: string): string {
  if (!text || !hasRtlCharacter(text)) return text;
  let shaped: string;
  try {
    // Reshape in logical (RTL) order so each character gets correct initial/medial/final/isolated form
    shaped = arabicPersianReshaper.PersianShaper.convertArabic(text);
  } catch {
    shaped = text;
  }
  // Reverse the reshaped string so LTR drawing produces correct visual order
  const reversed = [...shaped].reverse().join("");
  return LRE + reversed + PDF;
}

/**
 * Escapes ReceiptLine special characters in text so it can be used safely in doc content.
 * Escape sequences: \\ \| \{ \} \- \= \~ \_ \" \` \^
 */
function escapeReceiptLineText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/-/g, "\\-")
    .replace(/=/g, "\\=")
    .replace(/~/g, "\\~")
    .replace(/_/g, "\\_")
    .replace(/"/g, '\\"')
    .replace(/`/g, "\\`")
    .replace(/\^/g, "\\^")
    .replace(/\r?\n/g, " ");
}

/**
 * Escape for ReceiptLine and reverse+reshape RTL text so the LTR-drawing receipt engine
 * displays Persian/Arabic correctly (order + contextual glyphs). Latin in mixed text is unchanged.
 */
function escapeAndWrapRtl(text: string): string {
  return reverseAndReshapeRtl(escapeReceiptLineText(text));
}

/**
 * Escapes ReceiptLine property value special characters: \ | { } ; :
 * @see ReceiptLine "Escape sequences in property values"
 */
function escapePropertyValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/;/g, "\\;")
    .replace(/\r?\n/g, " ");
}

/** Minimal barcode item shape for building a receipt doc (avoids coupling to barcode-scanner). */
export interface BarcodeItemForReceipt {
  label: string;
  count?: number;
}

/** Optional header/footer, logo, and column headers for a modern receipt layout. */
export interface ReceiptDocOptions {
  /** Base64-encoded PNG for logo (ReceiptLine {image:...}). Omit for text-only. */
  logoBase64?: string;
  /** Main header title (double-width via ^). */
  headerTitle?: string;
  /** Subtitle line under the header. */
  headerSubtitle?: string;
  /** Short description under subtitle. */
  headerDescription?: string;
  /** Footer line(s) at the end of the receipt. */
  footerDescription?: string;
  /** Title above the item list (default "Scan results"). */
  listTitle?: string;
  /** Column headers for the list, e.g. ["Item", "Qty"]. Same alignment as rows (left, right). */
  listColumnHeaders?: [string, string];
  /** Optional barcode in footer (after footerDescription). Rendered as {c:value;o:code128,hri}. (code128 accepts variable length; ean requires 8 or 13 digits.) */
  barcodeValue?: string;
  /** Optional QR code in footer (after footerDescription). Rendered as {c:value;o:qrcode,4}. */
  qrValue?: string;
  /** When true (default), add a "Print Time: <now>" line after the list title. */
  printTime?: boolean;
  /** When true (default), append checksum of the doc and a ULID signature at the end. */
  showChecksum?: boolean;
}

/**
 * Builds a ReceiptLine document from a list of barcode-like items.
 * Uses consistent left-alignment: each line starts with "| " so items align.
 * Quantities are right-aligned with "| | xN |".
 * Safe to use with user-derived labels (escapes special characters).
 *
 * @param items - Array of items with at least label and optional count
 * @param options - Optional logo, headerTitle, headerSubtitle, headerDescription, footerDescription
 * @returns ReceiptLine document string
 */
export function buildDocFromBarcodes(
  items: BarcodeItemForReceipt[],
  options?: ReceiptDocOptions
): ReceiptLineDoc {
  const lines: string[] = [];

  const logoBase64 = options?.logoBase64 ?? "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";
  if (logoBase64) {
    lines.push(`{i:${logoBase64}}`);
    lines.push("---");
  }

  if (options?.headerTitle?.trim()) {
    lines.push(`^^^${escapeAndWrapRtl(options.headerTitle.trim())}`);
  }
  if (options?.headerSubtitle?.trim()) {
    lines.push(`^^${escapeAndWrapRtl(options.headerSubtitle.trim())}`);
  }
  if (options?.headerDescription?.trim()) {
    lines.push(escapeAndWrapRtl(options.headerDescription.trim()));
  }
  if (options?.headerTitle ?? options?.headerSubtitle ?? options?.headerDescription) {
    lines.push("---");
  }


  if (options?.listTitle?.trim()) {
    lines.push(`^^${escapeAndWrapRtl(options.listTitle.trim())}`);
    lines.push("---");
  }

  const showPrintTime = options?.printTime !== false;
  if (showPrintTime) {
    lines.push(escapeReceiptLineText(`Print Time: ${getCurrentDateTime(false)}`));
    lines.push("---");
  }

  if (items.length === 0) {
    lines.push("| No items |");
  } else {
    lines.push("{w:*,7;b:line;a:left}");
    const colHeaders = options?.listColumnHeaders;
    if (colHeaders?.length === 2 && (colHeaders[0]?.trim() || colHeaders[1]?.trim())) {
      const left = `"${escapeAndWrapRtl(colHeaders[0].trim() || "Item")}`;
      const right = `"${escapeAndWrapRtl(colHeaders[1].trim() || "Qty")}`;
      lines.push(`| ${left} | ${right} |`);
      lines.push("---");
    }
    items.forEach((item, index) => {
      const safeLabel = escapeAndWrapRtl(String(item.label).slice(0, 200));
      const num = index + 1;
      const qty = item.count != null && item.count > 1 ? `${item.count}` : "1";
      lines.push(`|${num}. ${safeLabel} | ${qty}|`);
      lines.push(`-`);
    });
  }

  lines.push("-");
  lines.push("{w:*;b:none}");
  lines.push("---");
  const footer = options?.footerDescription?.trim() || "powered by Gradian.me";
  lines.push(escapeAndWrapRtl(footer));
  const qrVal = options?.qrValue?.trim() || "Gradian.me";
  const barcodeVal = (options?.barcodeValue?.trim()) || getBarcodeTime();
  lines.push(`{c:${escapePropertyValue(qrVal)};o:qrcode,5}`);
  lines.push("\n");
  if (barcodeVal) {
    lines.push(`{c:${escapePropertyValue(barcodeVal)};o:code128,hri}`);
  }
  lines.push("-");

  const showChecksum = options?.showChecksum !== false;
  if (showChecksum) {
    const docSoFar = lines.join("\n");
    const checksum = sha256.hex(docSoFar);
    lines.push(escapeReceiptLineText(`Signature: ${checksum}`)); // Keep LTR: checksum is hex
    lines.push("-");
  }

  return lines.join("\n");
}

/** Checksum line pattern (Signature or Checksum: 64 hex chars). */
const RECEIPT_CHECKSUM_LINE = /^(?:Signature|Checksum):\s*([a-f0-9]{64})$/;

/**
 * If the receipt doc ends with a checksum line (from showChecksum), returns the expected
 * checksum (same SHA-256 calculation) for validation. Otherwise returns null.
 */
export function getReceiptChecksumForValidation(doc: ReceiptLineDoc): string | null {
  if (!doc || typeof doc !== "string") return null;
  const lines = doc.split("\n");
  const lastLine = lines[lines.length - 1]?.trim();
  const prevLine = lines[lines.length - 2]?.trim();
  if (lastLine !== "-") return null;
  const match = prevLine?.match(RECEIPT_CHECKSUM_LINE);
  if (!match) return null;
  const docSoFar = lines.slice(0, -2).join("\n");
  return sha256.hex(docSoFar);
}
