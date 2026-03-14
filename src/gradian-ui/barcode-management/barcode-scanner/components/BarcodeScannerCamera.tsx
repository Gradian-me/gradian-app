"use client";

import React from "react";
import { cn } from "@/gradian-ui/shared/utils";
import { TRANSLATION_KEYS } from "@/gradian-ui/shared/constants/translations";
import { getDefaultLanguage, getT } from "@/gradian-ui/shared/utils/translation-utils";
import { useLanguageStore } from "@/stores/language.store";
import type { BarcodeScannerCameraProps } from "../types";

export const BarcodeScannerCamera: React.FC<BarcodeScannerCameraProps> = ({
  children,
  isScanning,
  lastScannedFormat,
  cameraError,
  compact = false,
  nfcActive = false,
}) => {
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const cameraAllowHint = getT(TRANSLATION_KEYS.BARCODE_SCANNER_CAMERA_ALLOW_HINT, language, defaultLang);
  return (
    <div
      className={cn(
        "relative aspect-square min-h-0 bg-black rounded-xl mx-auto overflow-hidden",
        compact
          ? "w-full max-h-full max-w-[220px]"
          : "w-full h-full max-w-[250px] max-h-[250px]"
      )}
    >
      {children && (
        <div className="absolute inset-0 w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full">
          {children}
        </div>
      )}

      {/* Scanner uses its default finder (components.finder); only our format badge and status dot */}
      <div className="absolute inset-0 pointer-events-none">
        {lastScannedFormat && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-emerald-400 text-xs font-mono tracking-wider">
            {lastScannedFormat}
          </div>
        )}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {nfcActive && (
            <span className="px-2 py-0.5 rounded-full bg-fuchsia-500/80 backdrop-blur-sm text-white text-[10px] font-medium tracking-wide">
              NFC
            </span>
          )}
          {/* Green dot with ping when camera is active (feed showing); gray when not */}
          <span className="relative flex h-2 w-2">
            {children && !cameraError && (
              <span
                className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping opacity-75"
                aria-hidden
              />
            )}
            <span
              className={cn(
                "relative inline-block h-2 w-2 rounded-full",
                children && !cameraError ? "bg-emerald-400" : "bg-gray-400"
              )}
            />
          </span>
        </div>
      </div>

      {/* Camera error message */}
      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 px-4 text-center">
          <p className="text-sm font-medium text-amber-200">{cameraError}</p>
          <p className="text-xs text-gray-400">
            {cameraAllowHint}
          </p>
        </div>
      )}
    </div>
  );
};

BarcodeScannerCamera.displayName = "BarcodeScannerCamera";

