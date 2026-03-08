export {
  PrintoutReceipt,
  PrintoutReceiptIframe,
  useReceiptSvg,
  transformDocToSvg,
  DEFAULT_PRINTER_CONFIG,
  buildDocFromBarcodes,
} from "./printout-receipt";
export type {
  ReceiptLineDoc,
  PrinterConfig,
  PrintoutReceiptProps,
  UseReceiptSvgResult,
  BarcodeItemForReceipt,
  ReceiptDocOptions,
} from "./printout-receipt";

export { printElementAsImage } from "./shared/utils";
export type {
  PrintElementAsImageOptions,
  PrintCaptureQuality,
} from "./shared/utils";
export { PrintElementButton } from "./shared/components";
export type { PrintElementButtonProps } from "./shared/components";
