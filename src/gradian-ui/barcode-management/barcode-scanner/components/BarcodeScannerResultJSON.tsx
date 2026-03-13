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
import { TRANSLATION_KEYS } from "@/gradian-ui/shared/constants/translations";
import { getDefaultLanguage, getT } from "@/gradian-ui/shared/utils/translation-utils";
import { useLanguageStore } from "@/stores/language.store";
import { isValidUrl, safeLinkHref } from "../utils/sanitize";
import { getFormatBadgeClass } from "../utils/format-badge";
import { GS1Badge } from "@/gradian-ui/barcode-management/gs1-management";
import type { BarcodeScannerResultJSONProps, ScannedBarcode } from "../types";

/** Default receipt layout: header, column headers, footer. Translated in component. */

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
  /** Translated labels (from parent) */
  openInNewTabLabel?: string;
  copiedLabel?: string;
  copyValueAria?: string;
  deleteScanTitle?: string;
  unknownFormatLabel?: string;
  /** When true, plays a short beep when the quantity changes. */
  enableBeepForCountChange?: boolean;
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
  openInNewTabLabel = "Open in new tab",
  copiedLabel = "Copied!",
  copyValueAria = "Copy value",
  deleteScanTitle = "Delete scan",
  unknownFormatLabel = "Unknown",
  enableBeepForCountChange = false,
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
      <div className="flex items-center gap-1 px-3 py-2 min-w-0">
        {/* Index bubble */}
        <span className={cn(
          "shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
          isNew
            ? "bg-violet-500 text-white"
            : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300"
        )}>
          {displayIndex}
        </span>

        {/* Format badge + time — can shrink/truncate so number input stays in card */}
        <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
          <span className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold font-sans tracking-wide min-w-0 max-w-24 truncate",
            getFormatBadgeClass(barcode.format)
          )}>
            {barcode.format ?? unknownFormatLabel}
          </span>
          {barcode.createdAt && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums shrink-0">
              {dateFormat(new Date(barcode.createdAt), "HH:mm:ss")}
            </span>
          )}
        </div>

        {/* Actions + count editor — kept in card with shrink-0 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 relative"
              onClick={handleCopy}
              aria-label={copyValueAria}
            >
              <Copy className="w-3.5 h-3.5" />
              {copied && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-medium text-emerald-500 whitespace-nowrap pointer-events-none">
                  {copiedLabel}
                </span>
              )}
            </Button>
            <ButtonMinimal
              icon={Trash2}
              title={deleteScanTitle}
              color="red"
              size="lg"
              onClick={onRemove}
            />
          </div>
          {enableChangeCount && (
            <NumberInputAnimated
              value={barcode.count ?? 1}
              min={1}
              max={200}
              onChange={(next) => onChangeCount?.(next)}
              enableBeep={enableBeepForCountChange}
            />
          )}
        </div>
      </div>

      {/* Value row */}
      <div className="px-3 pb-2.5 -mt-0.5">
        <div className="flex items-center gap-1.5">
          <p
            className="text-sm font-sans text-gray-900 dark:text-gray-100 break-all leading-snug flex-1 text-left"
            dir="auto"
          >
            {highlightMatch(displayValue, query)}
          </p>
          {(barcode.format === "DataMatrix" || barcode.format === "Handheld" || barcode.format === "RFID") && (
            <GS1Badge barcodeLabel={barcode.label ?? ""} />
          )}
        </div>
        {isUrl && href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline underline-offset-2"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            {openInNewTabLabel}
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
  enableBeepForCountChange = false,
}) => {
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const scanResultsLabel = getT(TRANSLATION_KEYS.BARCODE_SCANNER_SCAN_RESULTS, language, defaultLang);
  const mockLabel = getT(TRANSLATION_KEYS.BARCODE_SCANNER_MOCK, language, defaultLang);
  const printLabelLabel = getT(TRANSLATION_KEYS.BARCODE_SCANNER_PRINT_LABEL, language, defaultLang);
  const clearAllTitle = getT(TRANSLATION_KEYS.BARCODE_SCANNER_CLEAR_ALL_SCANS, language, defaultLang);
  const searchPlaceholder = getT(TRANSLATION_KEYS.BARCODE_SCANNER_SEARCH_PLACEHOLDER, language, defaultLang);
  const noBarcodesYet = getT(TRANSLATION_KEYS.BARCODE_SCANNER_NO_BARCODES_YET, language, defaultLang);
  const noResultsFor = (q: string) => getT(TRANSLATION_KEYS.BARCODE_SCANNER_NO_RESULTS_FOR, language, defaultLang).replace(/\{\{q\}\}/g, q);
  const deleteScanTitle = getT(TRANSLATION_KEYS.BARCODE_SCANNER_DELETE_SCAN, language, defaultLang);
  const deleteScanMsg = getT(TRANSLATION_KEYS.BARCODE_SCANNER_DELETE_SCAN_MSG, language, defaultLang);
  const deleteScanMsgLabel = (label: string) => getT(TRANSLATION_KEYS.BARCODE_SCANNER_DELETE_SCAN_MSG_LABEL, language, defaultLang).replace(/\{\{label\}\}/g, label);
  const confirmActionCannotUndone = getT(TRANSLATION_KEYS.BARCODE_SCANNER_CONFIRM_ACTION_CANNOT_UNDONE, language, defaultLang);
  const clearAllMsg = getT(TRANSLATION_KEYS.BARCODE_SCANNER_CLEAR_ALL_MSG, language, defaultLang);
  const clearAllConfirmMsg = getT(TRANSLATION_KEYS.BARCODE_SCANNER_CLEAR_ALL_CONFIRM, language, defaultLang);
  const cancelLabel = getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang);
  const deleteLabel = getT(TRANSLATION_KEYS.BUTTON_DELETE, language, defaultLang);
  const clearAllButtonLabel = getT(TRANSLATION_KEYS.BARCODE_SCANNER_CLEAR_ALL_SCANS, language, defaultLang);
  const confirmLabel = getT(TRANSLATION_KEYS.BARCODE_SCANNER_CONFIRM, language, defaultLang);
  const confirmNLabel = (n: number) => getT(TRANSLATION_KEYS.BARCODE_SCANNER_CONFIRM_N, language, defaultLang).replace(/\{\{n\}\}/g, String(n));
  const openInNewTabLabel = getT(TRANSLATION_KEYS.BARCODE_SCANNER_OPEN_IN_NEW_TAB, language, defaultLang);
  const copiedLabel = getT(TRANSLATION_KEYS.BARCODE_SCANNER_COPIED, language, defaultLang);
  const copyValueAria = getT(TRANSLATION_KEYS.BARCODE_SCANNER_ACTION_COPY_VALUE, language, defaultLang);
  const unknownFormatLabel = getT(TRANSLATION_KEYS.BARCODE_SCANNER_UNKNOWN, language, defaultLang);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const [confirmLabelToDelete, setConfirmLabelToDelete] = React.useState<string>("");
  const [clearConfirmOpen, setClearConfirmOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollTopRef = useRef<HTMLDivElement | null>(null);

  const handleRequestRemove = (barcode: ScannedBarcode) => {
    setConfirmId(barcode.id);
    setConfirmLabelToDelete(barcode.label ?? "");
  };

  const handleConfirmDelete = () => {
    if (confirmId) onRemove(confirmId);
    setConfirmId(null);
    setConfirmLabelToDelete("");
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

  /* eslint-disable react-hooks/preserve-manual-memoization -- receiptOptions/defaultLang are stable in practice; compiler cannot prove it */
  const receiptDoc = useMemo(
    () =>
      buildDocFromBarcodes(
        barcodes.map((b) => ({ label: b.label ?? "", count: b.count })),
        {
          headerTitle: getT(TRANSLATION_KEYS.BARCODE_SCANNER_LABEL_PRINT, language, defaultLang),
          headerSubtitle: getT(TRANSLATION_KEYS.BARCODE_SCANNER_RECEIPT_HEADER, language, defaultLang),
          headerDescription: getT(TRANSLATION_KEYS.BARCODE_SCANNER_RECEIPT_ITEMS_LISTED, language, defaultLang),
          listColumnHeaders: [
            getT(TRANSLATION_KEYS.BARCODE_SCANNER_ITEMS, language, defaultLang),
            "Qty",
          ],
          ...receiptOptions,
        }
      ),
    [barcodes, receiptOptions, language, defaultLang]
  );
  /* eslint-enable react-hooks/preserve-manual-memoization */

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
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{scanResultsLabel}</span>
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
                {mockLabel}
              </Button>
            )}
            <PrintoutReceipt
              doc={receiptDoc}
              showTrigger
              triggerLabel={printLabelLabel}
              triggerVariant="ghost"
              className="h-9 text-xs gap-1 text-violet-600 hover:text-violet-700 dark:text-violet-400"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs gap-1 text-red-400 hover:text-red-600"
              onClick={() => setClearConfirmOpen(true)}
              disabled={barcodes.length === 0}
              title={clearAllTitle}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search bar — only shown when there are items */}
        {barcodes.length > 0 && (
          <div className="px-2 pb-2">
            <SearchInput
              config={{ name: "barcode-search", placeholder: searchPlaceholder }}
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
            <p className="text-sm">{noBarcodesYet}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500 gap-2">
            <Search className="w-7 h-7 opacity-40" />
            <p className="text-sm">{noResultsFor(searchQuery.trim())}</p>
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
              openInNewTabLabel={openInNewTabLabel}
              copiedLabel={copiedLabel}
              copyValueAria={copyValueAria}
              deleteScanTitle={deleteScanTitle}
              unknownFormatLabel={unknownFormatLabel}
              enableBeepForCountChange={enableBeepForCountChange}
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
            {barcodes.length > 0 ? confirmNLabel(barcodes.length) : confirmLabel}
          </Button>
        </div>
      )}

      <ConfirmationMessage
        isOpen={confirmId != null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmId(null);
            setConfirmLabelToDelete("");
          }
        }}
        title={deleteScanTitle}
        subtitle={confirmActionCannotUndone}
        message={
          confirmLabelToDelete
            ? deleteScanMsgLabel(confirmLabelToDelete)
            : deleteScanMsg
        }
        variant="destructive"
        showSwipe
        buttons={[
          {
            label: cancelLabel,
            variant: "outline",
            action: () => {
              setConfirmId(null);
              setConfirmLabelToDelete("");
            },
          },
          {
            label: deleteLabel,
            variant: "destructive",
            action: handleConfirmDelete,
          },
        ]}
      />
      <ConfirmationMessage
        isOpen={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        title={clearAllTitle}
        subtitle={clearAllMsg}
        message={clearAllConfirmMsg}
        variant="destructive"
        showSwipe
        buttons={[
          {
            label: cancelLabel,
            variant: "outline",
            action: () => setClearConfirmOpen(false),
          },
          {
            label: clearAllButtonLabel,
            variant: "destructive",
            action: handleConfirmClear,
          },
        ]}
      />
    </div>
  );
};

BarcodeScannerResultJSON.displayName = "BarcodeScannerResultJSON";

