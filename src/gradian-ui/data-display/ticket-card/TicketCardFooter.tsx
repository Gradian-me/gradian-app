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

/** Client-only barcode/DataMatrix via bwip-js to avoid SSR. */
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

  useEffect(() => {
    if (!value || !canvasRef.current || typeof window === "undefined") return;
    let cancelled = false;

    const draw = async () => {
      try {
        const bwipjs = await import("bwip-js/browser");
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const isDatamatrix = type === "datamatrix";
        // Use gs1datamatrix (square by default) for GS1-style data; otherwise datamatrix with format square
        const bcid =
          type === "datamatrix"
            ? value.includes("(")
              ? "gs1datamatrix"
              : "datamatrix"
            : "code128";
        bwipjs.toCanvas(canvas, {
          bcid,
          text: value,
          scale: isDatamatrix ? 2 : 2,
          height: 10,
          includetext: false,
          backgroundcolor: "FFFFFF",
          ...(bcid === "datamatrix" ? { format: "square" as const } : {}),
        });
        if (isDatamatrix && canvas.width !== canvas.height) {
          const side = Math.max(canvas.width, canvas.height);
          const squareCanvas = document.createElement("canvas");
          squareCanvas.width = side;
          squareCanvas.height = side;
          const ctx = squareCanvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, side, side);
            ctx.drawImage(canvas, (side - canvas.width) / 2, (side - canvas.height) / 2);
            canvas.width = side;
            canvas.height = side;
            canvas.getContext("2d")?.drawImage(squareCanvas, 0, 0);
          }
        }
        setError(null);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };

    draw();
    return () => {
      cancelled = true;
    };
  }, [value, type, canvasRef]);

  if (error) {
    return (
      <div className={cn(BARCODE_CONTAINER_CLASS, "min-h-[60px]")}>
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      </div>
    );
  }

  const isDatamatrix = type === "datamatrix";
  const canvas = (
    <canvas
      ref={canvasRef}
      className={cn(
        "h-auto",
        isDatamatrix
          ? "w-full h-full max-w-[80px] max-h-[80px] object-contain object-center"
          : "max-w-full"
      )}
      aria-label={`${type} barcode for ${value}`}
      style={
        isDatamatrix
          ? { width: "100%", height: "100%", objectFit: "contain" as const }
          : { maxHeight: 60 }
      }
    />
  );
  if (isDatamatrix) {
    return (
      <div className="w-[80px] h-[80px] flex items-center justify-center shrink-0" aria-hidden>
        {canvas}
      </div>
    );
  }
  return canvas;
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
