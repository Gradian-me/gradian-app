"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { boundingBox } from "@yudiel/react-qr-scanner";
import { prepareZXingModule } from "barcode-detector/ponyfill";
import { DrawerDialog } from "@/gradian-ui/data-display/components/DrawerDialog";
import { BarcodeScannerCamera } from "./BarcodeScannerCamera";
import { BarcodeScannerToolbar } from "./BarcodeScannerToolbar";
import { BarcodeScannerResult } from "./BarcodeScannerResult";
import { BarcodeScannerResultJSON } from "./BarcodeScannerResultJSON";
import { BarcodeScannerStatistics } from "./BarcodeScannerStatistics";
import { BarcodeHandheld } from "./BarcodeHandheld";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/gradian-ui/shared/utils";
import { createBeep } from "@/gradian-ui/shared/utils/sound-utils";
import { CodeViewer } from "@/gradian-ui/shared/components/CodeViewer";
import { CheckCircle2, Plus } from "lucide-react";
import { sanitizeBarcodeValue, sanitizeFormat } from "../utils/sanitize";
import { TRANSLATION_KEYS } from "@/gradian-ui/shared/constants/translations";
import { getDefaultLanguage, getT } from "@/gradian-ui/shared/utils/translation-utils";
import { useLanguageStore } from "@/stores/language.store";
import type {
  BarcodeScannerProps,
  BarcodeFormat,
  ScannedBarcode,
  ScanMode,
} from "../types";
import { LOG_CONFIG, LogType } from "@/gradian-ui/shared/configs/log-config";

// ——— ZXing format mapping ————————————————————————————————————————————————
/** Map our BarcodeFormat to @yudiel/react-qr-scanner format strings. */
const OUR_FORMAT_TO_LIBRARY: Record<BarcodeFormat, string[]> = {
  Code128: ["code_128"],
  Code39: ["code_39"],
  Code93: ["code_93"],
  EAN: ["ean_8", "ean_13"],
  EAN8: ["ean_8"],
  EAN13: ["ean_13"],
  UPC: ["upc_a"],
  UPCA: ["upc_a"],
  UPCE: ["upc_e"],
  QR: ["qr_code"],
  DataMatrix: ["data_matrix"],
  PDF417: ["pdf417"],
  Aztec: ["aztec"],
  ITF: ["itf"],
  Codabar: ["codabar"],
  RSS14: ["databar"],
  RSSExpanded: ["databar_expanded"],
  Handheld: [],
  RFID: [],
};

/** Map library format string to our display name. */
const LIBRARY_FORMAT_TO_OUR: Record<string, string> = {
  qr_code: "QR", code_128: "Code128", code_39: "Code39", code_93: "Code93",
  ean_8: "EAN8", ean_13: "EAN13", upc_a: "UPCA", upc_e: "UPCE",
  data_matrix: "DataMatrix", pdf417: "PDF417", aztec: "Aztec", itf: "ITF",
  codabar: "Codabar", databar: "RSS14", databar_expanded: "RSSExpanded",
  micro_qr_code: "QR", rm_qr_code: "QR", unknown: "Unknown",
};

const DEFAULT_FORMATS: BarcodeFormat[] = ["Code128", "QR", "DataMatrix", "EAN"];

/** Point ZXing WASM to local copy in public/zxing-wasm (avoids CDN and CSP connect-src). */
const ZXING_READER_WASM_URL = "/cdn/zxing_reader.wasm";

let zxingWasmConfigured = false;
function ensureZxingWasmConfig(): void {
  if (zxingWasmConfigured) return;
  zxingWasmConfigured = true;
  prepareZXingModule({
    overrides: {
      locateFile(path: string, prefix: string): string {
        if (path.endsWith(".wasm")) {
          return ZXING_READER_WASM_URL;
        }
        return prefix + path;
      },
    },
  });
}

const Scanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((m) => m.Scanner),
  { ssr: false }
);

const ZOOM_STEP = 0.5;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

function useIsSmallScreen(): boolean {
  const [isSmall, setIsSmall] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 639px)");
    const handler = () => setIsSmall(mq.matches);
    setIsSmall(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isSmall;
}

function useCameraDevices(): MediaDeviceInfo[] | null {
  const [devices, setDevices] = useState<MediaDeviceInfo[] | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    let cancelled = false;

    const loadDevices = async () => {
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) {
          setDevices(all);
        }
      } catch (error) {
        if (LOG_CONFIG[LogType.CLIENT_LOG]) {
          console.warn("[BarcodeScanner] Failed to enumerate media devices on", window.location.origin, error);
        }
      }
    };

    void loadDevices();

    const handleChange = () => {
      void loadDevices();
    };

    if (navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", handleChange);
    } else if (typeof navigator.mediaDevices.ondevicechange !== "undefined") {
      navigator.mediaDevices.ondevicechange = handleChange;
    }

    return () => {
      cancelled = true;
      if (navigator.mediaDevices.removeEventListener) {
        navigator.mediaDevices.removeEventListener("devicechange", handleChange);
      } else if (navigator.mediaDevices.ondevicechange === handleChange) {
        navigator.mediaDevices.ondevicechange = null;
      }
    };
  }, []);

  return devices;
}

function ulid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const MOCK_FORMATS = ["Code128", "QR", "DataMatrix", "EAN"] as const;

/** GS1-style mock barcode (DataMatrix) for testing Application Identifiers / ticket. Uses real ASCII 29 (GS) separators. */
const MOCK_GS1_LABEL =
  "]C101040123456789011715012910ABC123\x1D39329784711\x1D310300052539224711\x1D42127649716\x1D2413247";

function randomMockBarcode(enableChangeCount: boolean): ScannedBarcode {
  const now = new Date();
  const format = MOCK_FORMATS[Math.floor(Math.random() * MOCK_FORMATS.length)];
  const label = `MOCK-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  return {
    id: ulid(),
    label,
    format,
    createdAt: now.toISOString(),
    count: enableChangeCount ? Math.floor(Math.random() * 5) + 1 : undefined,
  };
}

function mockGS1Barcode(enableChangeCount: boolean): ScannedBarcode {
  const now = new Date();
  return {
    id: ulid(),
    label: MOCK_GS1_LABEL,
    format: "DataMatrix",
    createdAt: now.toISOString(),
    count: enableChangeCount ? Math.floor(Math.random() * 5) + 1 : undefined,
  };
}

export const BarcodeScannerWrapper: React.FC<BarcodeScannerProps> = ({
  allowedFormats = DEFAULT_FORMATS,
  enableBeep = true,
  enableMultipleScan = false,
  enableChangeCount = false,
  enableJSONResult = false,
  onScan,
  onMultiScan,
  open,
  onOpenChange,
  title = "Barcode Scanner",
  initialBarcodes,
  enableMockData = false,
}) => {
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const defaultTitle = getT(TRANSLATION_KEYS.BARCODE_SCANNER_TITLE, language, defaultLang);
  const displayTitle = title === "Barcode Scanner" ? defaultTitle : title;

  const beepRef = useRef<(() => void) | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastScanRef = useRef<string>("");

  const devices = useCameraDevices();
  const cameras = useMemo(
    () => (devices ?? []).filter((d) => d.kind === "videoinput"),
    [devices]
  );
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(MIN_ZOOM);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [lastScannedFormat, setLastScannedFormat] = useState<string | undefined>(undefined);

  // Single scan state
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [scannedFormat, setScannedFormat] = useState<string>("");

  // Multi-scan state
  const [barcodes, setBarcodes] = useState<ScannedBarcode[]>([]);
  const [isJsonDialogOpen, setIsJsonDialogOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Handheld / input-mode state
  const [scanMode, setScanMode] = useState<ScanMode>("camera");

  // Beep on/off (toolbar switch; default true)
  const [beepOn, setBeepOn] = useState(true);

  // ID of the most-recently added/updated barcode (for pulse animation)
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const newlyAddedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tracks the actual last scanned/entered item for statistics (not last by array position)
  const [lastScannedLabel, setLastScannedLabel] = useState<string | null>(null);
  const [lastScannedFormatForStats, setLastScannedFormatForStats] = useState<string | null>(null);

  useEffect(() => {
    if (!LOG_CONFIG[LogType.CLIENT_LOG]) return;
    if (!devices) {
      console.log("[BarcodeScanner] useDevices returned null/undefined on", window.location.origin);
      return;
    }
    console.log("[BarcodeScanner] useDevices devices on", window.location.origin, devices);
  }, [devices]);

  // Configure ZXing WASM URL to use CSP-allowed CDN before any Scanner/BarcodeDetector runs
  useLayoutEffect(() => {
    ensureZxingWasmConfig();
  }, []);

  // Initialise beep (Web Audio API — no Audio element, avoids "no supported sources")
  useEffect(() => {
    if (enableBeep) beepRef.current = createBeep(audioContextRef);
    return () => {
      beepRef.current = null;
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [enableBeep]);

  useEffect(() => {
    if (!open) return;
    setCameraError(null);
    const t = window.setTimeout(() => setSelectedCameraId((prev) => prev || "default"), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || cameras.length === 0) return;
    setCameraError(null);
    const back = cameras.find((d) => /back|rear|environment/i.test(d.label));
    setSelectedCameraId((prev) => {
      if (prev && cameras.some((c) => c.deviceId === prev)) return prev;
      return back?.deviceId ?? cameras[0]?.deviceId ?? "default";
    });
  }, [open, cameras]);

  // When no cameras are available after a short delay, show a message instead of mounting Scanner.
  useEffect(() => {
    if (!open || scanMode !== "camera" || cameras.length > 0) return;
    const lang = useLanguageStore.getState().language ?? getDefaultLanguage();
    const defLang = getDefaultLanguage();
    const t = window.setTimeout(() => {
      setCameraError((prev) =>
        prev ? prev : getT(TRANSLATION_KEYS.BARCODE_SCANNER_CAMERA_NOT_FOUND, lang, defLang)
      );
    }, 1200);
    return () => window.clearTimeout(t);
  }, [open, scanMode, cameras.length]);

  // Seed multi-scan list from initialBarcodes when opening in multi-scan mode
  useEffect(() => {
    if (!open || !enableMultipleScan) return;
    if (initialBarcodes && initialBarcodes.length > 0) {
      setBarcodes(initialBarcodes);
    } else {
      setBarcodes([]);
    }
  }, [open, enableMultipleScan, initialBarcodes]);

  const scannerFormats = useMemo(() => {
    const set = new Set<string>();
    for (const f of allowedFormats) {
      for (const lib of OUR_FORMAT_TO_LIBRARY[f] ?? []) set.add(lib);
    }
    return set.size > 0 ? Array.from(set) : ["qr_code", "code_128", "ean_13", "data_matrix"];
  }, [allowedFormats]);

  const markNewlyAdded = useCallback((id: string) => {
    if (newlyAddedTimerRef.current) clearTimeout(newlyAddedTimerRef.current);
    setNewlyAddedId(id);
    newlyAddedTimerRef.current = setTimeout(() => setNewlyAddedId(null), 1200);
  }, []);

  const handleScan = useCallback(
    (detectedCodes: { rawValue: string; format?: string }[]) => {
      if (detectedCodes.length === 0) return;

      // Normalize, sanitize, and de-duplicate by raw value
      const seen = new Set<string>();
      const normalized = detectedCodes
        .map((code) => {
          const raw = sanitizeBarcodeValue(code.rawValue);
          if (!raw) return null;
          const libFmt = (code as { format?: string }).format ?? "";
          const fmt = sanitizeFormat(LIBRARY_FORMAT_TO_OUR[libFmt] ?? (libFmt || "Unknown"));
          return { raw, fmt };
        })
        .filter((item): item is { raw: string; fmt: string } => !!item && !seen.has(item.raw) && (seen.add(item.raw), true));

      if (normalized.length === 0) return;

      // Ignore immediate re-scan of the same content as the very last scan
      const filtered =
        normalized.length === 1 && normalized[0].raw === lastScanRef.current
          ? []
          : normalized.filter((item) => item.raw !== lastScanRef.current || normalized.length === 1);

      if (filtered.length === 0) return;

      const last = filtered[filtered.length - 1];
      lastScanRef.current = last.raw;
      setTimeout(() => {
        lastScanRef.current = "";
      }, 1500);

      // Use Web Audio beep when enabled and toolbar switch is on
      if (enableBeep && beepOn && beepRef.current) beepRef.current();

      setLastScannedFormat(last.fmt);
      setLastScannedLabel(last.raw);
      setLastScannedFormatForStats(last.fmt);
      setIsScanning(true);

      if (enableMultipleScan) {
        // Add/update all detected barcodes in this frame
        filtered.forEach(({ raw, fmt }) => {
          setBarcodes((prev) => {
            const existing = prev.find((b) => b.label === raw);
            if (existing) {
              // Camera mode: do not auto-increment count on duplicate; user changes count manually.
              const updated = prev.map((b) =>
                b.id === existing.id ? { ...b } : b
              );
              window.setTimeout(() => markNewlyAdded(existing.id), 0);
              return updated;
            }
            const newItem: ScannedBarcode = {
              id: ulid(),
              label: raw,
              format: fmt,
              createdAt: new Date().toISOString(),
              count: enableChangeCount ? 1 : undefined,
            };
            window.setTimeout(() => markNewlyAdded(newItem.id), 0);
            return [...prev, newItem];
          });
        });
      } else {
        // Single-scan mode: keep existing behavior, use only the last detected code
        const { raw, fmt } = last;
        // Defer so Scanner can finish and clean up before we unmount it (avoids "no supported sources" error)
        window.setTimeout(() => {
          setScannedValue(raw);
          setScannedFormat(fmt);
          onScan?.(raw, fmt);
        }, 0);
      }
    },
    [enableBeep, beepOn, enableMultipleScan, enableChangeCount, onScan, markNewlyAdded]
  );

  const handleScanError = useCallback((error: unknown) => {
    const err = error as { message?: string; name?: string };
    const message =
      typeof err?.message === "string" ? err.message : String(error ?? "Camera error");
    const name = typeof err?.name === "string" ? err.name : "";
    const lang = useLanguageStore.getState().language ?? getDefaultLanguage();
    const defLang = getDefaultLanguage();
    if (message.includes("Permission") || message.includes("NotAllowed") || message.includes("denied")) {
      setCameraError(getT(TRANSLATION_KEYS.BARCODE_SCANNER_CAMERA_DENIED, lang, defLang));
    } else if (
      name === "NotSupportedError" ||
      message.includes("NotFound") ||
      message.includes("no camera") ||
      message.includes("no supported sources")
    ) {
      setCameraError(getT(TRANSLATION_KEYS.BARCODE_SCANNER_CAMERA_NOT_FOUND, lang, defLang));
    } else {
      setCameraError(getT(TRANSLATION_KEYS.BARCODE_SCANNER_CAMERA_ERROR, lang, defLang));
    }
  }, []);

  useEffect(() => {
    if (scanMode === "handheld") {
      setIsScanning(false);
    }
  }, [scanMode]);

  useEffect(() => {
    if (!open) {
      setIsScanning(false);
      setScannedValue(null);
      setBarcodes([]);
      setCameraError(null);
      lastScanRef.current = "";
      setIsJsonDialogOpen(false);
      setScanMode("camera");
      if (newlyAddedTimerRef.current) clearTimeout(newlyAddedTimerRef.current);
      setNewlyAddedId(null);
      setLastScannedLabel(null);
      setLastScannedFormatForStats(null);
    }
  }, [open]);

  const handleCameraChange = useCallback((id: string) => {
    setSelectedCameraId(id);
  }, []);

  const handleScanModeChange = useCallback((mode: ScanMode) => {
    setScanMode(mode);
  }, []);

  const handleHandheldAdd = useCallback(
    (inputValue: string, source: "manual" | "nfc") => {
      const raw = sanitizeBarcodeValue(inputValue);
      if (!raw) return;
      if (enableBeep && beepOn && beepRef.current) beepRef.current();
      const fmt = source === "nfc" ? "RFID" : "Handheld";
      setLastScannedLabel(raw);
      setLastScannedFormatForStats(fmt);

      if (enableMultipleScan) {
        setBarcodes((prev) => {
          const existing = prev.find((b) => b.label === raw);
          if (existing) {
            const updated = prev.map((b) =>
              b.id === existing.id
                ? { ...b, count: enableChangeCount ? (b.count ?? 1) + 1 : b.count }
                : b
            );
            window.setTimeout(() => markNewlyAdded(existing.id), 0);
            return updated;
          }
          const now = new Date();
          const newItem: ScannedBarcode = {
            id: ulid(),
            label: raw,
            format: fmt,
            createdAt: now.toISOString(),
            count: enableChangeCount ? 1 : undefined,
          };
          window.setTimeout(() => markNewlyAdded(newItem.id), 0);
          return [...prev, newItem];
        });
      } else {
        setScannedValue(raw);
        setScannedFormat(fmt);
        onScan?.(raw, fmt);
      }
    },
    [enableBeep, beepOn, enableMultipleScan, enableChangeCount, markNewlyAdded, onScan]
  );

  const handleZoomIn = useCallback(() => {
    setZoomLevel((p) => Math.min(p + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((p) => Math.max(p - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleToggleTorch = useCallback(() => {
    setTorchActive((p) => !p);
  }, []);

  const handleReset = useCallback(() => {
    setScannedValue(null);
    setScannedFormat("");
    lastScanRef.current = "";
  }, []);

  const handleConfirmMulti = useCallback(() => {
    onMultiScan?.(barcodes);
    onOpenChange(false);
  }, [barcodes, onMultiScan, onOpenChange]);

  const handleRemoveBarcode = useCallback((id: string) => {
    setBarcodes((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleClearBarcodes = useCallback(() => {
    setBarcodes([]);
  }, []);

  const handleAddMockData = useCallback(() => {
    const items = [
      mockGS1Barcode(enableChangeCount),
      randomMockBarcode(enableChangeCount),
      randomMockBarcode(enableChangeCount),
    ];
    setBarcodes((prev) => [...prev, ...items]);
    markNewlyAdded(items[items.length - 1].id);
  }, [enableChangeCount, markNewlyAdded]);

  const handleAddMockSingle = useCallback(() => {
    const b =
      Math.random() < 0.5 ? mockGS1Barcode(false) : randomMockBarcode(false);
    setScannedValue(b.label);
    setScannedFormat(b.format ?? "QR");
    onScan?.(b.label, b.format ?? "QR");
  }, [onScan]);

  const handleCountChange = useCallback((id: string, count: number) => {
    setBarcodes((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              count,
            }
          : b
      )
    );
  }, []);

  const showResult = !enableMultipleScan && scannedValue !== null;

  const isSmallScreen = useIsSmallScreen();
  const isDialogLayout = !isSmallScreen;

  const statisticsBarcodes = enableMultipleScan
    ? barcodes
    : scannedValue !== null
      ? [{ id: "single", label: scannedValue, format: scannedFormat, createdAt: new Date().toISOString() }]
      : [];

  const jsonData = enableMultipleScan
    ? barcodes
    : scannedValue !== null
      ? [
          {
            id: ulid(),
            label: scannedValue,
            format: scannedFormat,
            createdAt: new Date().toISOString(),
          },
        ]
      : [];

  const hasMultiScanItems = enableMultipleScan && barcodes.length > 0;
  const confirmLabelKey = hasMultiScanItems ? TRANSLATION_KEYS.BARCODE_SCANNER_CONFIRM_N : TRANSLATION_KEYS.BARCODE_SCANNER_CONFIRM;
  const confirmLabel = hasMultiScanItems
    ? getT(confirmLabelKey, language, defaultLang).replace(/\{\{n\}\}/g, String(barcodes.length))
    : getT(TRANSLATION_KEYS.BARCODE_SCANNER_CONFIRM, language, defaultLang);

  const closeScannerTitle = getT(TRANSLATION_KEYS.BARCODE_SCANNER_CLOSE_SCANNER, language, defaultLang);
  const closeMessageItems = getT(TRANSLATION_KEYS.BARCODE_SCANNER_CLOSE_MESSAGE_ITEMS, language, defaultLang).replace(/\{\{n\}\}/g, String(barcodes.length));
  const closeMessageEmpty = getT(TRANSLATION_KEYS.BARCODE_SCANNER_CLOSE_MESSAGE_EMPTY, language, defaultLang);
  const discardCloseLabel = getT(TRANSLATION_KEYS.BARCODE_SCANNER_DISCARD_CLOSE, language, defaultLang);
  const pointCameraText = getT(TRANSLATION_KEYS.BARCODE_SCANNER_POINT_CAMERA, language, defaultLang);
  const addMockResultLabel = getT(TRANSLATION_KEYS.BARCODE_SCANNER_ADD_MOCK_RESULT, language, defaultLang);
  const scannedJsonTitle = getT(TRANSLATION_KEYS.BARCODE_SCANNER_SCANNED_JSON_TITLE, language, defaultLang);
  const handheldTitle = getT(TRANSLATION_KEYS.BARCODE_SCANNER_HANDHELD_TITLE, language, defaultLang);
  const handheldDescription = getT(TRANSLATION_KEYS.BARCODE_SCANNER_HANDHELD_DESCRIPTION, language, defaultLang);
  const placeholderScanOrType = getT(TRANSLATION_KEYS.BARCODE_SCANNER_PLACEHOLDER_SCAN_OR_TYPE, language, defaultLang);
  const addBarcodeAria = getT(TRANSLATION_KEYS.BARCODE_SCANNER_ADD_BARCODE, language, defaultLang);
  const scannerDialogDescription = getT(TRANSLATION_KEYS.BARCODE_SCANNER_POINT_CAMERA, language, defaultLang);

  const confirmButtonNode = (
    <Button
      type="button"
      variant="default"
      onClick={handleConfirmMulti}
      disabled={!hasMultiScanItems}
    >
      <CheckCircle2 className="w-3 h-3" />
      <span className="text-xs font-semibold">{confirmLabel}</span>
    </Button>
  );

  const cameraAndToolbarBlock = (
    <>
      {/* Camera / handheld + toolbar — vertically centered in dialog layout */}
      <div className={cn("flex min-h-0 flex-col items-stretch justify-around", isDialogLayout && "flex-1")}>
        {scanMode === "handheld" ? (
          <BarcodeHandheld
            title={handheldTitle}
            description={handheldDescription}
            placeholder={placeholderScanOrType}
            addBarcodeAria={addBarcodeAria}
            onSubmit={handleHandheldAdd}
          />
        ) : (
          <div className="flex flex-1 min-h-0 items-center justify-center p-1">
            <BarcodeScannerCamera
              isScanning={isScanning}
              lastScannedFormat={lastScannedFormat}
              cameraError={cameraError}
              compact={!isDialogLayout}
            >
              {open &&
                scanMode === "camera" &&
                cameras.length > 0 &&
                selectedCameraId !== "" &&
                (selectedCameraId === "default" || cameras.some((c) => c.deviceId === selectedCameraId)) &&
                (enableMultipleScan || !showResult) && (
                <Scanner
                  onScan={handleScan}
                  onError={handleScanError}
                  constraints={
                    selectedCameraId && selectedCameraId !== "default"
                      ? { deviceId: { exact: selectedCameraId } }
                      : { facingMode: { ideal: "environment" } }
                  }
                  formats={scannerFormats as ("qr_code" | "code_128" | "code_39" | "ean_13" | "ean_8" | "upc_a" | "upc_e" | "codabar" | "itf" | "pdf417" | "aztec" | "data_matrix" | "code_93" | "databar" | "databar_expanded" | "micro_qr_code" | "rm_qr_code")[]}
                  scanDelay={500}
                  allowMultiple={enableMultipleScan}
                  sound={false}
                  components={{
                    finder: true,
                    torch: true,
                    zoom: true,
                    onOff: true,
                    tracker: boundingBox,
                  }}
                  classNames={{ video: "w-full h-full object-cover" }}
                />
              )}
            </BarcodeScannerCamera>
          </div>
        )}
        <div>
          <BarcodeScannerToolbar
            cameras={cameras}
            selectedCameraId={selectedCameraId}
            onCameraChange={handleCameraChange}
            zoomLevel={zoomLevel}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            hasTorch={hasTorch}
            torchActive={torchActive}
            onToggleTorch={handleToggleTorch}
            enableJSONResult={enableJSONResult}
            onOpenJSON={() => setIsJsonDialogOpen(true)}
            scanMode={scanMode}
            onScanModeChange={handleScanModeChange}
            hideZoom
            showBeepSwitch={true}
            beepOn={beepOn}
            onBeepChange={setBeepOn}
          />
        </div>
      </div>

      {/* Statistics pinned to bottom in dialog layout */}
      {isDialogLayout && (
        <div className="shrink-0 flex flex-col px-2 pb-2 pt-2">
          <BarcodeScannerStatistics
            barcodes={statisticsBarcodes}
            enableChangeCount={enableChangeCount ?? false}
            lastScannedLabel={lastScannedLabel}
            lastScannedFormat={lastScannedFormatForStats}
          />
        </div>
      )}
    </>
  );

  const resultsPanel = (
    <div
      className={cn(
        "flex flex-col",
        isDialogLayout ? "flex-1 min-h-0 min-w-0 overflow-auto h-full" : "flex-1 min-h-0 mt-2"
      )}
    >
      {showResult ? (
        <BarcodeScannerResult
          value={scannedValue!}
          format={scannedFormat}
          onReset={handleReset}
        />
      ) : enableMultipleScan ? (
        <BarcodeScannerResultJSON
          barcodes={barcodes}
          enableChangeCount={enableChangeCount ?? false}
          onRemove={handleRemoveBarcode}
          onClear={handleClearBarcodes}
          onConfirm={handleConfirmMulti}
          onCountChange={handleCountChange}
          enableMockData={enableMockData}
          onAddMockData={handleAddMockData}
          hideFooterConfirm={enableMultipleScan}
          fillHeight={isDialogLayout}
          newlyAddedId={newlyAddedId}
          enableBeepForCountChange={enableBeep && beepOn}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-gray-400 dark:text-gray-500">
          <span className="text-sm">{pointCameraText}</span>
          {enableMockData && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddMockSingle}
              className="text-xs"
            >
              {addMockResultLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const hasUnsavedBarcodes = enableMultipleScan && barcodes.length > 0;

  return (
    <DrawerDialog
      open={open}
      onOpenChange={onOpenChange}
      title={displayTitle}
      description={scannerDialogDescription}
      size="lg"
      drawerDirection="bottom"
      drawerFullHeight={true}
      bodyScrollable={false}
      hideCloseButton={enableMultipleScan}
      showCloseButton={true}
      enableMaximize={isDialogLayout}
      showConfirmationOnClose={hasUnsavedBarcodes}
      confirmOnCloseTitle={closeScannerTitle}
      confirmOnCloseMessage={barcodes.length > 0 ? closeMessageItems : closeMessageEmpty}
      confirmOnCloseLabel={discardCloseLabel}
      footerLeftActions={isDialogLayout && enableMultipleScan ? confirmButtonNode : undefined}
      headerActions={!isDialogLayout && enableMultipleScan ? confirmButtonNode : undefined}
    >
      <div
        className={cn(
          "flex",
          isDialogLayout ? "flex-1 min-h-0 h-full flex-row gap-2 p-2" : "flex-col gap-0 min-h-full"
        )}
      >
        <div
          className={cn(
            "bg-white/95 dark:bg-gray-900/95 backdrop-blur-xs border-gray-200 dark:border-gray-800",
            isDialogLayout
              ? "w-[min(420px,45%)] shrink-0 flex flex-col min-h-0 border rounded-xl overflow-hidden"
              : "sticky top-0 z-20 border-b flex flex-col"
          )}
        >
          {cameraAndToolbarBlock}
        </div>
        {resultsPanel}
      </div>

      {enableJSONResult && (
        <Dialog open={isJsonDialogOpen} onOpenChange={setIsJsonDialogOpen}>
          <DialogContent className="w-full h-full lg:max-w-[65vw] lg:max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{scannedJsonTitle}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-auto">
              <CodeViewer
                code={JSON.stringify(jsonData, null, 2)}
                programmingLanguage="json"
                initialLineNumbers={20}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

    </DrawerDialog>
  );
};

BarcodeScannerWrapper.displayName = "BarcodeScannerWrapper";

