"use client";

import React from "react";
import { cn } from "@/gradian-ui/shared/utils";

export interface TicketCardContentItem {
  label: React.ReactNode;
  value: React.ReactNode;
}

export interface TicketCardContentProps {
  /** Array of label/value pairs to display. */
  items: TicketCardContentItem[];
  /** Number of columns in the grid (1, 2, 3, etc.). Default 2. */
  colspan?: number;
  /**
   * Optional mobile column span override.
   * - When null/undefined: mobile uses `colspan`.
   * - When set (e.g. 1): mobile uses that value, and `colspan` applies from `md:` breakpoint upwards.
   */
  mobileColspan?: number | null;
  /** Optional class for the container. */
  className?: string;
}

const DashedLine = () => (
  <div
    className="w-full border-t-2 border-dashed border-gray-300 dark:border-gray-500"
    aria-hidden="true"
  />
);

const COLSPAN_CLASS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
};

const MD_COLSPAN_CLASS: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
};

export function TicketCardContent({
  items,
  colspan = 2,
  mobileColspan = null,
  className,
}: TicketCardContentProps) {
  if (!items.length) return null;

  const baseCols = COLSPAN_CLASS[colspan] ?? COLSPAN_CLASS[2];
  const mobileCols =
    mobileColspan != null
      ? COLSPAN_CLASS[mobileColspan] ?? COLSPAN_CLASS[1]
      : baseCols;
  const mdCols =
    mobileColspan != null ? MD_COLSPAN_CLASS[colspan] ?? MD_COLSPAN_CLASS[2] : "";

  return (
    <div className={cn("px-8 pb-4 space-y-4", className)}>
      <DashedLine />
      <div className={cn("grid gap-4 text-left", mobileCols, mdCols)}>
        {items.map((item, index) => (
          <div key={index}>
            <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wider">
              {item.label}
            </p>
            <div className="font-medium text-foreground mt-0.5 break-all">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
