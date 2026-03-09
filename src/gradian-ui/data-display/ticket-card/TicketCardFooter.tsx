"use client";

import React from "react";
import dynamic from "next/dynamic";
import { cn } from "@/gradian-ui/shared/utils";
import { Logo } from "@/gradian-ui/layout/logo/components/Logo";
import { CopyContent } from "@/gradian-ui/form-builder/form-elements/components/CopyContent";
import { BarcodeCanvas } from "@/gradian-ui/form-builder/form-elements";

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

export function TicketCardFooter({
  barcodeValue,
  barcodeType,
  footerDescription,
  className,
}: TicketCardFooterProps) {
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
            <BarcodeCanvas
              value={barcodeValue}
              type={barcodeType === "datamatrix" ? "datamatrix" : "barcode"}
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
