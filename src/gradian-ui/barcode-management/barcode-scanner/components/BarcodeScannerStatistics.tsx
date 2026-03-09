"use client";

import React, { useMemo } from "react";
import { Package, Hash, ScanLine } from "lucide-react";
import { cn } from "@/gradian-ui/shared/utils";
import { TRANSLATION_KEYS } from "@/gradian-ui/shared/constants/translations";
import { getDefaultLanguage, getT } from "@/gradian-ui/shared/utils/translation-utils";
import { useLanguageStore } from "@/stores/language.store";
import { getFormatBadgeClass } from "../utils/format-badge";
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
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const itemsCount = barcodes.length;
  const labelItems = getT(TRANSLATION_KEYS.BARCODE_SCANNER_ITEMS, language, defaultLang);
  const labelTotal = getT(TRANSLATION_KEYS.BARCODE_SCANNER_TOTAL, language, defaultLang);
  const labelScanned = getT(TRANSLATION_KEYS.BARCODE_SCANNER_SCANNED, language, defaultLang);
  const labelLastScanned = getT(TRANSLATION_KEYS.BARCODE_SCANNER_LAST_SCANNED, language, defaultLang);
  const totalCount = useMemo(() => {
    if (!enableChangeCount) return itemsCount;
    return barcodes.reduce((sum, b) => sum + (b.count ?? 1), 0);
  }, [barcodes, enableChangeCount, itemsCount]);

  const lastScannedDisplay = useMemo(() => {
    const label = lastScannedLabel ?? (barcodes.length > 0 ? barcodes[barcodes.length - 1]?.label ?? null : null);
    const format = lastScannedFormat ?? (barcodes.length > 0 ? barcodes[barcodes.length - 1]?.format ?? null : null);
    if (label) {
      const truncated =
        label.length > 32
          ? `${label.slice(0, 29)}...`
          : label;
      return { label: truncated, format: format ?? null };
    }
    return { label: null, format: null };
  }, [lastScannedLabel, lastScannedFormat, barcodes]);

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
                {labelItems}
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
                {enableChangeCount ? labelTotal : labelScanned}
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
              {labelLastScanned}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 min-h-0">
            <span className={cn("text-sm font-mono truncate", valueColor)} dir="auto">
              {lastScannedDisplay.label ?? "—"}
            </span>
            {lastScannedDisplay.format && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold font-mono tracking-wide shrink-0",
                  getFormatBadgeClass(lastScannedDisplay.format)
                )}
              >
                {lastScannedDisplay.format}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

BarcodeScannerStatistics.displayName = "BarcodeScannerStatistics";

