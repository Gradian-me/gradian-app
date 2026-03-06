"use client";

import React, { useMemo } from "react";
import { Package, Hash, ScanLine } from "lucide-react";
import { cn } from "@/gradian-ui/shared/utils";
import type { ScannedBarcode } from "../types";

// Match MetricCard gradient + border styling for a consistent modern look
const GRADIENT_CLASSES: Record<string, string> = {
  slate:
    "from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950/30 dark:via-gray-950/30 dark:to-zinc-950/30 border-slate-200/50 dark:border-slate-800/50",
  indigo:
    "from-indigo-50 via-blue-50 to-purple-50 dark:from-indigo-950/30 dark:via-blue-950/30 dark:to-purple-950/30 border-indigo-200/50 dark:border-indigo-800/50",
  violet:
    "from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-indigo-950/30 border-violet-200/50 dark:border-violet-800/50",
  emerald:
    "from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/30 dark:via-green-950/30 dark:to-teal-950/30 border-emerald-200/50 dark:border-emerald-800/50",
};

const ICON_BG_CLASSES: Record<keyof typeof GRADIENT_CLASSES, string> = {
  slate: "bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400",
  indigo: "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400",
  violet: "bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400",
  emerald: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400",
};

const LABEL_VALUE_CLASSES: Record<keyof typeof GRADIENT_CLASSES, string> = {
  slate: "text-slate-500 dark:text-slate-400 text-slate-900 dark:text-slate-100",
  indigo: "text-indigo-600/90 dark:text-indigo-400 text-indigo-950 dark:text-indigo-100",
  violet: "text-violet-600/90 dark:text-violet-400 text-violet-950 dark:text-violet-100",
  emerald: "text-emerald-600/90 dark:text-emerald-400 text-emerald-950 dark:text-emerald-100",
};

export interface BarcodeScannerStatisticsProps {
  barcodes: ScannedBarcode[];
  enableChangeCount?: boolean;
  lastScannedLabel?: string | null;
  lastScannedFormat?: string | null;
  /** Gradient theme; matches MetricCard styling. Default: indigo */
  gradient?: keyof typeof GRADIENT_CLASSES;
  className?: string;
}

export const BarcodeScannerStatistics: React.FC<BarcodeScannerStatisticsProps> = ({
  barcodes,
  enableChangeCount = false,
  lastScannedLabel = null,
  lastScannedFormat = null,
  gradient = "indigo",
  className,
}) => {
  const itemsCount = barcodes.length;
  const totalCount = useMemo(() => {
    if (!enableChangeCount) return itemsCount;
    return barcodes.reduce((sum, b) => sum + (b.count ?? 1), 0);
  }, [barcodes, enableChangeCount, itemsCount]);

  const lastScannedDisplay = useMemo(() => {
    if (lastScannedLabel) {
      const truncated =
        lastScannedLabel.length > 32
          ? `${lastScannedLabel.slice(0, 29)}...`
          : lastScannedLabel;
      return lastScannedFormat ? `${truncated} (${lastScannedFormat})` : truncated;
    }
    return "—";
  }, [lastScannedLabel, lastScannedFormat]);

  const gradientClass = GRADIENT_CLASSES[gradient] ?? GRADIENT_CLASSES.indigo;
  const iconBgClass = ICON_BG_CLASSES[gradient] ?? ICON_BG_CLASSES.indigo;
  const textClasses = (LABEL_VALUE_CLASSES[gradient] ?? LABEL_VALUE_CLASSES.indigo).split(" ");
  const labelColor = textClasses.slice(0, 2).join(" ");
  const valueColor = textClasses.slice(2, 4).join(" ");

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl bg-linear-to-br border shadow-sm min-h-0 h-full",
        gradientClass,
        className
      )}
    >
      {/* Decorative background pattern (simplified for compatibility) */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none">
        <div className="absolute inset-0" />
      </div>
      <div className="relative flex flex-1 flex-col gap-3 min-h-0 p-4">
        <div className="flex items-center justify-around shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("shrink-0 p-2.5 rounded-lg transition-colors", iconBgClass)}>
              <Package className="h-4 w-4" />
            </div>
            <div>
              <div className={cn("text-xs font-medium uppercase tracking-wide mb-0.5", labelColor)}>
                Items
              </div>
              <div className={cn("text-2xl font-bold", valueColor)}>{itemsCount}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("shrink-0 p-2.5 rounded-lg transition-colors", iconBgClass)}>
              <Hash className="h-4 w-4" />
            </div>
            <div>
              <div className={cn("text-xs font-medium uppercase tracking-wide mb-0.5", labelColor)}>
                {enableChangeCount ? "Total" : "Scanned"}
              </div>
              <div className={cn("text-2xl font-bold", valueColor)}>{totalCount}</div>
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col min-h-0 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-2 mb-1 shrink-0">
            <div className={cn("shrink-0 p-2 rounded-lg", iconBgClass)}>
              <ScanLine className="h-3.5 w-3.5" />
            </div>
            <div className={cn("text-xs font-medium uppercase tracking-wide", labelColor)}>
              Last scanned
            </div>
          </div>
          <p className={cn("text-sm font-mono truncate min-h-0", valueColor)} dir="auto">
            {lastScannedDisplay}
          </p>
        </div>
      </div>
    </div>
  );
};

BarcodeScannerStatistics.displayName = "BarcodeScannerStatistics";
