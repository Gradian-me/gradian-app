"use client";

import React from "react";
import { cn } from "@/gradian-ui/shared/utils";
import type { BarcodeScannerCameraProps } from "../types";

export const BarcodeScannerCamera: React.FC<BarcodeScannerCameraProps> = ({
  videoRef,
  isScanning,
  lastScannedFormat,
  cameraError,
}) => {
  return (
    <div className="relative w-full items-center justify-center aspect-video max-w-[360px] mx-auto bg-black rounded-2xl overflow-hidden sm:max-w-[420px]">
      {/* Video feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Scanning overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Corner markers */}
        <div className="absolute inset-8">
          {/* Top-left */}
          <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm" />
          {/* Top-right */}
          <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm" />
          {/* Bottom-left */}
          <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm" />
          {/* Bottom-right */}
          <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-sm" />

          {/* Scanning line */}
          {isScanning && (
            <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-400/80 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)] animate-scan-line" />
          )}
        </div>

        {/* Format badge */}
        {lastScannedFormat && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-emerald-400 text-xs font-mono tracking-wider">
            {lastScannedFormat}
          </div>
        )}

        {/* Scanning status dot */}
        <div
          className={cn(
            "absolute top-3 right-3 w-2 h-2 rounded-full",
            isScanning
              ? "bg-emerald-400 animate-pulse"
              : "bg-gray-400"
          )}
        />
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.55)_100%)]" />

      {/* Camera error message */}
      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 px-4 text-center">
          <p className="text-sm font-medium text-amber-200">{cameraError}</p>
          <p className="text-xs text-gray-400">
            Allow camera access in your browser settings and try again.
          </p>
        </div>
      )}
    </div>
  );
};

BarcodeScannerCamera.displayName = "BarcodeScannerCamera";
