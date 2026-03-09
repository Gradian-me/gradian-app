"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/gradian-ui/shared/utils";
import { Logo } from "@/gradian-ui/layout/logo/components/Logo";
import { CopyContent } from "@/gradian-ui/form-builder/form-elements/components/CopyContent";

const QRCodeCanvas = dynamic(
  () =>
    import("@/gradian-ui/form-builder/form-elements/components/QRCodeCanvas").then(
      (mod) => mod.QRCodeCanvas
    ),
  { ssr: false }
);

export type TicketCardBarcodeType = "qr" | "barcode" | "datamatrix";

export interface TicketCardFooterProps {
  /** Raw value to encode (shown as text and in the graphic). */
  barcodeValue: string;
  /** Symbology to render: qr, 1D barcode (Code128), or DataMatrix. */
  barcodeType: TicketCardBarcodeType;
  /** Optional description below the barcode (e.g. symbology name). */
  footerDescription?: string;
  className?: string;
}

const DashedLine = () => (
  <div
    className="w-full border-t-2 border-dashed border-gray-300 dark:border-gray-500"
    aria-hidden="true"
  />
);

const BARCODE_CONTAINER_CLASS =
  "flex justify-center items-center bg-white p-2 rounded-xl mx-auto";

/** Client-only barcode/DataMatrix via bwip-js to avoid SSR. DataMatrix uses toSVG for square output; barcode uses toCanvas. */
function BwipBarcode({
  value,
  type,
  canvasRef,
}: {
  value: string;
  type: "barcode" | "datamatrix";
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
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
          height: 10,
          includetext: false,
          backgroundcolor: "FFFFFF"
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

  // Barcode: use toCanvas as before.
  useEffect(() => {
    if (isDatamatrix || !value || !canvasRef.current || typeof window === "undefined") return;
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
  }, [value, isDatamatrix, canvasRef]);

  if (error) {
    return (
      <div className={cn(BARCODE_CONTAINER_CLASS, "min-h-[60px]")}>
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      </div>
    );
  }

  if (isDatamatrix) {
    return (
      <div className="w-[80px] h-[80px] flex items-center justify-center shrink-0" aria-hidden>
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
      className="h-auto max-w-full"
      aria-label={`barcode for ${value}`}
      style={{ maxHeight: 60 }}
    />
  );
}

export function TicketCardFooter({
  barcodeValue,
  barcodeType,
  footerDescription,
  className,
}: TicketCardFooterProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  return (
    <div className={cn("px-8 pb-8 flex flex-col items-center", className)}>
      <DashedLine />
      <div className="flex flex-col items-center py-2 w-full">
        {barcodeType === "qr" ? (
          <div className={cn(BARCODE_CONTAINER_CLASS, "max-w-[150px]")}>
            <QRCodeCanvas
              value={barcodeValue}
              size={150}
              bgColor="#ffffff"
              bgRounded={true}
            />
          </div>
        ) : (
          <div
            className={cn(
              BARCODE_CONTAINER_CLASS,
              barcodeType === "datamatrix" && "w-[96px] h-[96px] min-w-[96px] min-h-[96px]"
            )}
          >
            <BwipBarcode
              value={barcodeValue}
              type={barcodeType}
              canvasRef={canvasRef}
            />
          </div>
        )}
        <div className="flex items-center justify-center gap-2 w-full mt-2">
          <p
            className="text-xs text-muted-foreground tracking-[0.2em] break-all text-center flex-1 min-w-0"
            dir="auto"
          >
            <span className="font-mono">{barcodeValue}</span>
          </p>
          <CopyContent content={barcodeValue} className="shrink-0" />
        </div>
      </div>
      {footerDescription && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {footerDescription}
        </p>
      )}
      <div className="mt-4 flex justify-center">
        <Logo variant="auto" width={150} />
      </div>
    </div>
  );
}
