/**
 * Shared format badge styling for barcode/QR result items and "Last scanned" display.
 * Used by BarcodeScannerResultJSON and BarcodeScannerStatistics.
 */

export const FORMAT_BADGE_COLORS: Record<string, string> = {
  QR: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  Code128: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  Code39: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  DataMatrix: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  EAN: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  EAN8: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  EAN13: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  Handheld: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800",
};

const DEFAULT_BADGE_CLASS =
  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";

/**
 * Returns Tailwind classes for the format badge (same look as result list items).
 */
export function getFormatBadgeClass(format: string | undefined): string {
  return FORMAT_BADGE_COLORS[format ?? ""] ?? DEFAULT_BADGE_CLASS;
}
