"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { DrawerDialog } from "@/gradian-ui/data-display/components/DrawerDialog";
import { BarcodeScannerCamera } from "./BarcodeScannerCamera";
import { BarcodeScannerToolbar } from "./BarcodeScannerToolbar";
import { BarcodeScannerResult } from "./BarcodeScannerResult";
import { BarcodeScannerResultJSON } from "./BarcodeScannerResultJSON";
import { BarcodeScannerStatistics } from "./BarcodeScannerStatistics";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/gradian-ui/shared/utils";
import { CodeViewer } from "@/gradian-ui/shared/components/CodeViewer";
import { CheckCircle2, Plus } from "lucide-react";
import { sanitizeBarcodeValue, sanitizeFormat } from "../utils/sanitize";
import type {
  BarcodeScannerProps,
  BarcodeFormat,
  ScannedBarcode,
  ScanMode,
} from "../types";

// â”€â”€â”€ ZXing format mapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Maps our friendly names to ZXing BarcodeFormat enum values (numbers).
const FORMAT_MAP: Record<BarcodeFormat, number> = {
  Code128: 1,
  Code39: 2,
  Code93: 3,
  EAN: 6,
  EAN8: 6,
  EAN13: 7,
  UPC: 14,
  UPCA: 14,
  UPCE: 15,
  QR: 11,
  DataMatrix: 5,
  PDF417: 10,
  Aztec: 0,
  ITF: 8,
  Codabar: 2,
  RSS14: 12,
  RSSExpanded: 13,
  Handheld: -1,
};

const DEFAULT_FORMATS: BarcodeFormat[] = ["Code128", "QR", "DataMatrix", "EAN"];

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

function createBeep(): () => void {
  return () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
      osc.onended = () => ctx.close();
    } catch {
      // AudioContext unavailable â€” silently ignore
    }
  };
}

function ulid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const MOCK_FORMATS = ["Code128", "QR", "DataMatrix", "EAN"] as const;
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<InstanceType<any> | null>(null);
  const beepRef = useRef<(() => void) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScanRef = useRef<string>("");

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
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
  const [handheldInput, setHandheldInput] = useState("");
  const handheldInputRef = useRef<HTMLInputElement>(null);

  // ID of the most-recently added/updated barcode (for pulse animation)
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const newlyAddedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tracks the actual last scanned/entered item for statistics (not last by array position)
  const [lastScannedLabel, setLastScannedLabel] = useState<string | null>(null);
  const [lastScannedFormatForStats, setLastScannedFormatForStats] = useState<string | null>(null);

  // Initialise beep
  useEffect(() => {
    if (enableBeep) beepRef.current = createBeep();
    return () => { beepRef.current = null; };
  }, [enableBeep]);

  // When drawer opens, ensure we have a camera id to start stream (avoid waiting on enumeration)
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      setSelectedCameraId((prev) => (prev || "default"));
    }, 50);
    return () => window.clearTimeout(t);
  }, [open]);

  // Enumerate cameras
  useEffect(() => {
    if (!open) return;
    setCameraError(null);
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setCameras(videoDevices);
        if (videoDevices.length > 0) {
          const back = videoDevices.find((d) =>
            /back|rear|environment/i.test(d.label)
          );
          setSelectedCameraId(back?.deviceId ?? videoDevices[0].deviceId);
        } else {
          setSelectedCameraId("default");
        }
      })
      .catch(() => {
        setSelectedCameraId("default");
      });
  }, [open]);

  // Seed multi-scan list from initialBarcodes when opening in multi-scan mode
  useEffect(() => {
    if (!open || !enableMultipleScan) return;
    if (initialBarcodes && initialBarcodes.length > 0) {
      setBarcodes(initialBarcodes);
    } else {
      setBarcodes([]);
    }
  }, [open, enableMultipleScan, initialBarcodes]);

  // Apply zoom via track constraints
  const applyZoom = useCallback(async (level: number) => {
    if (!streamRef.current) return;
    const [track] = streamRef.current.getVideoTracks();
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: level } as any] });
    } catch {
      // Zoom unsupported â€” ignore
    }
  }, []);

  const applyTorch = useCallback(async (active: boolean) => {
    if (!streamRef.current) return;
    const [track] = streamRef.current.getVideoTracks();
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: active } as any] });
    } catch {
      // Torch unsupported â€” ignore
    }
  }, []);

  // Start camera stream
  const startStream = useCallback(async (deviceId: string) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setHasTorch(false);
    setTorchActive(false);
    setZoomLevel(MIN_ZOOM);
    setCameraError(null);

    const isDefault = !deviceId || deviceId === "default";
    const constraints: MediaStreamConstraints = {
      video: isDefault
        ? {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        : {
            deviceId: { exact: deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
      audio: false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setCameraError(null);

      const [track] = stream.getVideoTracks();
      const caps = track.getCapabilities() as any;
      setHasTorch(Boolean(caps?.torch));

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          // Autoplay may be restricted; stream is still attached
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Camera access failed";
      if (
        message.includes("Permission") ||
        message.includes("NotAllowed") ||
        message.includes("denied")
      ) {
        setCameraError("Camera access denied. Please allow camera permission.");
      } else if (
        message.includes("NotFound") ||
        message.includes("no camera")
      ) {
        setCameraError("No camera found.");
      } else {
        setCameraError("Could not start camera. Please check permissions.");
      }
    }
  }, []);

  // Start ZXing reader
  const startReader = useCallback(async () => {
    // Dynamically import so the lib never executes server-side
    const { BrowserMultiFormatReader, BarcodeFormat: ZXingFormat } = await import(
      "@zxing/library"
    );

    if (readerRef.current) {
      readerRef.current.reset();
    }

    const hints = new Map();
    const formatValues: number[] = Array.from(
      new Set(allowedFormats.map((f) => FORMAT_MAP[f]).filter((v) => v !== undefined))
    );
    hints.set(2 /* DecodeHintType.POSSIBLE_FORMATS */, formatValues);

    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;

    if (!videoRef.current) return;

    setIsScanning(true);

    reader.decodeFromVideoElementContinuously(
      videoRef.current,
      (result: { getText: () => string; getBarcodeFormat?: () => { toString: () => string } }) => {
        if (!result) return;

        const raw = sanitizeBarcodeValue(result.getText());
        const fmt = sanitizeFormat(result.getBarcodeFormat?.()?.toString() ?? "Unknown");

        // Debounce: skip duplicate scans within 1.5 s
        if (raw === lastScanRef.current) return;
        lastScanRef.current = raw;
        setTimeout(() => { lastScanRef.current = ""; }, 1500);

        if (enableBeep && beepRef.current) beepRef.current();
        setLastScannedFormat(fmt);
        setLastScannedLabel(raw);
        setLastScannedFormatForStats(fmt);

        if (enableMultipleScan) {
          setBarcodes((prev) => {
            const existing = prev.find((b) => b.label === raw);
            if (existing) {
              // Increment count on duplicate scan
              const updated = prev.map((b) =>
                b.id === existing.id
                  ? { ...b, count: enableChangeCount ? (b.count ?? 1) + 1 : b.count }
                  : b
              );
              // Schedule the pulse — use timeout outside state updater
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
          setIsScanning(false);
          reader.reset();
          readerRef.current = null;
        }
      }
    );
  }, [allowedFormats, enableBeep, enableMultipleScan, onScan]);

  // Orchestrate start when open and camera selected (or "default")
  useEffect(() => {
    if (!open || !selectedCameraId || scanMode === "handheld") return;
    // Reset single-scan result when (re)opening
    if (!enableMultipleScan) setScannedValue(null);

    let cancelled = false;
    const timer = window.setTimeout(() => {
      (async () => {
        await startStream(selectedCameraId);
        if (!cancelled) await startReader();
      })();
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, selectedCameraId, scanMode, startStream, startReader]);

  // Stop camera stream when switching to handheld mode
  useEffect(() => {
    if (scanMode === "handheld") {
      readerRef.current?.reset();
      readerRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setIsScanning(false);
      // Auto-focus the handheld input
      const t = window.setTimeout(() => handheldInputRef.current?.focus(), 100);
      return () => window.clearTimeout(t);
    }
  }, [scanMode]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      readerRef.current?.reset();
      readerRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setIsScanning(false);
      setScannedValue(null);
      setBarcodes([]);
      setCameraError(null);
      lastScanRef.current = "";
      setIsJsonDialogOpen(false);
      setScanMode("camera");
      setHandheldInput("");
      if (newlyAddedTimerRef.current) clearTimeout(newlyAddedTimerRef.current);
      setNewlyAddedId(null);
      setLastScannedLabel(null);
      setLastScannedFormatForStats(null);
    }
  }, [open]);

  const markNewlyAdded = useCallback((id: string) => {
    if (newlyAddedTimerRef.current) clearTimeout(newlyAddedTimerRef.current);
    setNewlyAddedId(id);
    newlyAddedTimerRef.current = setTimeout(() => setNewlyAddedId(null), 1200);
  }, []);

  const handleCameraChange = useCallback(
    async (id: string) => {
      setSelectedCameraId(id);
      readerRef.current?.reset();
      readerRef.current = null;
      setIsScanning(false);
    },
    []
  );

  const handleScanModeChange = useCallback((mode: ScanMode) => {
    setScanMode(mode);
  }, []);

  const handleHandheldAdd = useCallback(() => {
    const raw = sanitizeBarcodeValue(handheldInput);
    if (!raw) return;
    setHandheldInput("");
    if (enableBeep && beepRef.current) beepRef.current();
    setLastScannedLabel(raw);
    setLastScannedFormatForStats("Handheld");

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
          format: "Handheld",
          createdAt: now.toISOString(),
          count: enableChangeCount ? 1 : undefined,
        };
        window.setTimeout(() => markNewlyAdded(newItem.id), 0);
        return [...prev, newItem];
      });
    } else {
      setScannedValue(raw);
      setScannedFormat("Handheld");
      onScan?.(raw, "Handheld");
    }
  }, [handheldInput, enableBeep, enableMultipleScan, enableChangeCount, markNewlyAdded, onScan]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => {
      const next = Math.min(prev + ZOOM_STEP, MAX_ZOOM);
      applyZoom(next);
      return next;
    });
  }, [applyZoom]);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => {
      const next = Math.max(prev - ZOOM_STEP, MIN_ZOOM);
      applyZoom(next);
      return next;
    });
  }, [applyZoom]);

  const handleToggleTorch = useCallback(() => {
    setTorchActive((prev) => {
      const next = !prev;
      applyTorch(next);
      return next;
    });
  }, [applyTorch]);

  const handleReset = useCallback(() => {
    setScannedValue(null);
    setScannedFormat("");
    lastScanRef.current = "";
    startReader();
  }, [startReader]);

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
      randomMockBarcode(enableChangeCount),
      randomMockBarcode(enableChangeCount),
      randomMockBarcode(enableChangeCount),
    ];
    setBarcodes((prev) => [...prev, ...items]);
    markNewlyAdded(items[items.length - 1].id);
  }, [enableChangeCount, markNewlyAdded]);

  const handleAddMockSingle = useCallback(() => {
    const b = randomMockBarcode(false);
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

  const confirmLabel = hasMultiScanItems ? `Confirm (${barcodes.length})` : "Confirm";

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


  const handheldPanel = (
    <div className={cn(
      "flex flex-col items-center justify-center gap-4 px-4",
      isDialogLayout ? "flex-1 py-6" : "py-6"
    )}>
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center mb-1">
          <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75V16.5ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Handheld Scanner</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[200px]">
          Type or scan with a handheld device.
        </p>
      </div>
      <div className="flex w-full max-w-xs gap-2">
        <input
          ref={handheldInputRef}
          type="text"
          value={handheldInput}
          onChange={(e) => setHandheldInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleHandheldAdd();
            }
          }}
          placeholder="Scan or type barcode…"
          className="flex-1 h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm font-mono text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 dark:focus:ring-violet-600 dark:focus:border-violet-600 transition-colors"
          autoComplete="off"
          maxLength={2048}
          dir="auto"
        />
        <button
          type="button"
          onClick={handleHandheldAdd}
          disabled={!handheldInput.trim()}
          className="h-10 w-10 shrink-0 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1"
          aria-label="Add barcode"
          title="Add barcode"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const cameraAndToolbarBlock = (
    <>
      {/* Camera / handheld + toolbar — vertically centered in dialog layout */}
      <div className={isDialogLayout ? "flex-1 min-h-0 flex flex-col items-stretch justify-around" : undefined}>
        {scanMode === "handheld" ? (
          handheldPanel
        ) : (
          <div className={cn("flex items-center justify-center", isDialogLayout ? "p-2" : "p-2")}>
            <BarcodeScannerCamera
              videoRef={videoRef}
              isScanning={isScanning}
              lastScannedFormat={lastScannedFormat}
              cameraError={cameraError}
            />
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
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-gray-400 dark:text-gray-500">
          <span className="text-sm">Point camera at a barcode to scan</span>
          {enableMockData && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddMockSingle}
              className="text-xs"
            >
              Add mock result
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
      title={title}
      size="lg"
      drawerDirection="bottom"
      bodyScrollable={false}
      hideCloseButton={enableMultipleScan}
      showCloseButton={true}
      enableMaximize={isDialogLayout}
      showConfirmationOnClose={hasUnsavedBarcodes}
      confirmOnCloseTitle="Close scanner"
      confirmOnCloseMessage={
        barcodes.length > 0
          ? `You have ${barcodes.length} scanned item${barcodes.length > 1 ? 's' : ''}. Closing will discard them unless you confirm first.`
          : 'Closing will discard your scanned items.'
      }
      confirmOnCloseLabel="Discard & close"
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
              <DialogTitle>Scanned barcodes (JSON)</DialogTitle>
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
