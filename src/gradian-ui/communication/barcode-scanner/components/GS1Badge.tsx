"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { format as dateFormat } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/gradian-ui/shared/utils";
import { useLanguageStore } from "@/stores/language.store";
import { getDefaultLanguage } from "@/gradian-ui/shared/utils/translation-utils";
import {
  GS1_DATE_AI_EXPIRY,
  formatGS1DateFriendly,
} from "@/gradian-ui/shared/utils/date-utils";
import { isGS1Valid, parseGS1, type GS1ParsedElement } from "../utils/gs1-utils";
import { getGS1AIMeta } from "../utils/gs1-ai-dictionary";
import { formatGS1Unit } from "../utils/gs1-unit-formatter";
import {
  TicketCardWrapper,
  TicketCardHeader,
  TicketCardContent,
  TicketCardBadge,
  TicketCardFooter,
  type TicketCardContentItem,
} from "@/gradian-ui/data-display/ticket-card";

export interface GS1BadgeProps {
  /** Raw barcode content (e.g. from scan). Used for validation and parsing. */
  barcodeLabel: string;
  /** Optional class name for the badge container. */
  className?: string;
}

function formatElementData(element: GS1ParsedElement): string {
  const data = element.data;
  if (data instanceof Date) {
    return dateFormat(data, "yyyy-MM-dd");
  }
  if (typeof data === "number") {
    return String(data);
  }
  return String(data ?? "");
}

export function GS1Badge({ barcodeLabel, className }: GS1BadgeProps) {
  const [open, setOpen] = useState(false);
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const locale = language === "fa" ? "fa" : "en";

  const isValid = useMemo(() => isGS1Valid(barcodeLabel ?? ""), [barcodeLabel]);
  const parsed = useMemo(() => {
    if (!isValid || !barcodeLabel) return null;
    try {
      return parseGS1(barcodeLabel);
    } catch {
      return null;
    }
  }, [barcodeLabel, isValid]);

  const contentItems: TicketCardContentItem[] = useMemo(() => {
    if (!parsed?.parsedCodeItems.length) return [];
    return parsed.parsedCodeItems.map((element) => {
      const meta = getGS1AIMeta(element.ai);
      const title =
        meta?.label[locale] ?? meta?.label.en ?? element.dataTitle ?? `AI ${element.ai}`;
      const unit =
        meta?.unitLabel?.[locale] ??
        meta?.unitLabel?.en ??
        formatGS1Unit(element.unit, element.ai);
      const isExpiryDate =
        element.data instanceof Date &&
        GS1_DATE_AI_EXPIRY.includes(element.ai);
      const expiryFriendly = isExpiryDate
        ? formatGS1DateFriendly(element.data as Date, language)
        : null;
      const contents = formatElementData(element);
      const urgencyClass =
        expiryFriendly?.urgency === "expired"
          ? "text-red-600 dark:text-red-400 font-semibold"
          : expiryFriendly?.urgency === "soon"
            ? "text-amber-600 dark:text-amber-400 font-medium"
            : expiryFriendly?.urgency === "ok"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground";
      const valueDisplay = expiryFriendly ? (
        <span className="block">
          {expiryFriendly.dateText}
          <span className={cn("block text-xs mt-0.5", urgencyClass)}>
            {expiryFriendly.relativeText}
          </span>
        </span>
      ) : (
        contents
      );
      const showUnit = unit && unit !== "—";
      const valueWithUnit = showUnit ? (
        <span>
          {valueDisplay}
          <span className="text-muted-foreground text-xs ml-1">({unit})</span>
        </span>
      ) : (
        valueDisplay
      );
      return { label: title, value: valueWithUnit };
    });
  }, [parsed, locale, language]);

  if (!isValid) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold font-mono tracking-wide",
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
          "hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition-colors cursor-pointer",
          "min-w-0 shrink-0",
          className
        )}
        aria-label="Show GS1 details"
      >
        <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden />
        <span>GS1</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="w-full h-full lg:max-w-2xl lg:max-h-[85vh] overflow-x-visible overflow-y-auto flex flex-col p-2 gap-0 bg-white dark:bg-gray-800"
          aria-describedby="gs1-dialog-description"
        >
          <DialogTitle className="sr-only">GS1 Application Identifiers</DialogTitle>
          <div
            id="gs1-dialog-description"
            className="overflow-x-visible overflow-y-auto p-4 px-6 flex justify-center items-start"
          >
            {parsed && contentItems.length > 0 ? (
              <TicketCardWrapper
                showCutouts={true}
                orientation="landscape"
                className="w-full"
                cutoutClassName="bg-white dark:bg-gray-800"
              >
                <TicketCardHeader
                  icon={
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                  }
                  iconColor="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                  title="Application Identifiers"
                />
                <div className="flex justify-center pb-2">
                  <TicketCardBadge>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    GS1
                  </TicketCardBadge>
                </div>
                <TicketCardContent items={contentItems} />
                <TicketCardFooter
                  barcodeValue={barcodeLabel}
                  barcodeType="datamatrix"
                />
              </TicketCardWrapper>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                No parsed GS1 data available.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
