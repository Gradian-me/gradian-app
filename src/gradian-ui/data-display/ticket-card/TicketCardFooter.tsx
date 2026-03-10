"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/gradian-ui/shared/utils";
import { Logo } from "@/gradian-ui/layout/logo/components/Logo";
import { CopyContent } from "@/gradian-ui/form-builder/form-elements/components/CopyContent";
import { BarcodeCanvas } from "@/gradian-ui/barcode-management/barcode-generator";
import { isGS1Valid, parseGS1 } from "@/gradian-ui/barcode-management/gs1-management";

const QRCodeCanvas = dynamic(
  () =>
    import("@/gradian-ui/barcode-management/barcode-generator/components/QRCodeCanvas").then(
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

const AI_COLOR_CLASSES = [
  "text-rose-600 dark:text-rose-300",
  "text-pink-600 dark:text-pink-300",
  "text-fuchsia-600 dark:text-fuchsia-300",
  "text-purple-600 dark:text-purple-300",
  "text-violet-600 dark:text-violet-300",
  "text-indigo-600 dark:text-indigo-300",
  "text-blue-600 dark:text-blue-300",
  "text-sky-600 dark:text-sky-300",
  "text-cyan-600 dark:text-cyan-300",
  "text-teal-600 dark:text-teal-300",
  "text-emerald-600 dark:text-emerald-300",
  "text-green-600 dark:text-green-300",
  "text-lime-600 dark:text-lime-300",
  "text-yellow-600 dark:text-yellow-300",
  "text-amber-600 dark:text-amber-300",
  "text-orange-600 dark:text-orange-300",
  "text-red-600 dark:text-red-300",
  "text-slate-600 dark:text-slate-300",
];

function getAiColorClasses(ai: string): string {
  let hash = 0;
  for (let i = 0; i < ai.length; i++) {
    hash = (hash * 31 + ai.charCodeAt(i)) >>> 0;
  }
  const idx = hash % AI_COLOR_CLASSES.length;
  return AI_COLOR_CLASSES[idx];
}

export function renderGs1ValueForDisplay(raw: string): React.ReactNode | null {
  if (!isGS1Valid(raw)) return null;
  try {
    const result = parseGS1(raw);
    if (!result.parsedCodeItems.length) return null;

    return (
      <span className="inline-flex flex-wrap gap-x-1 gap-y-1">
        {result.parsedCodeItems.map((item, index) => {
          const rawValue = item.rawValue ?? (typeof item.data === "string" ? item.data : "");
          return (
            <span
              key={`${item.ai}-${index}`}
              className="inline-flex items-center gap-0.5"
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-mono",
                  getAiColorClasses(item.ai)
                )}
              >
                ({item.ai})
              </span>
              {rawValue && (
                <span className="font-mono text-foreground text-[11px] tracking-normal">
                  {rawValue}
                </span>
              )}
            </span>
          );
        })}
      </span>
    );
  } catch {
    return null;
  }
}

export function TicketCardFooter({
  barcodeValue,
  barcodeType,
  footerDescription,
  className,
}: TicketCardFooterProps) {
  const gs1Display = useMemo(() => renderGs1ValueForDisplay(barcodeValue), [barcodeValue]);

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
            <span className="font-mono">
              {gs1Display ?? barcodeValue}
            </span>
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
