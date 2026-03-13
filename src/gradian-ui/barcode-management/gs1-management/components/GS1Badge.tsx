 "use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { format as dateFormat } from "date-fns";
import { cn } from "@/gradian-ui/shared/utils";
import { useLanguageStore } from "@/stores/language.store";
import { getDefaultLanguage } from "@/gradian-ui/shared/utils/translation-utils";
import {
  GS1_DATE_AI_EXPIRY,
  formatGS1DateFriendly,
} from "@/gradian-ui/shared/utils/date-utils";
import { isGS1Valid, parseGS1, type GS1ParsedElement, getGs1BarcodeConfigMap } from "../utils/gs1-utils";
import { getGS1AIMeta } from "../utils/gs1-ai-dictionary";
import { formatGS1Unit } from "../utils/gs1-unit-formatter";
import { useBackButtonClose } from "@/gradian-ui/shared/utils/layout-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  TicketCardWrapper,
  TicketCardHeader,
  TicketCardContent,
  TicketCardBadge,
  TicketCardFooter,
  type TicketCardContentItem,
} from "@/gradian-ui/data-display/ticket-card";
import { GS1LookupContent } from "@/gradian-ui/barcode-management/gs1-management/components/GS1LookupContent";

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

export interface GS1BadgeProps {
  /** Raw barcode content (e.g. from scan). Used for validation and parsing. */
  barcodeLabel: string;
  /** Optional class name for the badge container. */
  className?: string;
  /** Called when the GS1 details dialog opens or closes. Use to e.g. pause camera while open. */
  onOpenChange?: (open: boolean) => void;
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

export function GS1Badge({ barcodeLabel, className, onOpenChange }: GS1BadgeProps) {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  useBackButtonClose(open, handleOpenChange, { markerKey: "gs1Badge" });

  const [barcodeConfigMap, setBarcodeConfigMap] = useState<Map<string, { lookupId: string }> | null>(null);
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const locale = language === "fa" ? "fa" : "en";

  useEffect(() => {
    let isMounted = true;

    const loadConfig = async () => {
      try {
        const map = await getGs1BarcodeConfigMap();
        if (isMounted) {
          setBarcodeConfigMap(map);
        }
      } catch {
        if (isMounted) {
          setBarcodeConfigMap(new Map());
        }
      }
    };

    void loadConfig();

    return () => {
      isMounted = false;
    };
  }, []);

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
      const titleText =
        meta?.label[locale] ?? meta?.label.en ?? element.dataTitle ?? `AI ${element.ai}`;
      const labelNode = (
        <span className="inline-flex items-baseline">
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-mono",
              getAiColorClasses(element.ai)
            )}
          >
            ({element.ai})
          </span>
          <span className="ml-1">{titleText}</span>
        </span>
      );
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
          ? "text-red-600 dark:text-red-500 font-semibold"
          : expiryFriendly?.urgency === "soon"
            ? "text-amber-600 dark:text-amber-400 font-medium"
            : expiryFriendly?.urgency === "ok"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground";
      const valueDisplay = expiryFriendly ? (
        <span className="block">
          {expiryFriendly.dateText}
          <span
            className={cn(
              "block text-xs mt-0.5 min-w-0 overflow-hidden text-ellipsis",
              urgencyClass
            )}
            style={{ whiteSpace: "nowrap" }}
            title={expiryFriendly.relativeText}
          >
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

      const lookupConfig = barcodeConfigMap?.get(element.ai);

      let finalValue: React.ReactNode = valueWithUnit;

      if (lookupConfig) {
        const lookupValueSource =
          typeof element.rawValue === "string" || typeof element.rawValue === "number"
            ? element.rawValue
            : typeof element.data === "string" || typeof element.data === "number"
              ? element.data
              : contents;

        const lookupValue =
          typeof lookupValueSource === "string" || typeof lookupValueSource === "number"
            ? lookupValueSource
            : String(lookupValueSource ?? "");

        finalValue = (
          <span className="inline-flex flex-col">
            {valueWithUnit}
            <GS1LookupContent
              ai={element.ai}
              value={lookupValue}
              lookupId={lookupConfig.lookupId}
            />
          </span>
        );
      }

      return { label: labelNode, value: finalValue };
    });
  }, [parsed, locale, language, barcodeConfigMap]);

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
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="w-full h-full lg:h-fit rounded-none lg:rounded-2xl lg:max-w-2xl lg:max-h-[85vh] overflow-x-visible overflow-y-auto flex flex-col p-2 gap-0 bg-white dark:bg-gray-800"
          aria-describedby="gs1-dialog-description"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>GS1 Application Identifiers</DialogTitle>
          </DialogHeader>
          <div
            id="gs1-dialog-description"
            className="overflow-x-visible overflow-y-auto p-4 px-6 mt-8 flex justify-center items-start"
          >
            <TicketCardWrapper
              showCutouts={true}
              orientation="landscape"
              className="w-full"
              cutoutClassName="bg-white dark:bg-gray-800"
            >
              <TicketCardHeader
                icon={
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-300" />
                }
                iconColor="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300"
                title="Application Identifiers"
              />
              <div className="flex justify-center pb-2">
                <TicketCardBadge>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  GS1
                </TicketCardBadge>
              </div>
              <TicketCardContent items={contentItems} mobileColspan={1} />
              <TicketCardFooter
                barcodeValue={barcodeLabel}
                barcodeType="datamatrix"
              />
            </TicketCardWrapper>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
