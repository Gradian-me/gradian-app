"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "../../../shared/utils";

export type BarcodeCanvasType = "barcode" | "datamatrix";

export interface BarcodeCanvasProps {
  /** Raw value to encode into the symbol. */
  value: string;
  /** Symbology: 1D Code128-style barcode or DataMatrix. */
  type: BarcodeCanvasType;
  /** Optional extra classes for the rendered element wrapper. */
  className?: string;
}

/**
 * Client-only barcode/DataMatrix renderer using bwip-js.
 *
 * - For `type="barcode"` it renders a Code128 barcode into a <canvas>.
 * - For `type="datamatrix"` it renders a (GS1-)DataMatrix into an inline SVG <img>,
 *   choosing `gs1datamatrix` when the value looks like an AI string `(01)...`.
 */
export const BarcodeCanvas: React.FC<BarcodeCanvasProps> = ({ value, type, className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgDataUrl, setSvgDataUrl] = useState<string | null>(null);

  const isDatamatrix = type === "datamatrix";

  // DataMatrix: use toSVG so the symbol is natively square (no canvas aspect-ratio issues).
  useEffect(() => {
    if (!isDatamatrix || !value || typeof window === "undefined") return;
    let cancelled = false;

    const run = async () => {
      try {
        const bwipjs = await import("bwip-js/browser");
        if (cancelled) return;
        const bcid = value.includes("(") ? "gs1datamatrix" : "datamatrix";
        const svg = bwipjs.toSVG({
          bcid,
          text: value,
          scale: 2,
          height: 15,
          width: 15,
          includetext: false,
          backgroundcolor: "FFFFFF",
        });
        if (cancelled) return;
        const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        setSvgDataUrl(dataUrl);
        setError(null);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [value, isDatamatrix]);

  // 1D barcode: use toCanvas.
  useEffect(() => {
    if (isDatamatrix || !value || typeof window === "undefined") return;
    let cancelled = false;

    const draw = async () => {
      try {
        const bwipjs = await import("bwip-js/browser");
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        bwipjs.toCanvas(canvas, {
          bcid: "code128",
          text: value,
          scale: 2,
          height: 10,
          includetext: true,
          backgroundcolor: "FFFFFF",
        });
        setError(null);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };

    draw();
    return () => {
      cancelled = true;
    };
  }, [value, isDatamatrix]);

  if (error) {
    return (
      <div className={cn("min-h-[60px] flex items-center justify-center", className)}>
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      </div>
    );
  }

  if (isDatamatrix) {
    return (
      <div
        className={cn(
          "w-[80px] h-[80px] flex items-center justify-center shrink-0",
          className
        )}
        aria-hidden
      >
        {svgDataUrl ? (
          <img
            src={svgDataUrl}
            alt=""
            role="img"
            aria-label={`DataMatrix barcode for ${value}`}
            className="w-full h-full max-w-[80px] max-h-[80px] object-contain object-center"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <div className="w-full h-full bg-white dark:bg-gray-800 rounded animate-pulse" />
        )}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn("h-auto max-w-full", className)}
      aria-label={`barcode for ${value}`}
      style={{ maxHeight: 60 }}
    />
  );
};

BarcodeCanvas.displayName = "BarcodeCanvas";

