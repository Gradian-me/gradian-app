export type BarcodeFormat =
  | "Code128"
  | "Code39"
  | "Code93"
  | "EAN"
  | "EAN8"
  | "EAN13"
  | "UPC"
  | "UPCA"
  | "UPCE"
  | "QR"
  | "DataMatrix"
  | "PDF417"
  | "Aztec"
  | "ITF"
  | "Codabar"
  | "RSS14"
  | "RSSExpanded"
  | "Handheld"
  | "RFID";

export type ScanMode = "camera" | "handheld";

export interface ScannedBarcode {
  id: string;
  /** Display text (decoded barcode content). */
  label: string;
  /** Symbology/format name reported by the scanner. */
  format?: string;
  /** ISO timestamp when the scan was created. */
  createdAt: string;
  /** Optional count when multi-scan with quantity tracking is enabled. */
  count?: number;
}

export interface BarcodeScannerProps {
  allowedFormats?: BarcodeFormat[];
  enableBeep?: boolean;
  enableMultipleScan?: boolean;
  enableChangeCount?: boolean;
  /**
   * When true, shows a JSON button in the toolbar that opens a dialog
   * with the scanned results rendered via CodeViewer.
   */
  enableJSONResult?: boolean;
  /**
   * Optional initial list of barcodes when using multi-scan mode.
   * Useful for editing previously scanned items.
   */
  initialBarcodes?: ScannedBarcode[];
  /**
   * When true, shows a button to add random mock data to scan results (for demos/testing).
   */
  enableMockData?: boolean;
  onScan?: (value: string, format: string) => void;
  onMultiScan?: (barcodes: ScannedBarcode[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export interface BarcodeScannerCameraProps {
  children?: React.ReactNode;
  isScanning: boolean;
  lastScannedFormat?: string;
  cameraError?: string | null;
  /** When true (e.g. drawer mode), constrains camera to max-w-[200px]. */
  compact?: boolean;
}

export interface BarcodeScannerToolbarProps {
  cameras: MediaDeviceInfo[];
  selectedCameraId: string;
  onCameraChange: (id: string) => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  minZoom: number;
  maxZoom: number;
  hasTorch: boolean;
  torchActive: boolean;
  onToggleTorch: () => void;
  /**
   * When true, shows a JSON button that can open a JSON view dialog.
   */
  enableJSONResult?: boolean;
  /**
   * Callback when the JSON button is clicked.
   */
  onOpenJSON?: () => void;
  /** Current scan mode: 'camera' or 'handheld'. */
  scanMode: ScanMode;
  /** Called when the user changes scan mode. */
  onScanModeChange: (mode: ScanMode) => void;
  /** When true, zoom controls are hidden (e.g. when Scanner uses built-in zoom). */
  hideZoom?: boolean;
  /** When true, shows a Beep switch (only relevant when scanner has beep enabled). */
  showBeepSwitch?: boolean;
  /** Beep on/off (default true). */
  beepOn?: boolean;
  /** Called when user toggles the beep. */
  onBeepChange?: (on: boolean) => void;
}

export interface BarcodeScannerResultProps {
  value: string;
  format: string;
  onReset: () => void;
}

export interface BarcodeScannerResultJSONProps {
  barcodes: ScannedBarcode[];
  enableChangeCount: boolean;
  onRemove: (id: string) => void;
  onClear: () => void;
  onConfirm: () => void;
  /**
   * Optional callback to update the count of a specific barcode.
   */
  onCountChange?: (id: string, count: number) => void;
  /**
   * When true, shows a button to add mock scan items.
   */
  enableMockData?: boolean;
  /**
   * Callback when the user requests adding mock data.
   */
  onAddMockData?: () => void;
  /**
   * When true, hides the built-in footer Confirm button
   * (e.g. when a Confirm button is rendered in the toolbar instead).
   */
  hideFooterConfirm?: boolean;
  /**
   * When true, the results list fills available height instead of using a fixed max height.
   */
  fillHeight?: boolean;
  /**
   * ID of the most recently added/updated barcode — triggers a violet pulse animation.
   */
  newlyAddedId?: string | null;
  /**
   * Optional receipt layout: logo, headerTitle, headerSubtitle, headerDescription, footerDescription.
   * Passed to the print receipt builder for a modern receipt layout.
   */
  receiptOptions?: import("@/gradian-ui/printout").ReceiptDocOptions;
}

