"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import { Trash2, ClipboardList, CheckCircle2, ExternalLink, Copy, PlusCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/gradian-ui/shared/utils";
import { format as dateFormat } from "date-fns";
import { getBarcodeTime } from "@/gradian-ui/shared/utils/date-utils";
import { ButtonMinimal, ConfirmationMessage } from "@/gradian-ui/form-builder/form-elements";
import { NumberInputAnimated } from "@/gradian-ui/form-builder/form-elements/components/NumberInputAnimated";
import { SearchInput } from "@/gradian-ui/form-builder/form-elements/components/SearchInput";
import {
  PrintoutReceipt,
  buildDocFromBarcodes,
  type ReceiptDocOptions,
} from "@/gradian-ui/printout";
import { isValidUrl, safeLinkHref } from "../utils/sanitize";
import type { BarcodeScannerResultJSONProps, ScannedBarcode } from "../types";

const SEARCH_CONFIG = { name: "barcode-search", placeholder: "Search by label or ID…" };

/** Default receipt layout: header, column headers, footer. barcodeValue defaults to current time (12-digit for EAN) in useMemo. */
const DEFAULT_RECEIPT_OPTIONS: ReceiptDocOptions = {
  headerTitle: "Label print",
  headerSubtitle: "Scan results",
  headerDescription: "Items listed below",
  listColumnHeaders: ["Item", "Qty"],
};

/**
 * Splits `text` around case-insensitive matches of `query` and returns
 * React nodes with matching segments wrapped in a <mark> span.
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={i}
        className="bg-amber-200 dark:bg-amber-700/60 text-amber-900 dark:text-amber-100 rounded-sm px-px"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

const FORMAT_COLORS: Record<string, string> = {
  QR: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  Code128: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  Code39: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  DataMatrix: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  EAN: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  Handheld: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800",
};

function formatBadgeClass(fmt: string | undefined): string {
  return FORMAT_COLORS[fmt ?? ""] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
}

type BarcodeCardProps = {
  barcode: ScannedBarcode;
  /** Position within the full reversed list — used for stable scan numbering. */
  originalIndex: number;
  totalCount: number;
  enableChangeCount: boolean;
  onRemove: () => void;
  onChangeCount?: (count: number) => void;
  isNew?: boolean;
  query?: string;
};

const BarcodeCard: React.FC<BarcodeCardProps> = ({
  barcode,
  originalIndex,
  totalCount,
  enableChangeCount,
  onRemove,
  onChangeCount,
  isNew = false,
  query = "",
}) => {
  const displayValue = barcode.label ?? "";
  const isUrl = useMemo(() => isValidUrl(displayValue), [displayValue]);
  const href = useMemo(() => (isUrl ? safeLinkHref(displayValue) : null), [isUrl, displayValue]);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently ignore
    }
  };

  // Scan number: newest item in the reversed list = #1
  const displayIndex = totalCount - originalIndex;

  return (
    <div className={cn(
      "group mx-3 my-1.5 rounded-2xl border bg-white dark:bg-gray-800/60 shadow-sm",
      "border-gray-200 dark:border-gray-700/70",
      "transition-all duration-200",
      isNew && "animate-barcode-pulse ring-1 ring-violet-300 dark:ring-violet-700"
    )}>
      {/* Top row: index + format badge + time + count editor + actions */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Index bubble */}
        <span className={cn(
          "shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
          isNew
            ? "bg-violet-500 text-white"
            : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300"
        )}>
          {displayIndex}
        </span>

        {/* Format badge */}
        <span className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold font-mono tracking-wide",
          formatBadgeClass(barcode.format)
        )}>
          {barcode.format ?? "Unknown"}
        </span>

        {/* Timestamp */}
        {barcode.createdAt && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
            {dateFormat(new Date(barcode.createdAt), "HH:mm:ss")}
          </span>
        )}

        <div className="flex-1" />

        {/* Actions — always visible on mobile, hover on desktop */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 relative"
            onClick={handleCopy}
            aria-label="Copy value"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied && (
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-medium text-emerald-500 whitespace-nowrap pointer-events-none">
                Copied!
              </span>
            )}
          </Button>
          <ButtonMinimal
            icon={Trash2}
            title="Delete scan"
            color="red"
            size="lg"
            onClick={onRemove}
          />
        </div>

        {/* Count editor — inline in the row */}
        {enableChangeCount && (
          <NumberInputAnimated
            value={barcode.count ?? 1}
            min={1}
            max={200}
            onChange={(next) => onChangeCount?.(next)}
          />
        )}
      </div>

      {/* Value row */}
      <div className="px-3 pb-2.5 -mt-0.5">
        <p
          className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all leading-snug"
          dir="auto"
        >
          {highlightMatch(displayValue, query)}
        </p>
        {isUrl && href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline underline-offset-2"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            Open in new tab
          </a>
        )}
      </div>
    </div>
  );
};

export const BarcodeScannerResultJSON: React.FC<BarcodeScannerResultJSONProps> = ({
  barcodes,
  enableChangeCount,
  onRemove,
  onClear,
  onConfirm,
  onCountChange,
  enableMockData,
  onAddMockData,
  hideFooterConfirm = false,
  fillHeight = false,
  newlyAddedId = null,
  receiptOptions,
}) => {
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const [confirmLabel, setConfirmLabel] = React.useState<string>("");
  const [clearConfirmOpen, setClearConfirmOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollTopRef = useRef<HTMLDivElement | null>(null);

  const handleRequestRemove = (barcode: ScannedBarcode) => {
    setConfirmId(barcode.id);
    setConfirmLabel(barcode.label ?? "");
  };

  const handleConfirmDelete = () => {
    if (confirmId) onRemove(confirmId);
    setConfirmId(null);
    setConfirmLabel("");
  };

  const handleConfirmClear = () => {
    onClear();
    setClearConfirmOpen(false);
  };

  // Scroll to top when a new item is added (newest shown first)
  useEffect(() => {
    if (scrollTopRef.current && barcodes.length > 0) {
      scrollTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [barcodes.length]);

  // Reverse so newest is first; attach original index for stable scan numbering
  const reversed = useMemo(
    () => [...barcodes].reverse().map((b, i) => ({ barcode: b, originalIndex: i })),
    [barcodes]
  );

  // Filter by label or id; highlight uses the raw query string
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reversed;
    return reversed.filter(
      ({ barcode: b }) =>
        b.label?.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q)
    );
  }, [reversed, searchQuery]);

  const receiptDoc = useMemo(
    () =>
      buildDocFromBarcodes(
        barcodes.map((b) => ({ label: b.label ?? "", count: b.count })),
        {
          ...DEFAULT_RECEIPT_OPTIONS,
          ...receiptOptions,
        }
      ),
    [barcodes, receiptOptions]
  );

  return (
    <div
      className={cn(
        "flex flex-col rounded-t-xl bg-gray-50 dark:bg-gray-900/60 shadow-sm overflow-hidden",
        fillHeight && "min-h-0 h-full"
      )}
    >
      {/* Header */}
      <div className="flex flex-col bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 shrink-0">
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Scan results</span>
            {barcodes.length > 0 && (
              <Badge variant="violet" className="text-xs px-1.5">
                {barcodes.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {enableMockData && onAddMockData && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                onClick={onAddMockData}
              >
                <PlusCircle className="w-4 h-4" />
                Mock
              </Button>
            )}
            <PrintoutReceipt
              doc={receiptDoc}
              showTrigger
              triggerLabel="Print label"
              triggerVariant="ghost"
              className="h-9 text-xs gap-1 text-violet-600 hover:text-violet-700 dark:text-violet-400"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs gap-1 text-red-400 hover:text-red-600"
              onClick={() => setClearConfirmOpen(true)}
              disabled={barcodes.length === 0}
              title="Clear all scans"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search bar — only shown when there are items */}
        {barcodes.length > 0 && (
          <div className="px-2 pb-2">
            <SearchInput
              config={SEARCH_CONFIG}
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery("")}
              maxLength={256}
              className="h-8 text-xs font-mono"
            />
          </div>
        )}
      </div>

      {/* Card list */}
      <div
        className={cn(
          "flex-1 overflow-y-auto min-h-0 py-1",
          !fillHeight && "max-h-64"
        )}
      >
        <div ref={scrollTopRef} />
        {barcodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500 gap-2">
            <ClipboardList className="w-8 h-8 opacity-40" />
            <p className="text-sm">No barcodes scanned yet</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500 gap-2">
            <Search className="w-7 h-7 opacity-40" />
            <p className="text-sm">No results for &ldquo;{searchQuery.trim()}&rdquo;</p>
          </div>
        ) : (
          filtered.map(({ barcode, originalIndex }) => (
            <BarcodeCard
              key={barcode.id}
              barcode={barcode}
              originalIndex={originalIndex}
              totalCount={barcodes.length}
              enableChangeCount={enableChangeCount}
              onRemove={() => handleRequestRemove(barcode)}
              onChangeCount={
                onCountChange
                  ? (count: number) => onCountChange(barcode.id, count)
                  : undefined
              }
              isNew={barcode.id === newlyAddedId}
              query={searchQuery.trim()}
            />
          ))
        )}
      </div>

      {/* Confirm footer */}
      {!hideFooterConfirm && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
          <Button
            className="w-full gap-2"
            onClick={onConfirm}
            disabled={barcodes.length === 0}
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirm {barcodes.length > 0 ? `(${barcodes.length})` : ""}
          </Button>
        </div>
      )}

      <ConfirmationMessage
        isOpen={confirmId != null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmId(null);
            setConfirmLabel("");
          }
        }}
        title="Delete scan"
        subtitle="This action cannot be undone."
        message={
          confirmLabel
            ? `Are you sure you want to delete the scan:\n\n${confirmLabel}`
            : "Are you sure you want to delete this scan?"
        }
        variant="destructive"
        showSwipe
        buttons={[
          {
            label: "Cancel",
            variant: "outline",
            action: () => {
              setConfirmId(null);
              setConfirmLabel("");
            },
          },
          {
            label: "Delete",
            variant: "destructive",
            action: handleConfirmDelete,
          },
        ]}
      />
      <ConfirmationMessage
        isOpen={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        title="Clear all scans"
        subtitle="This will remove all scanned items. This action cannot be undone."
        message="Are you sure you want to clear all scan results?"
        variant="destructive"
        showSwipe
        buttons={[
          {
            label: "Cancel",
            variant: "outline",
            action: () => setClearConfirmOpen(false),
          },
          {
            label: "Clear all",
            variant: "destructive",
            action: handleConfirmClear,
          },
        ]}
      />
    </div>
  );
};

BarcodeScannerResultJSON.displayName = "BarcodeScannerResultJSON";
