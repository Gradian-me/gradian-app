"use client";

import React from "react";
import { Camera, Minus, Plus, Flashlight, FlashlightOff, Braces, Keyboard, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/gradian-ui/shared/utils";
import { TRANSLATION_KEYS } from "@/gradian-ui/shared/constants/translations";
import { getDefaultLanguage, getT } from "@/gradian-ui/shared/utils/translation-utils";
import { useLanguageStore } from "@/stores/language.store";
import type { BarcodeScannerToolbarProps, ScanMode } from "../types";

const HANDHELD_VALUE = "__handheld__";

export const BarcodeScannerToolbar: React.FC<BarcodeScannerToolbarProps> = ({
  cameras,
  selectedCameraId,
  onCameraChange,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  minZoom,
  maxZoom,
  hasTorch,
  torchActive,
  onToggleTorch,
  enableJSONResult,
  onOpenJSON,
  scanMode,
  onScanModeChange,
  hideZoom = false,
  showBeepSwitch = false,
  beepOn = true,
  onBeepChange,
}) => {
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const inputSourceLabel = getT(TRANSLATION_KEYS.BARCODE_SCANNER_INPUT_SOURCE, language, defaultLang);
  const handheldDeviceLabel = getT(TRANSLATION_KEYS.BARCODE_SCANNER_HANDHELD_DEVICE, language, defaultLang);
  const defaultCameraLabel = getT(TRANSLATION_KEYS.BARCODE_SCANNER_DEFAULT_CAMERA, language, defaultLang);
  const cameraNLabel = (n: number) => getT(TRANSLATION_KEYS.BARCODE_SCANNER_CAMERA_N, language, defaultLang).replace(/\{\{n\}\}/g, String(n));
  const zoomOutAria = getT(TRANSLATION_KEYS.BARCODE_SCANNER_ZOOM_OUT, language, defaultLang);
  const zoomInAria = getT(TRANSLATION_KEYS.BARCODE_SCANNER_ZOOM_IN, language, defaultLang);
  const torchOnAria = getT(TRANSLATION_KEYS.BARCODE_SCANNER_TORCH_ON, language, defaultLang);
  const torchOffAria = getT(TRANSLATION_KEYS.BARCODE_SCANNER_TORCH_OFF, language, defaultLang);
  const viewJsonAria = getT(TRANSLATION_KEYS.BARCODE_SCANNER_VIEW_JSON, language, defaultLang);
  const beepLabel = getT(TRANSLATION_KEYS.BARCODE_SCANNER_BEEP, language, defaultLang);

  const selectValue = scanMode === "handheld"
    ? HANDHELD_VALUE
    : (selectedCameraId || cameras[0]?.deviceId || "default");

  const handleSelectChange = (value: string) => {
    if (value === HANDHELD_VALUE) {
      onScanModeChange("handheld");
    } else {
      onScanModeChange("camera");
      onCameraChange(value);
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-700 rounded-b-xl flex-wrap">
      {/* Input source selector (Handheld + cameras) */}
      <div className="flex items-center gap-1.5 min-w-0 shrink-0">
        {scanMode === "handheld" ? (
          <Keyboard className="w-4 h-4 text-violet-500 shrink-0" aria-hidden />
        ) : (
          <Camera className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
        )}
        <Select value={selectValue} onValueChange={handleSelectChange}>
          <SelectTrigger
            className={cn(
              "h-8 text-xs w-[150px] sm:w-[160px] border-gray-200 dark:border-gray-700",
              scanMode === "handheld"
                ? "bg-violet-50 dark:bg-violet-950/30 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300"
                : "bg-white dark:bg-gray-900"
            )}
            aria-label={inputSourceLabel}
          >
            <SelectValue placeholder={inputSourceLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={HANDHELD_VALUE} className="text-xs font-medium text-violet-700 dark:text-violet-300">
              <span className="flex items-center gap-1.5">
                <Keyboard className="w-3 h-3" />
                {handheldDeviceLabel}
              </span>
            </SelectItem>
            {cameras.map((cam, idx) => {
              const value = cam.deviceId || "default";
              return (
                <SelectItem
                  key={cam.deviceId || `camera-${idx}`}
                  value={value}
                  className="text-xs"
                >
                  {cam.label || cameraNLabel(idx + 1)}
                </SelectItem>
              );
            })}
            {cameras.length === 0 && (
              <SelectItem value="default" className="text-xs">
                {defaultCameraLabel}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Zoom controls — hidden in handheld mode or when Scanner has built-in zoom */}
      {scanMode === "camera" && !hideZoom && (
        <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-1 py-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onZoomOut}
            disabled={zoomLevel <= minZoom}
            aria-label={zoomOutAria}
          >
            <Minus className="w-3 h-3" />
          </Button>
          <span className="text-xs font-mono text-gray-600 dark:text-gray-300 min-w-10 text-center select-none">
            {zoomLevel.toFixed(1)}x
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onZoomIn}
            disabled={zoomLevel >= maxZoom}
            aria-label={zoomInAria}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Beep switch — only when scanner has beep enabled */}
      {showBeepSwitch && onBeepChange && (
        <div className="flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5 text-gray-500 shrink-0" aria-hidden />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{beepLabel}</span>
          <Switch checked={beepOn} onCheckedChange={onBeepChange} aria-label={beepLabel} />
        </div>
      )}

      {/* Torch toggle — hidden in handheld mode */}
      {scanMode === "camera" && hasTorch && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 rounded-lg border",
            torchActive
              ? "bg-amber-100 border-amber-300 text-amber-600 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400"
              : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500"
          )}
          onClick={onToggleTorch}
          aria-label={torchActive ? torchOffAria : torchOnAria}
        >
          {torchActive ? (
            <Flashlight className="w-4 h-4" />
          ) : (
            <FlashlightOff className="w-4 h-4" />
          )}
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1 min-w-[40px]" />

      {/* JSON viewer button */}
      {enableJSONResult && onOpenJSON && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500"
          onClick={onOpenJSON}
          aria-label={viewJsonAria}
        >
          <Braces className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

BarcodeScannerToolbar.displayName = "BarcodeScannerToolbar";

