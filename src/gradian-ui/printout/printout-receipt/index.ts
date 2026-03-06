export { PrintoutReceipt, PrintoutReceiptIframe } from "./components";
export { useReceiptSvg } from "./hooks";
export type { UseReceiptSvgResult } from "./hooks";
export { transformDocToSvg, DEFAULT_PRINTER_CONFIG, buildDocFromBarcodes } from "./utils";
export type { BarcodeItemForReceipt, ReceiptDocOptions } from "./utils";
export type {
  ReceiptLineDoc,
  PrinterConfig,
  PrintoutReceiptProps,
} from "./types";
