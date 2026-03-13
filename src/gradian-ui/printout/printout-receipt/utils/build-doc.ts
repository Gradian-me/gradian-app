import type { ReceiptLineDoc } from "../types";
import { getBarcodeTime, getCurrentDateTime } from "@/gradian-ui/shared/utils/date-utils";
import { GRADIAN_LOGO_BASE64 } from "@/gradian-ui/shared/configs/general-config";
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

  lines.push("---");

  const logoBase64 = options?.logoBase64 ?? GRADIAN_LOGO_BASE64.replace(/^data:image\/png;base64,/, "");
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
    // Center the signature line horizontally to simulate horizontal padding
    lines.push("{a:center}");
    lines.push(escapeReceiptLineText(`Signature: ${checksum}`)); // Keep LTR: checksum is hex
    // Reset alignment for any future content
    lines.push("{a:left}");
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
