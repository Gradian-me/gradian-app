/**
 * Barcode sanitization utilities.
 *
 * All barcode content (camera-decoded or handheld-entered) passes through
 * these helpers before being stored in state or rendered.
 */

/** Maximum number of characters accepted from any single barcode scan. */
export const MAX_BARCODE_LENGTH = 2048;

/** Maximum length for a format/symbology string reported by the decoder. */
export const MAX_FORMAT_LENGTH = 64;

/**
 * Clamps a raw scanned string to a safe display length.
 * Trims leading/trailing whitespace and removes ASCII control characters
 * (C0 range: 0x00–0x1F, except tab 0x09 and newline 0x0A) that could
 * cause unexpected rendering or terminal-injection if the value is later
 * logged or exported.
 */
export function sanitizeBarcodeValue(raw: string): string {
  return raw
    .slice(0, MAX_BARCODE_LENGTH)
    .replace(/[\x00-\x08\x0B-\x1F\x7F]/g, "")
    .trim();
}

/**
 * Clamps and strips control characters from a format/symbology string
 * returned by the decoder (e.g. "QR_CODE", "CODE_128").
 */
export function sanitizeFormat(raw: string): string {
  return raw
    .slice(0, MAX_FORMAT_LENGTH)
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim();
}

/**
 * Validates that a string is a safe http/https URL.
 * Returns false for any other protocol (javascript:, data:, ftp:, etc.).
 */
export function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Returns a safe href string for rendering as an <a href>, or null if the
 * value is not a valid http/https URL.
 * Using `url.href` (rather than the raw input) ensures the URL is
 * normalised and any encoded payloads are resolved before use.
 */
export function safeLinkHref(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

