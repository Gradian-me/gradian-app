"use client";

import React, { useMemo } from "react";
import { CheckCircle2, ExternalLink, Copy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/gradian-ui/shared/utils";
import { isValidUrl, safeLinkHref } from "../utils/sanitize";
import type { BarcodeScannerResultProps } from "../types";

export const BarcodeScannerResult: React.FC<BarcodeScannerResultProps> = ({
  value,
  format,
  onReset,
}) => {
  const isUrl = useMemo(() => isValidUrl(value), [value]);
  const safeHref = useMemo(() => (isUrl ? safeLinkHref(value) : null), [value, isUrl]);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      {/* Success icon */}
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/20">
        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
      </div>

      {/* Format badge */}
      <span className="text-xs font-semibold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">
        {format}
      </span>

      {/* Value */}
      <div
        className={cn(
          "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60",
          "px-4 py-3 text-sm font-mono break-all text-gray-900 dark:text-gray-100",
          "text-center max-h-40 overflow-y-auto"
        )}
        dir="auto"
      >
        {value}
      </div>

      {/* URL link */}
      {isUrl && safeHref && (
        <a
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400",
            "hover:underline underline-offset-2 font-medium"
          )}
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          Open link in new tab
        </a>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-1">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopy}>
          <Copy className="w-3.5 h-3.5" />
          {copied ? "Copied!" : "Copy"}
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onReset}>
          <RotateCcw className="w-3.5 h-3.5" />
          Scan again
        </Button>
      </div>
    </div>
  );
};

BarcodeScannerResult.displayName = "BarcodeScannerResult";
