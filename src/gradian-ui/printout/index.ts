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

export { printElementAsImage, downloadElementAsImage, captureElementAsDataUrl } from "./shared/utils";
export type {
  PrintElementAsImageOptions,
  DownloadElementAsImageOptions,
  CaptureElementAsDataUrlOptions,
  PrintCaptureQuality,
  PrintExportType,
} from "./shared/utils";
export { PrintElementButton, DownloadElementButton } from "./shared/components";
export type { PrintElementButtonProps, DownloadElementButtonProps } from "./shared/components";
