"use client";

import React from "react";
import { cn } from "@/gradian-ui/shared/utils";
import type { ScannedBarcode } from "../types";
import { GS1Badge } from "@/gradian-ui/barcode-management/gs1-management";

export interface BarcodeScannerResultFlatProps {
  items: ScannedBarcode[];
  /** When true, shows quantity and divider line for items that have a count. */
  showCount?: boolean;
  /** Optional extra classes for the root <ul>. */
  className?: string;
}

export const BarcodeScannerResultFlat: React.FC<BarcodeScannerResultFlatProps> = ({
  items,
  showCount = true,
  className,
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <ul className={cn("text-xs space-y-1", className)}>
      {items.map((item) => (
        <li key={item.id}>
          <div className="flex items-baseline gap-2">
            <span className="font-sans break-all min-w-0 text-left" dir="auto">
              {item.label}
            </span>
            {(item.format === "DataMatrix" || item.format === "Handheld" || item.format === "RFID") && (
              <GS1Badge barcodeLabel={item.label ?? ""} />
            )}
            {showCount && item.count != null && item.count > 0 && (
              <>
                <span className="flex-1 border-b border-dotted border-gray-200 dark:border-gray-700" />
                <span className="shrink-0 whitespace-nowrap text-[11px] text-gray-500 dark:text-gray-400">
                  × {item.count}
                </span>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};

BarcodeScannerResultFlat.displayName = "BarcodeScannerResultFlat";

