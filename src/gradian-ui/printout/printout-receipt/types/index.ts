/**
 * ReceiptLine document string (markdown-style receipt description).
 * @see https://www.npmjs.com/package/receiptline
 */
export type ReceiptLineDoc = string;

/**
 * Printer configuration for receiptline.transform().
 * Matches receiptline printer options (cpl, encoding, command, etc.).
 */
export interface PrinterConfig {
  /** Characters per line (default: 48). */
  cpl?: number;
  /** Encoding (e.g. 'cp437', 'multilingual', 'cp1252'). */
  encoding?: string;
  /** Output command: 'svg' for browser, or escpos/epson/etc. for printers. */
  command?: string;
  /** Line spacing. */
  spacing?: boolean;
  /** Image processing for photos vs text/barcodes. */
  gradient?: boolean;
  /** Image gamma (0.1–10, default 1.8). */
  gamma?: number;
  /** Image threshold (0–255, default 128). */
  threshold?: number;
  /** Paper cutting. */
  cutting?: boolean;
  /** Left margin (0–24). */
  margin?: number;
  /** Right margin (0–24). */
  marginRight?: number;
  /** Print upside down. */
  upsideDown?: boolean;
}

export interface PrintoutReceiptProps {
  /** ReceiptLine document string (required). */
  doc: ReceiptLineDoc;
  /** Optional printer config; heat-printer-friendly defaults applied in utils. */
  printerConfig?: Partial<PrinterConfig>;
  /** Label for the trigger button (e.g. "Print label"). */
  triggerLabel?: string;
  /** Button variant for the trigger. */
  triggerVariant?: "default" | "outline" | "ghost" | "secondary" | "link" | "destructive";
  /** Controlled open state. */
  open?: boolean;
  /** Called when open state should change. */
  onOpenChange?: (open: boolean) => void;
  /** Fixed width in px for the iframe (e.g. 384 for 48 cpl thermal). */
  iframeWidth?: number;
  /** When true (default), show the trigger button; when false, only iframe/modal (parent controls trigger). */
  showTrigger?: boolean;
  /** Optional class name for the trigger button container. */
  className?: string;
}
